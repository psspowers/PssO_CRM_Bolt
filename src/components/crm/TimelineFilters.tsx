import React from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import { ActivityType } from '../../types/crm';

export type EntityTypeFilter = 'All' | 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project';

interface TimelineFiltersProps {
  activityTypes: ActivityType[];
  selectedTypes: ActivityType[];
  onTypeToggle: (type: ActivityType) => void;
  entityType: EntityTypeFilter;
  onEntityTypeChange: (type: EntityTypeFilter) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const typeColors: Record<ActivityType, string> = {
  Note: 'bg-gray-100 text-gray-700 border-gray-300',
  Call: 'bg-blue-100 text-blue-700 border-blue-300',
  Meeting: 'bg-purple-100 text-purple-700 border-purple-300',
  WhatsApp: 'bg-green-100 text-green-700 border-green-300',
  'Site Visit': 'bg-amber-100 text-amber-700 border-amber-300',
  Email: 'bg-red-100 text-red-700 border-red-300',
  Document: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  Photo: 'bg-pink-100 text-pink-700 border-pink-300',
};

const entityTypes: EntityTypeFilter[] = ['All', 'Partner', 'Account', 'Contact', 'Opportunity', 'Project'];

export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  activityTypes, selectedTypes, onTypeToggle, entityType, onEntityTypeChange,
  dateFrom, dateTo, onDateFromChange, onDateToChange, onClearFilters, hasActiveFilters
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter className="w-4 h-4" />
          <span className="font-medium text-sm">Filters</span>
        </div>
        {hasActiveFilters && (
          <button onClick={onClearFilters} className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block">Activity Type</label>
        <div className="flex flex-wrap gap-1.5">
          {activityTypes.map(type => (
            <button key={type} onClick={() => onTypeToggle(type)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                selectedTypes.includes(type) ? typeColors[type] + ' border-2' : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block">Entity Type</label>
        <select value={entityType} onChange={e => onEntityTypeChange(e.target.value as EntityTypeFilter)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          {entityTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />From</label>
          <input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />To</label>
          <input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
};
