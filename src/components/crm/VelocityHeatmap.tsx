import React from 'react';
import { Opportunity } from '../../types/crm';
import { Clock, AlertTriangle, Snowflake, Wind } from 'lucide-react';

interface VelocityHeatmapProps {
  opportunities: Opportunity[];
  onFilterChange: (filter: 'all' | '15' | '30' | '60') => void;
  activeFilter: 'all' | '15' | '30' | '60';
}

export const VelocityHeatmap: React.FC<VelocityHeatmapProps> = ({ opportunities, onFilterChange, activeFilter }) => {
  const now = new Date().getTime();
  const dayMs = 1000 * 60 * 60 * 24;

  const buckets = opportunities.reduce(
    (acc, opp) => {
      const days = (now - new Date(opp.updatedAt).getTime()) / dayMs;
      if (days > 60) acc.frozen++;
      else if (days > 30) acc.stalled++;
      else if (days > 15) acc.warning++;
      else acc.active++;
      return acc;
    },
    { active: 0, warning: 0, stalled: 0, frozen: 0 }
  );

  const total = opportunities.length || 1;

  const getWidth = (count: number) => `${(count / total) * 100}%`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Wind className="w-4 h-4 text-slate-400" />
          Pipeline Velocity
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {buckets.active} Healthy / {opportunities.length} Total
        </span>
      </div>

      <div className="h-4 w-full flex rounded-full overflow-hidden mb-4 bg-slate-100 dark:bg-slate-800">
        <div style={{ width: getWidth(buckets.active) }} className="bg-emerald-400 transition-all duration-500" />
        <div style={{ width: getWidth(buckets.warning) }} className="bg-yellow-400 transition-all duration-500" />
        <div style={{ width: getWidth(buckets.stalled) }} className="bg-orange-400 transition-all duration-500" />
        <div style={{ width: getWidth(buckets.frozen) }} className="bg-red-400 transition-all duration-500" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <FilterButton
          label="Active"
          count={buckets.active}
          color="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
          icon={<Wind className="w-3 h-3" />}
          isActive={activeFilter === 'all'}
          onClick={() => onFilterChange('all')}
        />
        <FilterButton
          label=">15 Days"
          count={buckets.warning}
          color="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"
          icon={<Clock className="w-3 h-3" />}
          isActive={activeFilter === '15'}
          onClick={() => onFilterChange('15')}
        />
        <FilterButton
          label=">30 Days"
          count={buckets.stalled}
          color="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
          icon={<AlertTriangle className="w-3 h-3" />}
          isActive={activeFilter === '30'}
          onClick={() => onFilterChange('30')}
        />
        <FilterButton
          label=">60 Days"
          count={buckets.frozen}
          color="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
          icon={<Snowflake className="w-3 h-3" />}
          isActive={activeFilter === '60'}
          onClick={() => onFilterChange('60')}
        />
      </div>
    </div>
  );
};

const FilterButton = ({ label, count, color, icon, isActive, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
      isActive ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-900 opacity-100' : 'opacity-70 hover:opacity-100'
    } ${color}`}
  >
    <div className="flex items-center gap-1 mb-1">
      {icon}
      <span className="text-[10px] font-black uppercase">{label}</span>
    </div>
    <span className="text-xl font-black">{count}</span>
  </button>
);
