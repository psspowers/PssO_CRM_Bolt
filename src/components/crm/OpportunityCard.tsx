import React from 'react';
import { ChevronRight, Zap, Clock, Factory, Building2, Hotel, Wheat, Briefcase } from 'lucide-react';
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

  const formatValue = (val: number) => val >= 1000000 ? `฿${(val / 1000000).toFixed(1)}M` : `฿${(val / 1000).toFixed(0)}K`;
  const IndustryIcon = getIndustryIcon(opportunity.sector);

  return (
    <button onClick={onClick} className="w-full group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden text-left">
      <div className="p-4 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shadow-inner flex-shrink-0">
          <IndustryIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{opportunity.name}</h3>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{accountName}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">{opportunity.stage}</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
      </div>
      <div className="grid grid-cols-2 border-t border-slate-50">
        <div className="p-3 border-r border-slate-50 flex flex-col items-center justify-center bg-slate-50/30">
          <span className="text-[10px] uppercase font-bold text-slate-400">Value</span>
          <span className="text-sm font-black text-slate-900">{formatValue(opportunity.value)}</span>
        </div>
        <div className="p-3 flex flex-col items-center justify-center bg-slate-50/30">
          <span className="text-[10px] uppercase font-bold text-slate-400">Capacity</span>
          <span className="text-sm font-black text-slate-900 flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500 fill-amber-500" />{opportunity.targetCapacity} MW</span>
        </div>
      </div>
      <div className="h-1 w-full bg-slate-100">
        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${getProgress(opportunity.stage)}%` }} />
      </div>
    </button>
  );
};
