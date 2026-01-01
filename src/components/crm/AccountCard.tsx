import React from 'react';
import { MapPin, ChevronRight, Star, Check, Building2 } from 'lucide-react';
import { Account } from '../../types/crm';
import { SECTOR_ICONS, getTaxonomyInfo, getScoreColor } from '../../data/thaiTaxonomy';

interface AccountCardProps {
  account: Account;
  onClick: () => void;
  opportunityCount?: number;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const importanceColors: Record<string, string> = {
  High: 'text-amber-500', Medium: 'text-slate-400', Low: 'text-slate-300',
};

export const AccountCard: React.FC<AccountCardProps> = ({ account, onClick, opportunityCount = 0, showCheckbox, isSelected, onSelect }) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(account.id, !isSelected);
  };

  // Get taxonomy info for credit score display
  const taxonomyInfo = account.subIndustry ? getTaxonomyInfo(account.subIndustry) : null;
  const sectorIcon = SECTOR_ICONS[account.sector] || '🏢';

  return (
    <div className="relative">
      {showCheckbox && (
        <button onClick={handleCheckboxClick} className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300 hover:border-orange-400'}`}>
          {isSelected && <Check className="w-4 h-4" />}
        </button>
      )}
      <button onClick={onClick} className={`w-full bg-white rounded-xl lg:rounded-2xl border border-slate-200 p-4 lg:p-5 text-left shadow-sm hover:shadow-lg hover:border-slate-300 transition-all ${showCheckbox ? 'pl-12' : ''} ${isSelected ? 'ring-2 ring-orange-500 border-orange-500' : ''} group`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-100 rounded-xl flex items-center justify-center text-2xl lg:text-3xl flex-shrink-0">
            {sectorIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 truncate group-hover:text-orange-600 transition-colors">{account.name}</h3>
              <Star className={`w-4 h-4 ${importanceColors[account.strategicImportance]} fill-current flex-shrink-0`} />
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 truncate max-w-[150px] font-medium">
                {account.sector || 'Unclassified'}
              </span>
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {account.country}
              </div>
            </div>
            {/* Show industry/sub-industry if available */}
            {account.industry && (
              <p className="text-xs text-slate-600 mt-2 truncate">
                {account.industry}
                {account.subIndustry && ` › ${account.subIndustry}`}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
            {/* Credit Score Badge */}
            {taxonomyInfo && (
              <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${getScoreColor(taxonomyInfo.score)}`}>
                CS:{taxonomyInfo.score}
              </div>
            )}
          </div>
        </div>
        {opportunityCount > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">{opportunityCount} active opportunities</span>
            <span className="text-sm text-orange-600 font-semibold">View details</span>
          </div>
        )}
      </button>
    </div>
  );
};
