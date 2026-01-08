import React from 'react';
import { ChevronRight, Globe, Users, Building } from 'lucide-react';
import { Partner } from '../../types/crm';

interface PartnerCardProps {
  partner: Partner;
  onClick: () => void;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({ partner, onClick }) => {
  return (
    <button onClick={onClick} className="w-full group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        {/* Avatar Box */}
        <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-black text-lg flex-shrink-0 shadow-sm">
          {partner.name.substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{partner.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wide">
              {partner.partnerType || 'Partner'}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
      </div>

      {/* Footer Metrics */}
      <div className="bg-slate-50/50 px-4 py-3 flex items-center gap-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          {partner.region || 'Global'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          {partner.country}
        </div>
      </div>
    </button>
  );
};
