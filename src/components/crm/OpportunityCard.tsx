import React from 'react';
import { Calendar, DollarSign, ChevronRight, Zap, User } from 'lucide-react';
import { Opportunity } from '../../types/crm';

interface OpportunityCardProps {
  opportunity: Opportunity;
  accountName?: string;
  ownerName?: string;
  onClick: () => void;
}

const stageColors: Record<string, string> = {
  Prospect: 'bg-slate-100 text-slate-600',
  Qualified: 'bg-slate-100 text-slate-600',
  Proposal: 'bg-slate-100 text-slate-600',
  Negotiation: 'bg-slate-100 text-slate-600',
  'Term Sheet': 'bg-slate-100 text-slate-600',
  Won: 'bg-emerald-100 text-emerald-700',
  Lost: 'bg-slate-100 text-slate-600',
};

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, accountName, ownerName, onClick }) => {
  const formatValue = (val: number) => val >= 1000000 ? `฿${(val / 1000000).toFixed(1)}M` : `฿${(val / 1000).toFixed(0)}K`;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-[0.98] text-left group"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        {ownerName && (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full flex items-center gap-1.5">
            <User className="w-3 h-3" />
            {ownerName}
          </span>
        )}
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ml-auto ${stageColors[opportunity.stage]}`}>
          {opportunity.stage}
        </span>
      </div>

      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 group-hover:text-orange-600 transition-colors">
          {opportunity.name}
        </h3>
        <p className="text-sm font-semibold text-slate-500">{accountName || 'No account linked'}</p>
      </div>

      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-5 h-5 text-slate-900" />
          <span className="text-xl font-black text-slate-900 tracking-tight">{formatValue(opportunity.value)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-500">{opportunity.targetCapacity} MW</span>
        </div>
        <div className="hidden lg:block text-xs font-semibold text-slate-500 px-2.5 py-1 bg-slate-100 rounded-lg">
          {opportunity.reType}
        </div>
      </div>

      {opportunity.nextAction && (
        <div className="flex items-center gap-3 mt-4 p-3 bg-slate-100 rounded-xl">
          <Calendar className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <span className="text-sm text-slate-700 flex-1 truncate font-medium">{opportunity.nextAction}</span>
          {opportunity.nextActionDate && (
            <span className="text-xs text-slate-600 font-semibold bg-white px-2.5 py-1 rounded-lg">
              {new Date(opportunity.nextActionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 lg:hidden">{opportunity.reType}</span>
        <span className="text-xs font-semibold text-slate-500 hidden lg:block">Click to view details</span>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
      </div>
    </button>
  );
};
