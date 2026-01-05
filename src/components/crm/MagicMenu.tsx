import React from 'react';
import { Search, Building2, Users, User } from 'lucide-react';

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

      <div className="flex flex-wrap justify-center items-end gap-x-8 gap-y-4 mb-4 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300 max-w-xs mx-auto">

        {/* Row 1: The Core Database */}
        <div className="flex w-full justify-center gap-8">
          {/* Accounts */}
          <div className="flex flex-col items-center gap-2 transition-transform hover:scale-110">
            <button
              onClick={() => { onNavigate('accounts'); onClose(); }}
              className="w-12 h-12 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center"
            >
              <Building2 className="w-5 h-5" />
            </button>
            <span className="text-white text-[10px] font-bold shadow-black/50 drop-shadow-md">Accounts</span>
          </div>

          {/* Contacts (NEW) */}
          <div className="flex flex-col items-center gap-2 transition-transform hover:scale-110">
            <button
              onClick={() => { onNavigate('contacts'); onClose(); }}
              className="w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center"
            >
              <User className="w-5 h-5" />
            </button>
            <span className="text-white text-[10px] font-bold shadow-black/50 drop-shadow-md">Contacts</span>
          </div>

          {/* Partners */}
          <div className="flex flex-col items-center gap-2 transition-transform hover:scale-110">
            <button
              onClick={() => { onNavigate('partners'); onClose(); }}
              className="w-12 h-12 rounded-full bg-purple-500 text-white shadow-lg flex items-center justify-center"
            >
              <Users className="w-5 h-5" />
            </button>
            <span className="text-white text-[10px] font-bold shadow-black/50 drop-shadow-md">Partners</span>
          </div>
        </div>

        {/* Row 2: Search (Closer to thumb) */}
        <div className="flex flex-col items-center gap-2 transition-transform hover:scale-110 mt-2">
          <button
            onClick={() => { onNavigate('search'); onClose(); }}
            className="w-14 h-14 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center"
          >
            <Search className="w-6 h-6" />
          </button>
          <span className="text-white text-xs font-bold shadow-black/50 drop-shadow-md">Search</span>
        </div>

      </div>
    </div>
  );
};
