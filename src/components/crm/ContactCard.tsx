import React from 'react';
import { Mail, Phone, ChevronRight, Check } from 'lucide-react';
import { Contact } from '../../types/crm';

interface ContactCardProps {
  contact: Contact;
  organizationName?: string;
  onClick: () => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const tagColors: Record<string, string> = {
  'Decision Maker': 'bg-emerald-100 text-emerald-700', 'Influencer': 'bg-blue-100 text-blue-700',
  'Regulator': 'bg-purple-100 text-purple-700', 'Advisor': 'bg-amber-100 text-amber-700',
  'Banker': 'bg-green-100 text-green-700', 'Legal': 'bg-red-100 text-red-700', 'Policy': 'bg-indigo-100 text-indigo-700',
};

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
      <button onClick={onClick} className={`w-full bg-white rounded-xl border border-gray-200 p-4 text-left shadow-sm hover:shadow-md transition-all ${showCheckbox ? 'pl-12' : ''} ${isSelected ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}>
        <div className="flex items-start gap-3">
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.fullName} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold">{contact.fullName.split(' ').map(n => n[0]).join('')}</div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{contact.fullName}</h3>
            <p className="text-sm text-gray-500">{contact.role}</p>
            <p className="text-xs text-gray-600 mt-0.5">{organizationName}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {contact.tags.slice(0, 3).map(tag => (<span key={tag} className={`text-xs px-2 py-0.5 rounded-full ${tagColors[tag] || 'bg-gray-100 text-gray-600'}`}>{tag}</span>))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600"><Mail className="w-3 h-3" /> Email</a>
          <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600"><Phone className="w-3 h-3" /> Call</a>
        </div>
      </button>
    </div>
  );
};
