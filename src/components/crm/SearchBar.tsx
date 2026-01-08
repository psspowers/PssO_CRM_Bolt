import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  showFilter?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onFilterClick,
  showFilter = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    if (!value) {
      setIsExpanded(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isExpanded ? (
        <button
          onClick={handleExpand}
          className="lg:hidden p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          aria-label="Open search"
        >
          <Search className="w-5 h-5 text-slate-600" />
        </button>
      ) : null}

      <div className={`relative transition-all ${isExpanded ? 'flex-1' : 'hidden lg:flex lg:flex-1'}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleCollapse}
          placeholder={placeholder}
          autoFocus={isExpanded}
          className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {showFilter && onFilterClick && (
        <button
          onClick={onFilterClick}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm flex-shrink-0"
        >
          <Filter className="w-5 h-5 text-slate-600" />
        </button>
      )}
    </div>
  );
};
