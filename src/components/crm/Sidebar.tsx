import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Building2, Target, Clock, Search, CheckSquare, Plus, Settings, HelpCircle, ChevronLeft, ChevronRight, FolderKanban, Users, FileSpreadsheet, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'home' | 'accounts' | 'opportunities' | 'partners' | 'contacts' | 'search' | 'timeline' | 'tasks' | 'projects';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onQuickAdd: () => void;
  onBulkImport?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'home', icon: Home, label: 'Dashboard' },
  { id: 'opportunities', icon: Target, label: 'Deals' },
  { id: 'accounts', icon: Building2, label: 'Accounts' },
  { id: 'partners', icon: Users, label: 'Partners' },
  { id: 'projects', icon: FolderKanban, label: 'Projects' },
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'timeline', icon: Clock, label: 'Timeline' },
  { id: 'search', icon: Search, label: 'Search' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  onQuickAdd,
  onBulkImport,
  collapsed,
  onToggleCollapse
}) => {
  const { user, profile } = useAuth();
  
  // Determine if user is admin
  let isAdmin = profile?.role === 'admin';
  if (!profile?.role && user?.email) {
    isAdmin = user.email === 'sam@psspowers.com';
  }

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-900 text-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
      aria-label="Main navigation"
    >
      {/* Logo - Clickable to go home */}
      <div className="p-4 border-b border-slate-700/50">
        <button
          onClick={() => onTabChange('home')}
          className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to Dashboard"
        >
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/6906bb3c71e38f27025f3702_1764911901727_6285940b.png" 
            className="w-14 h-14 object-contain flex-shrink-0" 
            alt="PSS Orange Logo" 
          />
          {!collapsed && (
            <div className="text-left">
              <h1 className="text-base font-bold text-white leading-tight">PSS Orange</h1>
              <span className="text-xs text-orange-400 font-black uppercase tracking-tighter">Investor CRM</span>
            </div>
          )}
        </button>
      </div>


      {/* Quick Add & Import Buttons */}
      <div className="p-4 space-y-2">
        <button
          onClick={onQuickAdd}
          className={`w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 ${collapsed ? 'p-3' : 'px-4 py-3'}`}
          aria-label="Create new entry"
        >
          <Plus className="w-5 h-5" />
          {!collapsed && <span>New Entry</span>}
        </button>
        
        {onBulkImport && (
          <button
            onClick={onBulkImport}
            className={`w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${collapsed ? 'p-3' : 'px-4 py-2.5'}`}
            aria-label="Bulk import data"
          >
            <FileSpreadsheet className="w-5 h-5" />
            {!collapsed && <span>Bulk Import</span>}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main menu">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
              activeTab === id
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            } ${collapsed ? 'justify-center' : ''}`}
            aria-label={label}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-slate-700/50 space-y-1">
        {/* Admin Panel Link - Only for admins */}
        {isAdmin && (
          <Link
            to="/admin"
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-all ${collapsed ? 'justify-center' : ''}`}
            aria-label="Admin Panel"
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Admin Panel</span>}
          </Link>
        )}
        
        <Link
          to="/settings"
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all ${collapsed ? 'justify-center' : ''}`}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </Link>
        <button
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all ${collapsed ? 'justify-center' : ''}`}
          aria-label="Help"
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Help</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all ${collapsed ? 'justify-center' : ''}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
};
