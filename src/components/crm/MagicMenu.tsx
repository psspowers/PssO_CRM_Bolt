import React from 'react';
import { Building2, Handshake, IdCard, User, Network } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MagicMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const MagicMenu: React.FC<MagicMenuProps> = ({ isOpen, onClose, onNavigate }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pb-24 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 flex justify-center mb-4 pointer-events-none">
        <div className="relative w-64 h-48 pointer-events-auto">

          {/* Me Button - Center Top */}
          <button
            onClick={() => { onNavigate('me'); onClose(); }}
            className="absolute left-1/2 top-0 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-xl shadow-orange-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/70 animate-in zoom-in duration-300"
            aria-label="Me"
          >
            <User className="w-7 h-7" />
          </button>

          {/* Accounts Button - Left Arc Position */}
          <button
            onClick={() => { onNavigate('accounts'); onClose(); }}
            className="absolute left-4 bottom-8 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-blue-500/50 animate-in zoom-in duration-300 delay-75"
            aria-label="Accounts"
          >
            <Building2 className="w-6 h-6" />
          </button>

          {/* Contacts Button - Center Bottom */}
          <button
            onClick={() => { onNavigate('contacts'); onClose(); }}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg shadow-cyan-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-cyan-500/60 animate-in zoom-in duration-300 delay-100"
            aria-label="Contacts"
          >
            <IdCard className="w-6 h-6" />
          </button>

          {/* Partners Button - Right Arc Position */}
          <button
            onClick={() => { onNavigate('partners'); onClose(); }}
            className="absolute right-4 bottom-8 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white shadow-lg shadow-purple-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-purple-500/60 animate-in zoom-in duration-300 delay-150"
            aria-label="Partners"
          >
            <Handshake className="w-6 h-6" />
          </button>

          {/* Nexus Button - Top Right Arc Position (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => { onNavigate('nexus'); onClose(); }}
              className="absolute right-8 top-12 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-indigo-500/60 animate-in zoom-in duration-300 delay-200"
              aria-label="Nexus"
            >
              <Network className="w-6 h-6" />
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
