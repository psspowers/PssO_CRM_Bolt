import React from 'react';
import { Target, Building2, Users, Zap, Loader2, RefreshCw, AlertCircle, TrendingUp, Calendar, ArrowUpRight, Clock } from 'lucide-react';
import { StatCard, PipelineChart, UpcomingActions } from '../crm';
import { BadgeList } from '../crm/Badge';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  onOpportunityClick: (id: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, onOpportunityClick }) => {
  const { opportunities, accounts, partners, projects, loading, error, refreshData } = useAppContext();
  const { profile, user } = useAuth();

  const totalPipeline = opportunities.filter(o => o.stage !== 'Lost').reduce((sum, o) => sum + (Number(o.value) || 0), 0);
  const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.stage)).length;
  const wonDeals = opportunities.filter(o => o.stage === 'Won').length;

  const totalCapacity = projects.reduce((sum, p) => sum + (Number(p.capacity) || 0), 0);

  const formatValue = (val: number) => val >= 1000000 ? `฿${(val / 1000000).toFixed(1)}M` : `฿${(val / 1000).toFixed(0)}K`;

  // Calculate stage distribution
  const stageDistribution = {
    prospect: opportunities.filter(o => o.stage === 'Prospect').length,
    qualified: opportunities.filter(o => o.stage === 'Qualified').length,
    proposal: opportunities.filter(o => o.stage === 'Proposal').length,
    negotiation: opportunities.filter(o => o.stage === 'Negotiation').length,
  };

  // Recent activities (mock)
  const recentActivities = [
    { id: 1, action: 'Deal updated', target: 'Rayong Chemical Complex', time: '2 hours ago', type: 'update' },
    { id: 2, action: 'New contact added', target: 'Vietnam Steel Corp', time: '4 hours ago', type: 'create' },
    { id: 3, action: 'Meeting scheduled', target: 'Thai Textile Group', time: '1 day ago', type: 'meeting' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-slate-500">Loading your dashboard...</p>
      </div>
    );
  }

  // Get user name from profile first, then from auth user, then fallback
  const userName = profile?.name || user?.email?.split('@')[0] || 'User';
  const userBadges = profile?.badges || [];
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 lg:space-y-8 pb-8">
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1"><p className="text-amber-800 text-sm">Some data may not be available</p></div>
          <button onClick={() => refreshData()} className="text-amber-600 hover:text-amber-700"><RefreshCw className="w-4 h-4" /></button>
        </div>
      )}
      
      {/* Welcome Header - Desktop Enhanced */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur flex items-center justify-center text-xl lg:text-2xl font-bold">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt={userName} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  userInitials
                )}
              </div>
              <div>
                <p className="text-slate-400 text-sm lg:text-base">{greeting},</p>
                <h2 className="font-bold text-xl lg:text-2xl">{userName}</h2>
                <div className="mt-1">
                  <BadgeList badges={userBadges} size="md" />
                </div>
              </div>
            </div>
            
            {/* Quick Stats - Desktop */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-right">
                <p className="text-slate-400 text-sm">Total Pipeline</p>
                <p className="text-3xl font-bold">{formatValue(totalPipeline)}</p>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Active Deals</p>
                <p className="text-3xl font-bold">{activeDeals}</p>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Won This Month</p>
                <p className="text-3xl font-bold text-green-400">{wonDeals}</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:hidden">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-slate-300 text-xs">My Pipeline</p>
              <p className="text-2xl font-bold">{formatValue(totalPipeline)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-slate-300 text-xs">Active Deals</p>
              <p className="text-2xl font-bold">{activeDeals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard title="Opportunities" value={opportunities.length} icon={Target} color="orange" onClick={() => onNavigate('opportunities')} />
        <StatCard title="Accounts" value={accounts.length} icon={Building2} color="blue" onClick={() => onNavigate('accounts')} />
        <StatCard title="Partners" value={partners.length} icon={Users} color="purple" onClick={() => onNavigate('partners')} />
        <StatCard title="Capacity" value={`${totalCapacity.toFixed(0)} MW`} subtitle="Total projects" icon={Zap} color="amber" onClick={() => onNavigate('projects')} />
      </div>



      {/* Main Content Grid - Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Pipeline Chart - Takes 2 columns on desktop */}
        <div className="lg:col-span-2">
          <PipelineChart opportunities={opportunities} />
        </div>
        
        {/* Stage Distribution - Desktop Only */}
        <div className="hidden lg:block bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-6">Stage Distribution</h3>
          <div className="space-y-4">
            {[
              { label: 'Prospect', count: stageDistribution.prospect, color: 'bg-slate-400' },
              { label: 'Qualified', count: stageDistribution.qualified, color: 'bg-blue-500' },
              { label: 'Proposal', count: stageDistribution.proposal, color: 'bg-amber-500' },
              { label: 'Negotiation', count: stageDistribution.negotiation, color: 'bg-purple-500' },
            ].map((stage) => (
              <div key={stage.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{stage.label}</span>
                  <span className="font-semibold text-slate-900">{stage.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stage.color} rounded-full transition-all`}
                    style={{ width: `${opportunities.length > 0 ? (stage.count / opportunities.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section - Two Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Upcoming Actions */}
        <UpcomingActions opportunities={opportunities} accounts={accounts} onOpportunityClick={onOpportunityClick} />
        
        {/* Recent Activity - Desktop Enhanced */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Recent Activity</h3>
            <button 
              onClick={() => onNavigate('timeline')}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  activity.type === 'update' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'create' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {activity.type === 'update' ? <TrendingUp className="w-5 h-5" /> :
                   activity.type === 'create' ? <Building2 className="w-5 h-5" /> :
                   <Calendar className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                  <p className="text-sm text-slate-500 truncate">{activity.target}</p>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
