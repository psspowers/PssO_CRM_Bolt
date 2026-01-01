import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { getShortcutLabel } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  if (!isOpen) return null;

  const groupedShortcuts = {
    'Navigation': shortcuts.filter(s => s.description.toLowerCase().includes('go to') || s.description.toLowerCase().includes('navigate')),
    'Actions': shortcuts.filter(s => s.description.toLowerCase().includes('create') || s.description.toLowerCase().includes('add') || s.description.toLowerCase().includes('search')),
    'General': shortcuts.filter(s => !s.description.toLowerCase().includes('go to') && !s.description.toLowerCase().includes('navigate') && !s.description.toLowerCase().includes('create') && !s.description.toLowerCase().includes('add') && !s.description.toLowerCase().includes('search')),
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-orange-600" />
            <h2 id="shortcuts-title" className="text-xl font-bold text-slate-900">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close shortcuts help"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {Object.entries(groupedShortcuts).map(([group, groupShortcuts]) => {
            if (groupShortcuts.length === 0) return null;

            return (
              <div key={group}>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                  {group}
                </h3>
                <div className="space-y-2">
                  {groupShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-700">{shortcut.description}</span>
                      <kbd className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm font-mono font-semibold text-slate-700 shadow-sm">
                        {getShortcutLabel(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <p className="text-sm text-slate-600">
            Press <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-semibold">?</kbd> to toggle this help dialog
          </p>
        </div>
      </div>
    </div>
  );
};
