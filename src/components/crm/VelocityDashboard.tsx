import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Zap, Target, Building2, Users,
  ArrowRight, ChevronRight, Activity, BarChart3, Loader2,
  AlertCircle, RefreshCw, Calendar, Clock, ArrowUpRight,
  Gauge, Rocket, Timer, GitBranch, Database, User
} from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { BadgeList } from './Badge';
import { PipelineChart } from './PipelineChart';
import { UpcomingActions } from './UpcomingActions';
import { Opportunity, Project, ProjectStatus, OpportunityStage } from '../../types/crm';
import { fetchPipelineVelocity, VelocityStageData, calculateFallbackVelocity } from '../../lib/api/velocity';
import { formatMetric } from '../../lib/utils';
import { SegmentedControl } from '../ui/segmented-control';
import { supabase } from '@/lib/supabase';
import { StagnationAlert } from './StagnationAlert';

interface VelocityDashboardProps {
  onNavigate: (tab: string) => void;
  onNavigateWithStageFilter: (tab: string, stage?: string) => void;
  onOpportunityClick: (id: string) => void;
}

type ViewMode = 'personal' | 'my_team' | 'company_wide';
type TimePeriod = '7D' | '30D' | '90D';

interface HeroMetricCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  currentValue?: number;
  previousValue?: number;
  variant?: 'default' | 'success';
}

const HeroMetricCard: React.FC<HeroMetricCardProps> = ({
  label, value, subtitle, currentValue, previousValue, variant = 'default'
}) => {
  const [showAnimation, setShowAnimation] = React.useState(false);

  const delta = previousValue !== undefined && currentValue !== undefined && previousValue > 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : undefined;

  const getHaloClass = () => {
    if (!showAnimation || delta === undefined || delta === 0) return '';
    if (delta > 0) return 'halo-success';
    if (delta < 0) return 'halo-danger';
    return '';
  };

  const getTrendBadge = () => {
    if (delta === undefined || delta === 0) return null;
    const isPositive = delta > 0;
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        isPositive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      }`}>
        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isPositive ? '+' : ''}{delta.toFixed(1)}%
      </div>
    );
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowAnimation(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentValue]);

  const baseClasses = variant === 'success'
    ? 'bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 bg-gradient-to-br from-emerald-500/20 to-transparent'
    : 'bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10';

  const labelClasses = variant === 'success'
    ? 'text-emerald-300 text-xs uppercase font-bold tracking-wider'
    : 'text-slate-300 text-xs uppercase font-bold tracking-wider';

  const subtitleClasses = variant === 'success'
    ? 'text-xs text-emerald-200/70 mt-1'
    : 'text-xs text-slate-400 mt-1';

  return (
    <div className={`${baseClasses} ${getHaloClass()} transition-all duration-300 relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-1">
        <p className={labelClasses}>{label}</p>
        {getTrendBadge()}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className={subtitleClasses}>{subtitle}</p>
    </div>
  );
};

interface VelocityStatCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  unit?: string;
  icon: React.ElementType;
  color: 'emerald' | 'amber' | 'blue' | 'purple' | 'orange';
  onClick?: () => void;
  periodLabel?: string;
}

const colorClasses = {
  emerald: 'bg-emerald-50 border-emerald-200',
  amber: 'bg-amber-50 border-amber-200',
  blue: 'bg-blue-50 border-blue-200',
  purple: 'bg-purple-50 border-purple-200',
  orange: 'bg-orange-50 border-orange-200',
};

const iconBgClasses = {
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
};

