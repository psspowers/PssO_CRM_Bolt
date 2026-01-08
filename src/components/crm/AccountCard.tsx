import React from 'react';
import { ChevronRight, MapPin, Factory, Building2, Hotel, Wheat, Briefcase, Target } from 'lucide-react';
import { Account } from '../../types/crm';

interface AccountCardProps {
  account: Account;
  dealCount?: number;
  onClick: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, dealCount = 0, onClick }) => {
  const getIndustryIcon = (sector?: string) => {
    if (sector?.includes('Manuf')) return Factory;
    if (sector?.includes('Hosp')) return Hotel;
    if (sector?.includes('Agri')) return Wheat;
    if (sector?.includes('Comm')) return Building2;
    return Briefcase;
  };
  const IndustryIcon = getIndustryIcon(account.sector);

  return (
    <button onClick={onClick} className="w-full group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
          <IndustryIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{account.name}</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <MapPin className="w-3 h-3" />
            <span>{account.country}</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
      </div>

      {/* Footer Metrics */}
      <div className="bg-slate-50/50 px-4 py-3 flex items-center justify-between border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{account.sector || 'Unclassified'}</span>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-200 shadow-sm">
          <Target className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-bold text-slate-700">{dealCount} Deals</span>
        </div>
      </div>
    </button>
  );
};
