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

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50 safe-area-pb" aria-label="Mobile navigation">
        <div className="flex justify-around items-center">
          {tabs.slice(0, 2).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                activeTab === id
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label={label}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </button>
          ))}

          <button
            onClick={() => setIsMagicOpen(!isMagicOpen)}
            className="flex flex-col items-center py-2 px-3 rounded-lg transition-all relative -mt-4"
            aria-label="Magic Menu"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isMagicOpen
                ? 'bg-gradient-to-br from-orange-500 to-pink-500 scale-110'
                : 'bg-gradient-to-br from-orange-400 to-orange-600'
            }`}>
              <Sparkles className={`w-7 h-7 text-white transition-transform ${isMagicOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </div>
          </button>

          {tabs.slice(2).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                activeTab === id
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label={label}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};
