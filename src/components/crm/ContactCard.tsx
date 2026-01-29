import React from 'react';
import { Mail, Phone, Check, Zap, FileText, Users, DollarSign } from 'lucide-react';
import { Contact } from '../../types/crm';

interface ContactCardProps {
  contact: Contact;
  organizationName?: string;
  onClick: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, organizationName, onClick, showCheckbox, isSelected, onSelect }) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(contact.id, !isSelected);
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) return `฿${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `฿${(value / 1000).toFixed(0)}K`;
    return `฿${value.toFixed(0)}`;
  };

  const dealCount = contact.orgTotalDeals ?? 0;
  const totalMW = contact.orgTotalMW ?? 0;
  const totalValue = contact.orgTotalValue ?? 0;
  const teamSize = contact.orgTeamSize ?? 0;

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
        className={`w-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left ${
          showCheckbox ? 'pl-12' : 'pl-4'
        } pr-4 py-4 ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
      >
        <div className="flex items-start gap-3">
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.fullName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {contact.fullName.split(' ').map(n => n[0]).join('')}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 leading-tight truncate">{contact.fullName}</h3>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {contact.role}
              {organizationName && (
                <span className="text-slate-400"> • {organizationName}</span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors"
                aria-label="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-4 gap-1.5">
          <div className="flex flex-col items-center justify-center p-1.5 bg-slate-50 rounded-lg">
            <FileText className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
            <span className="text-xs font-bold text-slate-900">{dealCount}</span>
            <span className="text-[9px] text-slate-500">Deals</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1.5 bg-amber-50 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-amber-500 mb-0.5" />
            <span className="text-xs font-bold text-slate-900">
              {totalMW >= 1 ? `${totalMW.toFixed(1)}` : totalMW > 0 ? `${(totalMW * 1000).toFixed(0)}k` : '0'}
            </span>
            <span className="text-[9px] text-slate-500">MW</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1.5 bg-emerald-50 rounded-lg">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500 mb-0.5" />
            <span className="text-xs font-bold text-slate-900">{formatValue(totalValue)}</span>
            <span className="text-[9px] text-slate-500">Value</span>
          </div>
          <div className="flex flex-col items-center justify-center p-1.5 bg-blue-50 rounded-lg">
            <Users className="w-3.5 h-3.5 text-blue-500 mb-0.5" />
            <span className="text-xs font-bold text-slate-900">{teamSize}</span>
            <span className="text-[9px] text-slate-500">Team</span>
          </div>
        </div>
      </button>
    </div>
  );
};
