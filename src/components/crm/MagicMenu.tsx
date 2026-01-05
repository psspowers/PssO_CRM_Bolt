import React from 'react';
import { Search, Building2, Users } from 'lucide-react';

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

      <div className="flex justify-center items-end gap-6 mb-4 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">

        <div className="flex flex-col items-center gap-2 transition-transform hover:scale-110">
          <button
            onClick={() => { onNavigate('accounts'); onClose(); }}
            className="w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center"
          >
            <Building2 className="w-6 h-6" />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">Accounts</span>
        </div>

        <div className="flex flex-col items-center gap-2 mb-8 transition-transform hover:scale-110">
          <button
            onClick={() => { onNavigate('search'); onClose(); }}
            className="w-16 h-16 rounded-full bg-white text-slate-900 shadow-xl flex items-center justify-center"
          >
            <Search className="w-8 h-8" />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">Search</span>
        </div>

        <div className="flex flex-col items-center gap-2 transition-transform hover:scale-110">
          <button
            onClick={() => { onNavigate('partners'); onClose(); }}
            className="w-14 h-14 rounded-full bg-purple-500 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center"
          >
            <Users className="w-6 h-6" />
          </button>
          <span className="text-white text-xs font-bold drop-shadow-md">Partners</span>
        </div>

      </div>
    </div>
  );
};
