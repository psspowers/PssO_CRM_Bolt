import React from 'react';
import { Building2, Users, UserCircle } from 'lucide-react';

interface MagicMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const MagicMenu: React.FC<MagicMenuProps> = ({ isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pb-24 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="flex justify-center items-center gap-6 mb-4 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">

        <button
          onClick={() => { onNavigate('accounts'); onClose(); }}
          className="w-14 h-14 rounded-full bg-blue-500/70 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-125 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/50"
          aria-label="Accounts"
        >
          <Building2 className="w-6 h-6 opacity-80 hover:opacity-100" />
        </button>

        <button
          onClick={() => { onNavigate('contacts'); onClose(); }}
          className="w-16 h-16 rounded-full bg-white/70 text-slate-900 shadow-xl flex items-center justify-center transition-all hover:scale-125 hover:bg-white hover:shadow-2xl"
          aria-label="Contacts"
        >
          <UserCircle className="w-8 h-8 opacity-80 hover:opacity-100" />
        </button>

        <button
          onClick={() => { onNavigate('partners'); onClose(); }}
          className="w-14 h-14 rounded-full bg-green-500/70 text-white shadow-lg shadow-green-500/30 flex items-center justify-center transition-all hover:scale-125 hover:bg-green-500 hover:shadow-xl hover:shadow-green-500/50"
          aria-label="Partners"
        >
          <Users className="w-6 h-6 opacity-80 hover:opacity-100" />
        </button>

      </div>
    </div>
  );
};
