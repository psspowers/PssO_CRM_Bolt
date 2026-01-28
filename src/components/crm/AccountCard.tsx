import React from 'react';
import { MapPin, Building2, Check, Zap, FileText, Users, DollarSign } from 'lucide-react';
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

  const formatMW = (mw: number) => {
    if (mw >= 1) return `${mw.toFixed(1)} MW`;
    return `${(mw * 1000).toFixed(0)} kW`;
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `฿${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `฿${(value / 1000).toFixed(0)}K`;
    return `฿${value.toFixed(0)}`;
  };

  const hasMetrics = (account.totalDeals ?? 0) > 0 || (account.totalMW ?? 0) > 0 || (account.totalValue ?? 0) > 0 || (account.teamSize ?? 0) > 0;

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

            {hasMetrics && (
              <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-slate-50 rounded text-[10px] font-semibold text-slate-600">
                {(account.totalDeals ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <FileText className="w-3 h-3" />
                    {account.totalDeals}
                  </span>
                )}
                {(account.totalMW ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Zap className="w-3 h-3" />
                    {formatMW(account.totalMW ?? 0)}
                  </span>
                )}
                {(account.totalValue ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <DollarSign className="w-3 h-3" />
                    {formatValue(account.totalValue ?? 0)}
                  </span>
                )}
                {(account.teamSize ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3 h-3" />
                    {account.teamSize}
                  </span>
                )}
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
