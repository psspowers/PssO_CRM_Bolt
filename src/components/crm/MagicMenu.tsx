import React, { useState } from 'react';
import { Building2, UserPlus, ListChecks } from 'lucide-react';
import { TaskMaster } from './TaskMaster';

interface MagicMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const MagicMenu: React.FC<MagicMenuProps> = ({ isOpen, onClose, onNavigate }) => {
  const [showTaskMaster, setShowTaskMaster] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end pb-24 pointer-events-none">
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
          onClick={onClose}
        />

        <div className="relative z-10 flex justify-center mb-3 pointer-events-none">
          <div className="relative w-48 h-32 pointer-events-auto">

            {/* Task Master Button - Center Top */}
            <button
              onClick={() => { setShowTaskMaster(true); onClose(); }}
              className="absolute left-1/2 top-0 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-xl shadow-orange-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/70 animate-in zoom-in duration-300"
              aria-label="Task Master"
            >
              <ListChecks className="w-7 h-7 text-white" />
            </button>

            {/* Add Account Button - Left Arc Position */}
            <button
              onClick={() => { onNavigate('accounts'); onClose(); }}
              className="absolute left-2 bottom-2 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-blue-500/50 animate-in zoom-in duration-300 delay-75"
              aria-label="Add Account"
            >
              <Building2 className="w-6 h-6 text-white" />
            </button>

            {/* Add Contact Button - Right Arc Position */}
            <button
              onClick={() => { onNavigate('contacts'); onClose(); }}
              className="absolute right-2 bottom-2 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/40 flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl hover:shadow-emerald-500/60 animate-in zoom-in duration-300 delay-100"
              aria-label="Add Contact"
            >
              <UserPlus className="w-6 h-6 text-white" />
            </button>

          </div>
        </div>
      </div>

      {/* Task Master Modal */}
      {showTaskMaster && <TaskMaster onClose={() => setShowTaskMaster(false)} />}
    </>
  );
};
