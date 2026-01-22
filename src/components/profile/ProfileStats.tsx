import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, IdCard, Briefcase, Calendar, Award, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';

interface StatsProps {
  activitiesCount: number;
  opportunitiesOwned: number;
  projectsOwned: number;
  contactsManaged: number;
  thisMonthActivities: number;
  winRate: number;
}

interface CommissionStats {
  tasks_count: number;
  earned_thb: number;
  won_mw: number;
  quota_mw: number;
  progress_pct: number;
  commission_rate: number;
}

export const ProfileStats: React.FC<StatsProps> = ({
  activitiesCount,
  opportunitiesOwned,
  projectsOwned,
  contactsManaged,
  thisMonthActivities,
  winRate,
}) => {
  const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null);

  useEffect(() => {
    const fetchCommissionStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_my_stats');
        if (error) throw error;
        if (data) {
          setCommissionStats(data);
        }
      } catch (error) {
        console.error('Error fetching commission stats:', error);
      }
    };

    fetchCommissionStats();
  }, []);
  const stats = [
    { label: 'Total Activities', value: activitiesCount, icon: Calendar, color: 'bg-blue-500' },
    { label: 'This Month', value: thisMonthActivities, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Opportunities', value: opportunitiesOwned, icon: Target, color: 'bg-purple-500' },
    { label: 'Projects', value: projectsOwned, icon: Briefcase, color: 'bg-orange-500' },
    { label: 'Contacts', value: contactsManaged, icon: IdCard, color: 'bg-cyan-500' },
    { label: 'Win Rate', value: `${winRate}%`, icon: Award, color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      {commissionStats && (commissionStats.commission_rate > 0 || commissionStats.quota_mw > 0) && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Wealth</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Earned YTD</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ฿{commissionStats.earned_thb.toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Closed Capacity</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {commissionStats.won_mw.toLocaleString()} MW
                </p>
              </div>
            </div>

            {commissionStats.quota_mw > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quota Progress
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {commissionStats.progress_pct.toFixed(1)}%
                  </p>
                </div>
                <Progress value={Math.min(commissionStats.progress_pct, 100)} className="h-3 mb-2" />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{commissionStats.won_mw.toLocaleString()} MW / {commissionStats.quota_mw.toLocaleString()} MW</span>
                  <span>Rate: ฿{commissionStats.commission_rate.toLocaleString()}/MW</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
