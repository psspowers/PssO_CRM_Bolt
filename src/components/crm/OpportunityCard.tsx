import React from 'react';
import { Zap, Factory, Building2, Hotel, Wheat, Briefcase } from 'lucide-react';
import { Opportunity } from '../../types/crm';

interface OpportunityCardProps {
  opportunity: Opportunity;
  accountName?: string;
  ownerName?: string;
  onClick: () => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, accountName, onClick }) => {
  const getIndustryIcon = (sector?: string) => {
    if (sector?.includes('Manuf')) return Factory;
    if (sector?.includes('Hosp')) return Hotel;
    if (sector?.includes('Agri')) return Wheat;
    if (sector?.includes('Comm')) return Building2;
    return Briefcase;
  };

  const getProgress = (stage: string) => {
    const map: Record<string, number> = { 'Prospect': 10, 'Qualified': 25, 'Proposal': 50, 'Negotiation': 75, 'Term Sheet': 90, 'Won': 100, 'Lost': 0 };
    return map[stage] || 0;
  };

  const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  const formatValue = (val: number) => val >= 1000000 ? `฿${(val / 1000000).toFixed(1)}M` : `฿${(val / 1000).toFixed(0)}K`;
  const IndustryIcon = getIndustryIcon(opportunity.sector);

  return (
    <button onClick={onClick} className="w-full max-w-full box-border bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 overflow-hidden text-left relative hover:shadow-md transition-all active:scale-[0.98]">

      <div className="p-4 flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
           opportunity.sector?.includes('Manuf') ? 'bg-blue-500' :
           opportunity.sector?.includes('Agri') ? 'bg-green-500' :
           opportunity.sector?.includes('Comm') ? 'bg-purple-500' :
           'bg-slate-500'
        }`}>
          <IndustryIcon className="w-5 h-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 truncate pr-2 overflow-hidden whitespace-nowrap text-ellipsis">
            {toTitleCase(opportunity.name)}
          </h3>
          <p className="text-xs text-slate-500 truncate overflow-hidden whitespace-nowrap text-ellipsis">
            {toTitleCase(accountName || 'Unknown Account')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-4 mt-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Value</span>
          <span className="text-base font-black text-slate-900 leading-none">
            {formatValue(opportunity.value)}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacity</span>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-sm font-black text-slate-900 leading-none">
              {(opportunity.targetCapacity || 0).toFixed(2)} <span className="text-xs font-normal text-slate-500">MW</span>
            </span>
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-slate-100">
        <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-500" style={{ width: `${getProgress(opportunity.stage)}%` }} />
      </div>
    </button>
  );
};
