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

      <div className="relative z-10 flex justify-center mb-4 pointer-events-none">
        <div className="relative w-64 h-48 pointer-events-auto">

          {/* Contacts Button - Center Top */}
          <button
            onClick={() => { onNavigate('contacts'); onClose(); }}
            className="absolute left-1/2 top-0 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-xl shadow-cyan-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-cyan-500/70 animate-in zoom-in duration-300"
            aria-label="Contacts"
          >
            <IdCard className="w-7 h-7" />
          </button>

          {/* Accounts Button - Left Arc Position */}
          <button
            onClick={() => { onNavigate('accounts'); onClose(); }}
            className="absolute left-4 bottom-8 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-lg shadow-blue-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-blue-500/60 animate-in zoom-in duration-300 delay-75"
            aria-label="Accounts"
          >
            <Building2 className="w-6 h-6" />
          </button>

          {/* Me Button - Center Bottom */}
          <button
            onClick={() => { onNavigate('me'); onClose(); }}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-xl shadow-orange-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/70 animate-in zoom-in duration-300 delay-100"
            aria-label="Me"
          >
            <span className="text-2xl font-light tracking-wide" style={{ fontFamily: 'cursive' }}>
              me
            </span>
          </button>

          {/* Partners Button - Right Arc Position */}
          <button
            onClick={() => { onNavigate('partners'); onClose(); }}
            className="absolute right-4 bottom-8 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-violet-500/60 animate-in zoom-in duration-300 delay-150"
            aria-label="Partners"
          >
            <Handshake className="w-6 h-6" />
          </button>

        </div>
      </div>
    </div>
  );
};
