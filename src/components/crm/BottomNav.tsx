import React from 'react';
import { Home, Target, CheckSquare, FolderKanban, Sparkles } from 'lucide-react';
import { MagicMenu } from './MagicMenu';

type Tab = 'home' | 'accounts' | 'opportunities' | 'partners' | 'contacts' | 'projects' | 'search' | 'timeline' | 'tasks';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'opportunities', icon: Target, label: 'Deals' },
  { id: 'projects', icon: FolderKanban, label: 'Projects' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const [isMagicOpen, setIsMagicOpen] = React.useState(false);

  return (
    <>
      <MagicMenu isOpen={isMagicOpen} onClose={() => setIsMagicOpen(false)} onNavigate={onTabChange} />

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 grid grid-cols-5 h-16 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe z-50"
        aria-label="Mobile navigation"
      >
        {tabs.slice(0, 2).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`relative flex items-center justify-center transition-colors ${
              activeTab === id
                ? 'text-orange-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label={label}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon
              className={activeTab === id ? 'w-7 h-7' : 'w-6 h-6'}
              aria-hidden="true"
            />
            {activeTab === id && (
              <div className="absolute bottom-2 w-1 h-1 bg-orange-600 rounded-full" />
            )}
          </button>
        ))}

        <div className="relative flex items-center justify-center -top-3">
          <button
            onClick={() => setIsMagicOpen(!isMagicOpen)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-500 to-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/40 ring-4 ring-white transition-transform active:scale-95"
            aria-label="Magic Menu"
          >
            <Sparkles
              className={`w-7 h-7 transition-transform ${isMagicOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            {!isMagicOpen && (
              <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-20" />
            )}
          </button>
        </div>

        {tabs.slice(2).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`relative flex items-center justify-center transition-colors ${
              activeTab === id
                ? 'text-orange-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label={label}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon
              className={activeTab === id ? 'w-7 h-7' : 'w-6 h-6'}
              aria-hidden="true"
            />
            {activeTab === id && (
              <div className="absolute bottom-2 w-1 h-1 bg-orange-600 rounded-full" />
            )}
          </button>
        ))}
      </nav>
    </>
  );
};
