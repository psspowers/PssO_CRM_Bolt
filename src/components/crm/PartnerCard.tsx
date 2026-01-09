import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { Partner } from '../../types/crm';

interface PartnerStats {
  activeDeals: number;
  activeMW: number;
  wonDeals: number;
  wonMW: number;
  lostDeals: number;
  lostMW: number;
  lastMeeting: string | null;
}

interface PartnerCardProps {
  partner: Partner;
  onClick: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  stats?: PartnerStats;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({ partner, onClick, showCheckbox, isSelected, onSelect, stats }) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(partner.id, !isSelected);
  };

  return (
    <div className="relative">
      {showCheckbox && (
        <button onClick={handleCheckboxClick} className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white border-gray-300 hover:border-purple-400'}`}>
          {isSelected && <Check className="w-4 h-4" />}
        </button>
      )}
      <button onClick={onClick} className={`group w-full bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden text-left ${showCheckbox ? 'pl-12' : ''} ${isSelected ? 'ring-2 ring-purple-500 border-purple-500' : ''}`}>
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-black text-lg flex-shrink-0 shadow-sm">
            {partner.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{partner.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wide">
                {partner.partnerType || 'Partner'}
              </span>
              <span className="text-xs text-slate-400">• {partner.country}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
        </div>

        <div className="grid grid-cols-3 border-y border-slate-50 bg-slate-50/50 divide-x divide-slate-100">
          <div className="p-2 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Active</p>
            <p className="text-sm font-black text-blue-600">{stats?.activeMW?.toFixed(1) || 0} MW</p>
            <p className="text-[9px] text-slate-400">{stats?.activeDeals || 0} Deals</p>
          </div>
          <div className="p-2 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Won</p>
            <p className="text-sm font-black text-emerald-600">{stats?.wonMW?.toFixed(1) || 0} MW</p>
            <p className="text-[9px] text-slate-400">{stats?.wonDeals || 0} Deals</p>
          </div>
          <div className="p-2 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Lost</p>
            <p className="text-sm font-black text-slate-500">{stats?.lostMW?.toFixed(1) || 0} MW</p>
            <p className="text-[9px] text-slate-400">{stats?.lostDeals || 0} Deals</p>
          </div>
        </div>

        <div className="px-4 py-2 bg-white flex justify-between items-center text-[10px] font-medium text-slate-400">
          <span>{partner.region}</span>
          <span>Last Meeting: <span className="text-slate-600">{stats?.lastMeeting ? new Date(stats.lastMeeting).toLocaleDateString() : 'Never'}</span></span>
        </div>
      </button>
    </div>
  );
};