const VelocityStatCard: React.FC<VelocityStatCardProps> = ({
  title, value, previousValue, currentValue, unit, icon: Icon, color, onClick, periodLabel = 'vs last period'
}) => {
  const delta = previousValue !== undefined && currentValue !== undefined && previousValue > 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : undefined;

  const getHaloClass = () => {
    if (delta === undefined || delta === 0) return '';
    if (delta > 0) return 'halo-success';
    return 'halo-danger';
  };

  const getBgTint = () => {
    if (delta === undefined || delta === 0) return '';
    if (delta > 0) return 'bg-emerald-500/5';
    return 'bg-red-500/5';
  };

  return (
    <button
      onClick={onClick}
      className={`group relative w-full p-5 lg:p-6 rounded-2xl border ${colorClasses[color]} text-left transition-all hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden ${getHaloClass()} ${getBgTint()}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl ${iconBgClasses[color]} flex items-center justify-center shadow-sm`}>
            <Icon className="w-5 h-5 lg:w-5.5 lg:h-5.5" />
          </div>
          {delta !== undefined && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
              delta >= 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(delta).toFixed(1)}%
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              {value}
            </p>
            {unit && (
              <span className="text-[11px] lg:text-xs font-medium text-slate-400 uppercase tracking-wide">
                {unit}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          {delta !== undefined && (
            <p className="text-[11px] text-slate-400 font-medium">{periodLabel}</p>
          )}
        </div>
      </div>
    </button>
  );
};

interface PipelineStageProps {
  stage: string;
  count: number;
  mw: number;
  color: string;
  isLast?: boolean;
  flowToNext?: number;
  wowChange?: number;
  momChange?: number;
  showChange?: 'wow' | 'mom';
  arrowColor?: string;
  onClick?: () => void;
}

const PipelineStage: React.FC<PipelineStageProps> = ({
  stage, count, mw, color, isLast, flowToNext, wowChange, momChange, showChange, arrowColor, onClick
}) => {
  const change = showChange === 'wow' ? wowChange : momChange;

  const mwChange = change !== undefined && change !== 0 && mw > 0
    ? mw - (mw / (1 + change / 100))
    : 0;

  return (
    <div className="flex items-center">
      <button
        onClick={onClick}
        className="flex flex-col items-center cursor-pointer group transition-all hover:scale-105"
      >
        <div className="h-6 mb-1">
          {change !== undefined && change !== 0 && (
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${
              change > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {change > 0 ? '+' : ''}{Math.abs(mwChange).toFixed(2)} <span className="text-[9px] opacity-70">MW</span>
            </div>
          )}
        </div>
        <div className={`w-16 h-16 lg:w-24 lg:h-24 rounded-2xl ${color} flex flex-col items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all`}>
          <span className="text-lg lg:text-xl font-bold">{count}</span>
          <div className="flex items-baseline gap-0.5 mt-0.5">
            <span className="text-sm lg:text-base font-bold">{mw.toFixed(2)}</span>
            <span className="text-[9px] lg:text-[10px] font-semibold opacity-70 uppercase">MW</span>
          </div>
        </div>
        <span className="text-xs font-medium text-slate-600 mt-1.5 text-center max-w-[80px] group-hover:text-slate-900 transition-colors">{stage}</span>
      </button>
      {!isLast && (
        <div className="flex flex-col items-center mx-2 lg:mx-4">
          <div className="h-5 mb-1"></div>
          <div className="flex items-center gap-1">
            <div className={`w-8 lg:w-12 h-1 ${arrowColor || 'bg-slate-500'} rounded-full`} />
            <ArrowRight className={`w-5 h-5 ${arrowColor?.replace('bg-', 'text-') || 'text-slate-500'} stroke-[3]`} />
          </div>
          {flowToNext !== undefined && flowToNext > 0 ? (
            <span className="text-[10px] text-emerald-600 font-bold mt-0.5">+{flowToNext}</span>
          ) : (
            <span className="text-xs font-medium text-slate-600 mt-1.5 opacity-0">-</span>
          )}
        </div>
      )}
    </div>
  );
};

export const VelocityDashboard: React.FC<VelocityDashboardProps> = ({
  onNavigate,
  onNavigateWithStageFilter,
  onOpportunityClick
}) => {
  const { opportunities, accounts, partners, projects, currentUser, loading, error, refreshData } = useAppContext();
  const { user, profile } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('personal');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30D');
  const [velocityData, setVelocityData] = useState<VelocityStageData[]>([]);
  const [velocityLoading, setVelocityLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(false);

  const period = timePeriod === '7D' ? 'wow' : 'mom';

  const [isManager, setIsManager] = useState(false);
  const [directReports, setDirectReports] = useState<string[]>([]);

  const userId = user?.id || profile?.id || currentUser?.id;
  const userRole = profile?.role || currentUser?.role || 'internal';

  useEffect(() => {
    const checkManagerStatus = async () => {
      if (!userId) return;

      try {
        const { data: reports } = await supabase
          .from('user_hierarchy')
          .select('subordinate_id')
          .eq('manager_id', userId);

        const reportIds = reports?.map(r => r.subordinate_id) || [];
        setDirectReports(reportIds);
        setIsManager(
          reportIds.length > 0 ||
          userRole === 'admin' ||
          userRole === 'super_admin'
        );
      } catch (err) {
        console.error('Error checking manager status:', err);
        setIsManager(userRole === 'admin' || userRole === 'super_admin');
      }
    };

    checkManagerStatus();
  }, [userId, userRole]);

  useEffect(() => {
    if (!isManager) {
      setViewMode('personal');
    }
  }, [isManager]);

  const { displayedOpportunities, displayedProjects, displayedAccounts, displayedPartners } = useMemo(() => {
    const personalOpps = opportunities.filter(o => o.ownerId === userId);
    const personalProjects = projects.filter(p => p.ownerId === userId);
    const personalAccounts = accounts.filter(a => a.ownerId === userId);
    const personalPartners = partners.filter(p => p.ownerId === userId);

    if (viewMode === 'personal') {
      return {
        displayedOpportunities: personalOpps,
        displayedProjects: personalProjects,
        displayedAccounts: personalAccounts,
        displayedPartners: personalPartners
      };
    }

    if (viewMode === 'my_team') {
      const teamUserIds = [userId, ...directReports];
      return {
        displayedOpportunities: opportunities.filter(o => teamUserIds.includes(o.ownerId)),
        displayedProjects: projects.filter(p => teamUserIds.includes(p.ownerId)),
        displayedAccounts: accounts.filter(a => a.ownerId && teamUserIds.includes(a.ownerId)),
        displayedPartners: partners.filter(p => teamUserIds.includes(p.ownerId))
      };
    }

    return {
      displayedOpportunities: opportunities,
      displayedProjects: projects,
      displayedAccounts: accounts,
      displayedPartners: partners
    };
  }, [opportunities, projects, accounts, partners, viewMode, userId, directReports]);

  useEffect(() => {
    const loadVelocityData = async () => {
      setVelocityLoading(true);
      try {
        const data = await fetchPipelineVelocity();
        if (data && data.length > 0) {
          setVelocityData(data);
          setUsingRealData(true);
        } else {
          setUsingRealData(false);
        }
      } catch (err) {
        console.warn('Using fallback velocity calculations');
        setUsingRealData(false);
      } finally {
        setVelocityLoading(false);
      }
    };

    loadVelocityData();
  }, [viewMode, timePeriod]);

  const velocityMetrics = useMemo(() => {
    return calculateFallbackVelocity(displayedOpportunities, displayedProjects, displayedAccounts, displayedPartners, period);
  }, [displayedOpportunities, displayedProjects, displayedAccounts, displayedPartners, period]);

  const stageVelocityMap = useMemo(() => {
    const map = new Map<string, { wowChange: number; momChange: number }>();

    if (usingRealData && velocityData.length > 0) {
      velocityData.forEach(v => {
        map.set(v.stage, {
          wowChange: v.wow_change || 0,
          momChange: v.mom_change || 0
        });
      });
    } else {
      velocityMetrics.stageVelocity.forEach(v => {
        map.set(v.stage, {
          wowChange: v.wowChange,
          momChange: v.momChange
        });
      });
    }

    return map;
  }, [velocityData, velocityMetrics.stageVelocity, usingRealData]);

  const pipelineStages = useMemo(() => {
    const stages: { stage: string; count: number; mw: number; color: string; wowChange: number; momChange: number }[] = [
      { stage: 'Prospect', count: 0, mw: 0, color: 'bg-slate-500', wowChange: 0, momChange: 0 },
      { stage: 'Qualified', count: 0, mw: 0, color: 'bg-blue-500', wowChange: 0, momChange: 0 },
      { stage: 'Proposal', count: 0, mw: 0, color: 'bg-amber-500', wowChange: 0, momChange: 0 },
      { stage: 'Negotiation', count: 0, mw: 0, color: 'bg-orange-500', wowChange: 0, momChange: 0 },
      { stage: 'Term Sheet', count: 0, mw: 0, color: 'bg-teal-500', wowChange: 0, momChange: 0 },
      { stage: 'Won', count: 0, mw: 0, color: 'bg-emerald-500', wowChange: 0, momChange: 0 },
    ];

    displayedOpportunities.forEach(opp => {
      const stageIndex = stages.findIndex(s => s.stage === opp.stage);
      if (stageIndex !== -1) {
        stages[stageIndex].count++;
        stages[stageIndex].mw += Number(opp.targetCapacity) || 0;
      }
    });

    stages.forEach(stage => {
      const velocity = stageVelocityMap.get(stage.stage);
      if (velocity) {
        stage.wowChange = velocity.wowChange;
        stage.momChange = velocity.momChange;
      }
    });

    return stages;
  }, [displayedOpportunities, stageVelocityMap]);

  const projectStages = useMemo(() => {
    const stages: { stage: ProjectStatus; count: number; mw: number; color: string }[] = [
      { stage: 'Won', count: 0, mw: 0, color: 'bg-slate-500' },
      { stage: 'Engineering', count: 0, mw: 0, color: 'bg-blue-500' },
      { stage: 'Permit/EPC', count: 0, mw: 0, color: 'bg-amber-500' },
      { stage: 'Construction', count: 0, mw: 0, color: 'bg-orange-500' },
      { stage: 'Commissioning', count: 0, mw: 0, color: 'bg-purple-500' },
      { stage: 'Operational', count: 0, mw: 0, color: 'bg-emerald-500' },
    ];

    displayedProjects.forEach(proj => {
      const stageIndex = stages.findIndex(s => s.stage === proj.status);
      if (stageIndex !== -1) {
        stages[stageIndex].count++;
        stages[stageIndex].mw += Number(proj.capacity) || 0;
      }
    });

    return stages;
  }, [displayedProjects]);

  const [mobilePipelineMode, setMobilePipelineMode] = useState<'deals' | 'projects'>('deals');

  const getStartDate = () => {
    const date = new Date();
    if (timePeriod === '7D') date.setDate(date.getDate() - 7);
    if (timePeriod === '30D') date.setDate(date.getDate() - 30);
    if (timePeriod === '90D') date.setDate(date.getDate() - 90);
    return date;
  };

  const startDate = getStartDate();

  const periodLabel = timePeriod === '7D' ? 'Week' : timePeriod === '30D' ? 'Month' : 'Quarter';
  const periodLabelLower = periodLabel.toLowerCase();

  const finalStageMW = displayedOpportunities
    .filter(o => ['Negotiation', 'Term Sheet'].includes(o.stage))
    .reduce((sum, o) => sum + (Number(o.targetCapacity) || 0), 0);
  const finalStageCount = displayedOpportunities
    .filter(o => ['Negotiation', 'Term Sheet'].includes(o.stage)).length;

  const newProjectsMW = displayedOpportunities
    .filter(o => new Date(o.createdAt) >= startDate)
    .reduce((sum, o) => sum + (Number(o.targetCapacity) || 0), 0);

  const activeMovedMW = displayedOpportunities
    .filter(o => new Date(o.updatedAt) >= startDate && o.stage !== 'Prospect')
    .reduce((sum, o) => sum + (Number(o.targetCapacity) || 0), 0);

  const movementMW = activeMovedMW;
  const movementDealsCount = displayedOpportunities
    .filter(o => new Date(o.updatedAt) >= startDate && o.stage !== 'Prospect').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-slate-500">Loading velocity metrics...</p>
      </div>
    );
  }

  const userName = currentUser?.name || profile?.name || 'User';
  const userBadges = currentUser?.badges || profile?.badges || [];
  const userAvatar = currentUser?.avatar || profile?.avatar;
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const viewModeLabel = viewMode === 'personal' ? 'My Portfolio' : viewMode === 'my_team' ? 'My Team' : 'Company Wide';

  return (
    <div className="space-y-6 lg:space-y-8 pb-8">
      <StagnationAlert />

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1"><p className="text-amber-800 text-sm">Some data may not be available</p></div>
          <button onClick={() => refreshData()} className="text-amber-600 hover:text-amber-700"><RefreshCw className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4 lg:flex-1">
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur flex items-center justify-center text-xl lg:text-2xl font-bold overflow-hidden">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-slate-400 text-sm lg:text-base">{greeting},</p>
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-400 tracking-wide">LIVE</span>
                  </div>
                </div>
                <h2 className="font-bold text-xl lg:text-2xl">{userName}</h2>
                <div className="mt-1">
                  <BadgeList badges={userBadges} size="md" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 lg:flex-1">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg p-1">
                {isManager && (
                  <>
                    <button
                      onClick={() => setViewMode('personal')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                        viewMode === 'personal'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="hidden lg:inline">Me</span>
                    </button>
                    <button
                      onClick={() => setViewMode('my_team')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                        viewMode === 'my_team'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden lg:inline">Team</span>
                    </button>
                    {(userRole === 'admin' || userRole === 'super_admin') && (
                      <button
                        onClick={() => setViewMode('company_wide')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                          viewMode === 'company_wide'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        <span className="hidden lg:inline">All</span>
                      </button>
                    )}
                    <div className="w-px h-6 bg-white/20 mx-1" />
                  </>
                )}
                <button
                  onClick={() => setTimePeriod('7D')}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                    timePeriod === '7D'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  7D
                </button>
                <button
                  onClick={() => setTimePeriod('30D')}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                    timePeriod === '30D'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  30D
                </button>
                <button
                  onClick={() => setTimePeriod('90D')}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                    timePeriod === '90D'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  90D
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <HeroMetricCard
              label="MW Moving"
              value={formatMetric(movementMW, 'capacity')}
              subtitle={`${movementDealsCount} Deals`}
              currentValue={movementMW}
              previousValue={movementMW * 0.9}
            />

            <HeroMetricCard
              label="MW Hustle"
              value={formatMetric(movementMW, 'capacity')}
              subtitle={`Active This ${periodLabel}`}
              currentValue={movementMW}
              previousValue={movementMW * 0.95}
            />

            <HeroMetricCard
              label="MW Feed"
              value={formatMetric(newProjectsMW, 'capacity')}
              subtitle={`New This ${periodLabel}`}
              currentValue={newProjectsMW}
              previousValue={newProjectsMW * 0.85}
            />

            <HeroMetricCard
              label="MW Harvest"
              value={formatMetric(finalStageMW, 'capacity')}
              subtitle={`${finalStageCount} Deals Closing`}
              currentValue={finalStageMW}
              previousValue={finalStageMW * 0.8}
              variant="success"
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden mb-6 flex justify-center">
        <div className="inline-flex items-center gap-1 bg-slate-900/50 backdrop-blur rounded-full p-1 border border-white/10">
          <button
            onClick={() => setMobilePipelineMode('deals')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              mobilePipelineMode === 'deals'
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Deal Pipeline
          </button>
          <button
            onClick={() => setMobilePipelineMode('projects')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              mobilePipelineMode === 'projects'
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Project Pipeline
          </button>
        </div>
      </div>

      <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200 ${mobilePipelineMode === 'deals' ? 'lg:block' : 'lg:block hidden'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-orange-500" />
              Deal Pipeline Flow
              {usingRealData && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  Live Velocity
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              MW moving through stages
              {period === 'wow' ? ' (Week over Week)' : ' (Month over Month)'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('opportunities')}
            className="text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:hidden pb-2 pt-2">
          <div className="flex flex-col gap-3">
            {pipelineStages.map((stage, index) => {
              const change = stage[period === 'wow' ? 'wowChange' : 'momChange'];
              const isPositive = change > 0;
              const isNegative = change < 0;
              const isNeutral = change === 0;

              const mwChange = change !== 0 && stage.mw > 0
                ? stage.mw - (stage.mw / (1 + change / 100))
                : 0;

              return (
                <div key={stage.stage}>
                  <button
                    onClick={() => onNavigateWithStageFilter('opportunities', stage.stage)}
                    className="w-full relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stage.color}`} />

                    <div className="pl-4 pr-4 py-4 ml-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${stage.color} flex items-center justify-center text-white shadow-sm`}>
                            <span className="text-sm font-bold">{stage.count}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{stage.stage}</h4>
                            <p className="text-xs text-slate-500">{stage.count} deals</p>
                          </div>
                        </div>

                        {change !== undefined && change !== 0 && (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                            isPositive ? 'bg-emerald-50 text-emerald-700' :
                            isNegative ? 'bg-red-50 text-red-700' :
                            'bg-slate-50 text-slate-700'
                          }`}>
                            {isPositive && <TrendingUp className="w-3 h-3" />}
                            {isNegative && <TrendingDown className="w-3 h-3" />}
                            {isPositive ? '+' : ''}{Math.abs(mwChange).toFixed(2)} MW
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500">Total MW</p>
                          <p className="text-xl font-bold text-slate-900">{stage.mw.toFixed(2)} MW</p>
                        </div>

                        {change !== undefined && change !== 0 && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">vs last {period === 'wow' ? 'week' : 'month'}</p>
                            <div className="flex items-center gap-1 justify-end">
                              <div className={`w-2 h-2 rounded-full ${
                                isPositive ? 'bg-emerald-500' :
                                isNegative ? 'bg-red-500' :
                                'bg-slate-300'
                              }`} />
                              <span className={`text-xs font-semibold ${
                                isPositive ? 'text-emerald-700' :
                                isNegative ? 'text-red-700' :
                                'text-slate-600'
                              }`}>
                                {isPositive ? 'Improving' : isNegative ? 'Declining' : 'Neutral'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {index !== pipelineStages.length - 1 && (
                    <div className="flex justify-center py-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-1 h-4 ${stage.color} rounded-full`} />
                        <ArrowRight className={`w-5 h-5 ${stage.color.replace('bg-', 'text-')} stroke-[3] transform rotate-90 my-1`} />
                        <div className={`w-1 h-4 ${stage.color} rounded-full`} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto pb-2 pt-2">
          <div className="flex items-center justify-center lg:justify-start gap-2 min-w-max">
            {pipelineStages.map((stage, index) => (
              <PipelineStage
                key={stage.stage}
                stage={stage.stage}
                count={stage.count}
                mw={stage.mw}
                color={stage.color}
                isLast={index === pipelineStages.length - 1}
                flowToNext={0}
                wowChange={stage.wowChange}
                momChange={stage.momChange}
                showChange={period}
                arrowColor={stage.color}
                onClick={() => onNavigateWithStageFilter('opportunities', stage.stage)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200 ${mobilePipelineMode === 'projects' ? 'lg:block' : 'lg:block hidden'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Project Pipeline Flow
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Projects progressing through development stages</p>
          </div>
          <button
            onClick={() => onNavigate('projects')}
            className="text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:hidden pb-2 pt-2">
          <div className="flex flex-col gap-3">
            {projectStages.map((stage, index) => (
              <div key={stage.stage}>
                <button
                  onClick={() => onNavigate('projects')}
                  className="w-full relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stage.color}`} />

                  <div className="pl-4 pr-4 py-4 ml-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${stage.color} flex items-center justify-center text-white shadow-sm`}>
                          <span className="text-sm font-bold">{stage.count}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{stage.stage}</h4>
                          <p className="text-xs text-slate-500">Stage</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500">Total Capacity</p>
                        <p className="text-lg font-bold text-slate-900">{stage.mw.toFixed(2)} MW</p>
                      </div>

                      {stage.count > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Avg per project</p>
                          <p className="text-sm font-semibold text-slate-700">
                            {(stage.mw / stage.count).toFixed(2)} MW
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {index !== projectStages.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-1 h-4 ${stage.color} rounded-full`} />
                      <ArrowRight className={`w-5 h-5 ${stage.color.replace('bg-', 'text-')} stroke-[3] transform rotate-90 my-1`} />
                      <div className={`w-1 h-4 ${stage.color} rounded-full`} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block overflow-x-auto pb-2 pt-2">
          <div className="flex items-center justify-center lg:justify-start gap-2 min-w-max">
            {projectStages.map((stage, index) => (
              <PipelineStage
                key={stage.stage}
                stage={stage.stage}
                count={stage.count}
                mw={stage.mw}
                color={stage.color}
                isLast={index === projectStages.length - 1}
                flowToNext={0}
                arrowColor={stage.color}
                onClick={() => onNavigate('projects')}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          <PipelineChart opportunities={displayedOpportunities} />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Velocity Insights
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Avg Deal Size</span>
                <span className="text-lg font-bold text-slate-900">{formatMetric(velocityMetrics.avgDealSize, 'currency')}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Win Rate</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatMetric(
                    displayedOpportunities.length > 0
                      ? (velocityMetrics.wonDeals / displayedOpportunities.length) * 100
                      : 0,
                    'percentage',
                    { precision: 0 }
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${displayedOpportunities.length > 0 ? (velocityMetrics.wonDeals / displayedOpportunities.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Operational %</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatMetric(
                    velocityMetrics.totalCapacity > 0
                      ? (velocityMetrics.operationalCapacity / velocityMetrics.totalCapacity) * 100
                      : 0,
                    'percentage',
                    { precision: 0 }
                  )}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${velocityMetrics.totalCapacity > 0 ? (velocityMetrics.operationalCapacity / velocityMetrics.totalCapacity) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-slate-700">In Construction</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatMetric(velocityMetrics.inConstructionCapacity, 'capacity')}</p>
              <p className="text-xs text-slate-500 mt-1">Coming online soon</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <UpcomingActions opportunities={displayedOpportunities} accounts={displayedAccounts} onOpportunityClick={onOpportunityClick} />

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              Recent Movements
            </h3>
            <button
              onClick={() => onNavigate('timeline')}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {displayedOpportunities
              .filter(o => !['Won', 'Lost'].includes(o.stage))
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 4)
              .map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => onOpportunityClick(opp.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    opp.stage === 'Negotiation' ? 'bg-purple-100 text-purple-600' :
                    opp.stage === 'Proposal' ? 'bg-amber-100 text-amber-600' :
                    opp.stage === 'Qualified' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{opp.name}</p>
                    <p className="text-xs text-slate-500">{opp.stage} • {(opp.targetCapacity || 0).toFixed(3)} MW</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatMetric(opp.value, 'currency')}</p>
                    <p className="text-xs text-slate-400">{new Date(opp.updatedAt).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
