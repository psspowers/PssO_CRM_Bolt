import React, { useState } from 'react';
import { Building2, ListChecks, UserSearch } from 'lucide-react';
import { GeminiImportModal } from './GeminiImportModal';
import { TaskMasterModal } from './TaskMasterModal';

interface MagicMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenQuickAdd?: () => void;
}

export const MagicMenu: React.FC<MagicMenuProps> = ({ isOpen, onClose, onNavigate, onOpenQuickAdd }) => {
  const [showGemini, setShowGemini] = useState(false);
  const [showTaskMaster, setShowTaskMaster] = useState(false);

  const handleContactIntelligence = () => {
    setShowGemini(true);
    onClose();
  };

  const handleAccountIntelligence = () => {
    if (onOpenQuickAdd) {
      onOpenQuickAdd();
    }
    onClose();
  };

  const handleTaskMaster = () => {
    setShowTaskMaster(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end pb-24 pointer-events-none">
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
          onClick={onClose}
        />

        <div className="relative z-10 flex justify-center mb-4 pointer-events-none">
          <div className="relative w-64 h-48 pointer-events-auto">

            {/* Contact Intelligence - Left Arc Position (Emerald) */}
            <button
              onClick={handleContactIntelligence}
              className="absolute left-4 bottom-8 w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-xl shadow-emerald-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-emerald-500/70 animate-in zoom-in duration-300"
              aria-label="Contact Intelligence"
            >
              <UserSearch className="w-7 h-7" />
            </button>

            {/* Account Intelligence - Center Top (Blue) */}
            <button
              onClick={handleAccountIntelligence}
              className="absolute left-1/2 top-0 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-xl shadow-blue-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-blue-500/70 animate-in zoom-in duration-300 delay-75"
              aria-label="Account Intelligence"
            >
              <Building2 className="w-7 h-7" />
            </button>

            {/* Task Master - Right Arc Position (Orange) */}
            <button
              onClick={handleTaskMaster}
              className="absolute right-4 bottom-8 w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-xl shadow-orange-500/50 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/70 animate-in zoom-in duration-300 delay-150"
              aria-label="Task Master"
            >
              <ListChecks className="w-7 h-7" />
            </button>

          </div>
        </div>
      </div>

      <GeminiImportModal isOpen={showGemini} onClose={() => setShowGemini(false)} />
      <TaskMasterModal isOpen={showTaskMaster} onClose={() => setShowTaskMaster(false)} />
    </>
  );
};
