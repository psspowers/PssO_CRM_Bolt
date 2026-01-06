import React from 'react';
import { Building2, Handshake, IdCard } from 'lucide-react';

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

      <div className="relative z-10 flex justify-center items-end gap-6 mb-4 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">

        <button
          onClick={() => { onNavigate('accounts'); onClose(); }}
          className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-blue-500/50"
          aria-label="Accounts"
        >
          <Building2 className="w-6 h-6" />
        </button>

        <button
          onClick={() => { onNavigate('contacts'); onClose(); }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-xl shadow-cyan-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-cyan-500/60 mb-8"
          aria-label="Contacts"
        >
          <IdCard className="w-8 h-8" />
        </button>

        <button
          onClick={() => { onNavigate('partners'); onClose(); }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-purple-500/60"
          aria-label="Partners"
        >
          <Handshake className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
};
