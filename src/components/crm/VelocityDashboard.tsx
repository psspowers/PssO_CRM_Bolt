import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Zap, Target, Building2, Users,
  ArrowRight, ChevronRight, Activity, BarChart3, Loader2,
  AlertCircle, RefreshCw, Calendar, Clock, ArrowUpRight,
  Gauge, Rocket, Timer, GitBranch, Database, User, TrendingUpIcon,
  FileText, FlagTriangleRight
} from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { BadgeList } from './Badge';
import { PipelineChart } from './PipelineChart';
import { UpcomingActions } from './UpcomingActions';
import { Opportunity, Project, ProjectStatus, OpportunityStage } from '../../types/crm';
import { fetchPipelineVelocity, VelocityStageData, calculateFallbackVelocity, VelocityTimeRange, DateRange } from '../../lib/api/velocity';
import { formatMetric } from '../../lib/utils';
import { SegmentedControl } from '../ui/segmented-control';
import { TimeRangePicker } from '../ui/time-range-picker';
import { supabase } from '@/lib/supabase';

interface VelocityDashboardProps {
  onNavigate: (tab: string) => void;
  onOpportunityClick: (id: string) => void;
  onSwitchToClassic: () => void;
}

type ViewMode = 'personal' | 'my_team' | 'company_wide';
type TimePeriod = 'week' | 'month' | 'quarter';

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

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 lg:p-5 rounded-xl lg:rounded-2xl border ${colorClasses[color]} text-left transition-all hover:shadow-lg active:scale-[0.98]`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl ${iconBgClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
            delta >= 0
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl lg:text-3xl font-bold text-gray-900">
          {value}{unit && <span className="text-lg ml-1">{unit}</span>}
        </p>
        <p className="text-sm font-medium text-slate-600 mt-1">{title}</p>
        {delta !== undefined && (
          <p className="text-xs text-slate-400 mt-0.5">{periodLabel}</p>
        )}
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
}

const PipelineStage: React.FC<PipelineStageProps> = ({
  stage, count, mw, color, isLast, flowToNext, wowChange, momChange, showChange
}) => {
  const change = showChange === 'wow' ? wowChange : momChange;

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        <div className="h-5 mb-1">
          {change !== undefined && change !== 0 && (
            <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
              change > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}
            </div>
          )}
        </div>
        <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl ${color} flex flex-col items-center justify-center text-white shadow-lg`}>
          <span className="text-xl lg:text-2xl font-bold">{count}</span>
          <span className="text-[10px] opacity-80">{mw.toFixed(1)} MW</span>
        </div>
        <span className="text-xs font-medium text-slate-600 mt-1.5 text-center max-w-[80px]">{stage}</span>
      </div>
      {!isLast && flowToNext !== undefined && (
        <div className="flex flex-col items-center mx-2 lg:mx-4">
          <div className="h-5 mb-1"></div>
          <div className="flex items-center gap-1">
            <div className="w-8 lg:w-12 h-0.5 bg-slate-300" />
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          {flowToNext > 0 ? (
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
  onOpportunityClick,
  onSwitchToClassic
}) => {
  const { opportunities, accounts, partners, projects, currentUser, loading, error, refreshData } = useAppContext();
  const { user, profile } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('personal');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [timeRange, setTimeRange] = useState<VelocityTimeRange>('mom');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [velocityData, setVelocityData] = useState<VelocityStageData[]>([]);
  const [velocityLoading, setVelocityLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(false);

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
          .select('child_user_id')
          .eq('parent_user_id', userId);

        const reportIds = reports?.map(r => r.child_user_id) || [];
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
    const personalOpps = opportunities.filter(o => o.assigned_to === userId);
    const personalProjects = projects.filter(p => p.assigned_to === userId);
    const personalAccounts = accounts.filter(a => a.created_by === userId);
    const personalPartners = partners.filter(p => p.created_by === userId);

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
        displayedOpportunities: opportunities.filter(o => teamUserIds.includes(o.assigned_to)),
        displayedProjects: projects.filter(p => teamUserIds.includes(p.assigned_to)),
        displayedAccounts: accounts.filter(a => teamUserIds.includes(a.created_by)),
        displayedPartners: partners.filter(p => teamUserIds.includes(p.created_by))
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
    return calculateFallbackVelocity(displayedOpportunities, displayedProjects, displayedAccounts, displayedPartners, timeRange, customRange);
  }, [displayedOpportunities, displayedProjects, displayedAccounts, displayedPartners, timeRange, customRange]);

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
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const viewModeLabel = viewMode === 'personal' ? 'My Portfolio' : viewMode === 'my_team' ? 'My Team' : 'Company Wide';

  return (
    <div className="space-y-6 lg:space-y-8 pb-8">
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1"><p className="text-amber-800 text-sm">Some data may not be available</p></div>
          <button onClick={() => refreshData()} className="text-amber-600 hover:text-amber-700"><RefreshCw className="w-4 h-4" /></button>
        </div>
      )}

      {!velocityLoading && (
        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full w-fit ${
          usingRealData
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <Database className="w-3 h-3" />
          {usingRealData
            ? 'Using real-time velocity data'
            : 'Using calculated estimates (run SQL setup for real data)'}
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur flex items-center justify-center text-xl lg:text-2xl font-bold">
                {userInitials}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-slate-400 text-sm lg:text-base">{greeting},</p>
                  <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-[10px] font-bold uppercase rounded-full border border-purple-400/30 flex items-center gap-1">
                    <Rocket className="w-3 h-3" /> Beta
                  </span>
                </div>
                <h2 className="font-bold text-xl lg:text-2xl">{userName}</h2>
                <p className="text-sm text-slate-300 mt-1">{viewModeLabel}</p>
                <div className="mt-1">
                  <BadgeList badges={userBadges} size="md" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <button
                onClick={onSwitchToClassic}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <ArrowUpRight className="w-3 h-3" />
                Switch to Classic Dashboard
              </button>

              {isManager && (
                <SegmentedControl
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: 'personal', label: 'My Portfolio', icon: User },
                    { value: 'my_team', label: 'My Team', icon: Users },
                    ...(userRole === 'admin' || userRole === 'super_admin'
                      ? [{ value: 'company_wide' as ViewMode, label: 'Company', icon: Building2 }]
                      : []
                    )
                  ]}
                  className="bg-white/10 backdrop-blur"
                  size="sm"
                />
              )}

              <TimeRangePicker
                value={timeRange}
                customRange={customRange}
                onChange={(range, custom) => {
                  setTimeRange(range);
                  if (custom) setCustomRange(custom);
                }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-slate-300 text-xs">Pipeline Value</p>
              <p className="text-2xl font-bold">{formatMetric(velocityMetrics.totalPipelineValue, 'currency')}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-slate-300 text-xs">Active Deals</p>
              <p className="text-2xl font-bold">{velocityMetrics.activeDeals}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-300 text-xs">Won This {
                  timeRange === 'wow' ? 'Week' :
                  timeRange === 'mom' ? 'Month' :
                  timeRange === '3m' ? 'Quarter' :
                  'Period'
                }</p>
                {velocityMetrics.wonPreviousPeriod > 0 && (
                  <span className={`text-xs font-bold ${
                    velocityMetrics.wonThisPeriod >= velocityMetrics.wonPreviousPeriod
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}>
                    {velocityMetrics.wonThisPeriod >= velocityMetrics.wonPreviousPeriod ? '+' : ''}
                    {velocityMetrics.wonThisPeriod - velocityMetrics.wonPreviousPeriod}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-emerald-400">{velocityMetrics.wonThisPeriod}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-slate-300 text-xs">Total Capacity</p>
              <p className="text-2xl font-bold">{formatMetric(velocityMetrics.totalCapacity, 'capacity')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <VelocityStatCard
          title="Deal Velocity"
          value={velocityMetrics.stageMovements}
          currentValue={velocityMetrics.stageMovements}
          previousValue={velocityMetrics.previousStageMovements}
          icon={Gauge}
          color="orange"
          periodLabel={
            timeRange === 'wow' ? 'vs last week' :
            timeRange === 'mom' ? 'vs last month' :
            timeRange === '3m' ? 'vs prev 3 months' :
            'vs previous period'
          }
          onClick={() => onNavigate('opportunities')}
        />
        <VelocityStatCard
          title="Total MW Movement"
          value={`${velocityMetrics.totalMwMovement.toFixed(1)} MW`}
          currentValue={velocityMetrics.totalMwMovement}
          previousValue={velocityMetrics.previousMwMovement}
          icon={TrendingUpIcon}
          color="blue"
          periodLabel={
            timeRange === 'wow' ? 'vs last week' :
            timeRange === 'mom' ? 'vs last month' :
            timeRange === '3m' ? 'vs prev 3 months' :
            'vs previous period'
          }
          onClick={() => onNavigate('opportunities')}
        />
        <VelocityStatCard
          title="New Projects in System"
          value={`${velocityMetrics.newProjectsMw.toFixed(1)} MW`}
          currentValue={velocityMetrics.newProjectsMw}
          previousValue={velocityMetrics.previousNewProjectsMw}
          icon={FileText}
          color="purple"
          periodLabel={
            timeRange === 'wow' ? 'vs last week' :
            timeRange === 'mom' ? 'vs last month' :
            timeRange === '3m' ? 'vs prev 3 months' :
            'vs previous period'
          }
          onClick={() => onNavigate('opportunities')}
        />
        <VelocityStatCard
          title="Final Stage Projects"
          value={`${velocityMetrics.finalStageMw.toFixed(1)} MW (${velocityMetrics.finalStageCount})`}
          currentValue={velocityMetrics.finalStageMw}
          previousValue={velocityMetrics.previousFinalStageMw}
          icon={FlagTriangleRight}
          color="emerald"
          periodLabel={
            timeRange === 'wow' ? 'vs last week' :
            timeRange === 'mom' ? 'vs last month' :
            timeRange === '3m' ? 'vs prev 3 months' :
            'vs previous period'
          }
          onClick={() => onNavigate('opportunities')}
        />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
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
              {
                timeRange === 'wow' ? ' (Week over Week)' :
                timeRange === 'mom' ? ' (Month over Month)' :
                timeRange === '3m' ? ' (Last 3 Months)' :
                ' (Custom Period)'
              }
            </p>
          </div>
          <button
            onClick={() => onNavigate('opportunities')}
            className="text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto pb-2 pt-2">
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
                showChange={timeRange === 'wow' || timeRange === '3m' ? 'wow' : 'mom'}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
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

        <div className="overflow-x-auto pb-2 pt-2">
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
                    <p className="text-xs text-slate-500">{opp.stage} • {opp.targetCapacity} MW</p>
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
