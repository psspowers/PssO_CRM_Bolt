import React from 'react';
import { Opportunity } from '../../types/crm';
import { TrendingUp } from 'lucide-react';

interface PipelineChartProps {
  opportunities: Opportunity[];
}

const stages = ['Discovery', 'Pre-Dev', 'Development', 'Contract', 'Won'];
const stageColors: Record<string, string> = {
  Discovery: 'bg-slate-400',
  'Pre-Dev': 'bg-blue-500',
  Development: 'bg-amber-500',
  Contract: 'bg-purple-500',
  Won: 'bg-emerald-500',
};

const stageBgColors: Record<string, string> = {
  Discovery: 'bg-slate-100',
  'Pre-Dev': 'bg-blue-100',
  Development: 'bg-amber-100',
  Contract: 'bg-purple-100',
  Won: 'bg-emerald-100',
};

export const PipelineChart: React.FC<PipelineChartProps> = ({ opportunities }) => {
  const stageValues = stages.map(stage => ({
    stage,
    value: opportunities
      .filter(o => o.stage === stage)
      .reduce((sum, o) => sum + (Number(o.value) || 0), 0),
    count: opportunities.filter(o => o.stage === stage).length,
  }));

  const maxValue = Math.max(...stageValues.map(s => s.value), 1);
  const totalValue = stageValues.reduce((sum, s) => sum + s.value, 0);
  
  const formatValue = (val: number) => {
    if (val === 0) return '$0';
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Pipeline by Stage</h3>
            <p className="text-sm text-slate-500">Deal value distribution</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{formatValue(totalValue)}</p>
          <p className="text-sm text-slate-500">Total pipeline</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {stageValues.map(({ stage, value, count }) => {
          const widthPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, count > 0 ? 5 : 0) : 0;
          return (
            <div key={stage} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stageColors[stage]}`}></div>
                  <span className="text-sm font-medium text-slate-700">{stage}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${stageBgColors[stage]} text-slate-600`}>
                    {count} deal{count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-bold text-slate-900 min-w-[80px] text-right">
                    {formatValue(value)}
                  </span>
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${stageColors[stage]} rounded-full transition-all duration-500 group-hover:opacity-80`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
