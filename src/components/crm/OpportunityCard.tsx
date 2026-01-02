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
  Discovery: 'bg-slate-100 text-slate-700',
  'Pre-Dev': 'bg-blue-100 text-blue-700',
  Development: 'bg-amber-100 text-amber-700',
  Contract: 'bg-purple-100 text-purple-700',
  Won: 'bg-emerald-100 text-emerald-700',
  Engineering: 'bg-blue-100 text-blue-700',
  'Permit - EPC': 'bg-purple-100 text-purple-700',
  Construction: 'bg-orange-100 text-orange-700',
  Commissioning: 'bg-amber-100 text-amber-700',
  Operational: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = { 
  High: 'border-l-red-500', 
  Medium: 'border-l-amber-500', 
  Low: 'border-l-slate-300' 
};

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, accountName, ownerName, onClick }) => {
  const formatValue = (val: number) => val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${(val / 1000).toFixed(0)}K`;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-xl lg:rounded-2xl border border-slate-200 p-4 lg:p-5 text-left shadow-sm hover:shadow-lg hover:border-slate-300 transition-all border-l-4 ${priorityColors[opportunity.priority]} group`}
    >
      {/* Top row: Owner and Stage badges */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {ownerName && (
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1.5 border border-blue-100">
            <User className="w-3 h-3" />
            {ownerName}
          </span>
        )}
        <span className={`px-3 py-1 rounded-full text-xs font-bold ml-auto ${stageColors[opportunity.stage]}`}>
          {opportunity.stage}
        </span>
      </div>

      {/* Project name and account */}
      <div className="mb-4">
        <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-orange-600 transition-colors">
          {opportunity.name}
        </h3>
        <p className="text-sm text-slate-500">{accountName || 'No account linked'}</p>
      </div>
      
      <div className="flex items-center gap-4 mt-4">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <DollarSign className="w-4 h-4" />
          <span className="font-bold">{formatValue(opportunity.value)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
          <Zap className="w-4 h-4" />
          <span>{opportunity.targetCapacity} MW</span>
        </div>
        <div className="hidden lg:block text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded-lg">
          {opportunity.reType}
        </div>
      </div>
      
      {opportunity.nextAction && (
        <div className="flex items-center gap-3 mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800 flex-1 truncate font-medium">{opportunity.nextAction}</span>
          {opportunity.nextActionDate && (
            <span className="text-xs text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded-lg">
              {new Date(opportunity.nextActionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-xs text-slate-600 lg:hidden">{opportunity.reType}</span>
        <span className="text-xs text-slate-600 hidden lg:block">Click to view details</span>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
      </div>
    </button>
  );
};
