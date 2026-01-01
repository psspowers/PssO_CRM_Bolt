import React from 'react';
import { MapPin, ChevronRight, ExternalLink, Check } from 'lucide-react';
import { Partner } from '../../types/crm';

interface PartnerCardProps {
  partner: Partner;
  onClick: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({ partner, onClick, showCheckbox, isSelected, onSelect }) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(partner.id, !isSelected);
  };

  return (
    <div className="relative">
      {showCheckbox && (
        <button onClick={handleCheckboxClick} className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 hover:border-emerald-400'}`}>
          {isSelected && <Check className="w-4 h-4" />}
        </button>
      )}
      <button onClick={onClick} className={`w-full bg-white rounded-xl border border-gray-200 p-4 text-left shadow-sm hover:shadow-md transition-all ${showCheckbox ? 'pl-12' : ''} ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">{partner.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{partner.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-gray-500 text-sm"><MapPin className="w-3 h-3" />{partner.country}</div>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{partner.region}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        {partner.notes && <p className="text-xs text-gray-500 mt-3 line-clamp-2">{partner.notes}</p>}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {partner.clickupLink && (
              <a href={partner.clickupLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"><ExternalLink className="w-3 h-3" /> ClickUp</a>
            )}
          </div>
          <span className="text-xs text-gray-600">Updated {new Date(partner.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </button>
    </div>
  );
};
