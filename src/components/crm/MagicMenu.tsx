import React from 'react';
import { Building2, UserPlus, ClipboardCheck } from 'lucide-react';

interface MagicMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAdd: (mode: 'activity' | 'entity', entityType?: 'Contact' | 'Account') => void;
}

export const MagicMenu: React.FC<MagicMenuProps> = ({ isOpen, onClose, onQuickAdd }) => {
  if (!isOpen) return null;

  const handleAction = (mode: 'activity' | 'entity', entityType?: 'Contact' | 'Account') => {
    onQuickAdd(mode, entityType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pb-24 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 flex justify-center mb-4 pointer-events-none">
        <div className="relative w-64 h-48 pointer-events-auto">

          {/* Add Contact - Top Position */}
          <button
            onClick={() => handleAction('entity', 'Contact')}
            className="absolute left-1/2 top-0 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-xl shadow-emerald-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-emerald-500/70 animate-in zoom-in duration-300"
            aria-label="Add Contact"
          >
            <UserPlus className="w-7 h-7" />
          </button>

          {/* Add Account - Bottom Left */}
          <button
            onClick={() => handleAction('entity', 'Account')}
            className="absolute left-8 bottom-8 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-lg shadow-blue-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-blue-500/60 animate-in zoom-in duration-300 delay-75"
            aria-label="Add Account"
          >
            <Building2 className="w-6 h-6" />
          </button>

          {/* Log Activity - Bottom Right */}
          <button
            onClick={() => handleAction('activity')}
            className="absolute right-8 bottom-8 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-orange-500/60 animate-in zoom-in duration-300 delay-150"
            aria-label="Log Activity"
          >
            <ClipboardCheck className="w-6 h-6" />
          </button>

        </div>
      </div>
    </div>
  );
};
