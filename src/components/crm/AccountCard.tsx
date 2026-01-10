import React from 'react';
import { MapPin, Building2, Check, Zap } from 'lucide-react';
import { Account } from '../../types/crm';
import { SECTOR_ICONS } from '../../data/thaiTaxonomy';

interface AccountCardProps {
  account: Account;
  opportunityCount?: number;
  onClick: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  opportunityCount = 0,
  onClick,
  showCheckbox,
  isSelected,
  onSelect
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(account.id, !isSelected);
  };

  const sectorIcon = account.sector ? SECTOR_ICONS[account.sector] : '🏢';

  return (
    <div className="relative">
      {showCheckbox && (
        <button
          onClick={handleCheckboxClick}
          className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 hover:border-emerald-400'
          }`}
        >
          {isSelected && <Check className="w-4 h-4" />}
        </button>
      )}

      <button
        onClick={onClick}
        className={`w-full bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-left ${
          showCheckbox ? 'pl-12' : 'pl-3'
        } pr-3 py-3 ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2 rounded-lg flex-shrink-0">
            <span className="text-2xl leading-none">{sectorIcon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
              {account.name}
            </h3>
            {account.country && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{account.country}</span>
              </div>
            )}
            {opportunityCount > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                  <Zap className="w-2.5 h-2.5" />
                  {opportunityCount} Active Deal{opportunityCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {account.sector && (
            <div className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full whitespace-nowrap flex-shrink-0">
              {account.sector.split(' ')[0]}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};
