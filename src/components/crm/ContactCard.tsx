import React from 'react';
import { Mail, Phone, Check } from 'lucide-react';
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

  return (
    <div className="relative">
      {showCheckbox && (
        <button onClick={handleCheckboxClick} className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 hover:border-emerald-400'}`}>
          {isSelected && <Check className="w-4 h-4" />}
        </button>
      )}
      <button
        onClick={onClick}
        className={`w-full bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all ${showCheckbox ? 'pl-12' : 'pl-3'} pr-3 py-3 ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
      >
        <div className="flex items-center gap-3">
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {contact.fullName.split(' ').map(n => n[0]).join('')}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{contact.fullName}</h3>
            <p className="text-xs text-slate-500 truncate">{contact.role}</p>
            {organizationName && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{organizationName}</p>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors"
                aria-label="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};
