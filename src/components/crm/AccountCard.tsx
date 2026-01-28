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
        <div className="flex items-start gap-3">
          <div className="bg-slate-100 p-2 rounded-lg flex-shrink-0">
            <span className="text-2xl leading-none">{sectorIcon}</span>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                {account.name}
              </h3>
              {account.type === 'Partner' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap flex-shrink-0">
                  PARTNER
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{account.country || 'Unknown'}</span>
              {account.sector && (
                <>
                  <span className="mx-1">•</span>
                  <span className="truncate">{account.sector.split(' ')[0]}</span>
                </>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5 p-2 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
              <div className="flex flex-col items-center justify-center p-1">
                <FileText className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                <span className="text-xs font-bold text-slate-900">{account.totalDeals ?? 0}</span>
                <span className="text-[9px] text-slate-500">Deals</span>
              </div>
              <div className="flex flex-col items-center justify-center p-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 mb-0.5" />
                <span className="text-xs font-bold text-slate-900">
                  {(account.totalMW ?? 0) >= 1 ? `${(account.totalMW ?? 0).toFixed(1)}` : (account.totalMW ?? 0) > 0 ? `${((account.totalMW ?? 0) * 1000).toFixed(0)}k` : '0'}
                </span>
                <span className="text-[9px] text-slate-500">MW</span>
              </div>
              <div className="flex flex-col items-center justify-center p-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500 mb-0.5" />
                <span className="text-xs font-bold text-slate-900">{formatValue(account.totalValue ?? 0)}</span>
                <span className="text-[9px] text-slate-500">Value</span>
              </div>
              <div className="flex flex-col items-center justify-center p-1">
                <Users className="w-3.5 h-3.5 text-blue-500 mb-0.5" />
                <span className="text-xs font-bold text-slate-900">{account.teamSize ?? 0}</span>
                <span className="text-[9px] text-slate-500">Team</span>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
};
