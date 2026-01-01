import React from 'react';
import { Home, Building2, Target, Users, Clock, Search, CheckSquare, FolderKanban } from 'lucide-react';

// Added 'tasks' and 'projects' to the Tab type
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
  { id: 'search', icon: Search, label: 'Search' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50 safe-area-pb" aria-label="Mobile navigation">
      <div className="flex justify-around items-center">
        {tabs.map(({ id, icon: Icon, label }) => (
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
  );
};
