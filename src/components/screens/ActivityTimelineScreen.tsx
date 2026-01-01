import React, { useState, useMemo } from 'react';
import { Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { TimelineFilters, EntityTypeFilter } from '../crm/TimelineFilters';
import { TimelineActivityItem } from '../crm/TimelineActivityItem';
import { useAppContext } from '../../contexts/AppContext';
import { ActivityType, Activity } from '../../types/crm';

const activityTypes: ActivityType[] = ['Note', 'Call', 'Meeting', 'WhatsApp', 'Site Visit', 'Email', 'Document', 'Photo'];

interface ActivityTimelineScreenProps {
  onNavigateToEntity?: (entityId: string, entityType: string) => void;
}

export const ActivityTimelineScreen: React.FC<ActivityTimelineScreenProps> = ({ onNavigateToEntity }) => {
  const { activities, accounts, partners, contacts, opportunities, projects, users, loading } = useAppContext();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [entityType, setEntityType] = useState<EntityTypeFilter>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const hasActiveFilters = selectedTypes.length > 0 || entityType !== 'All' || dateFrom || dateTo;

  const handleTypeToggle = (type: ActivityType) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const clearFilters = () => {
    setSelectedTypes([]); setEntityType('All'); setDateFrom(''); setDateTo('');
  };

  const getEntityName = (activity: Activity): string => {
    const { relatedToId, relatedToType } = activity;
    switch (relatedToType) {
      case 'Account': return accounts.find(a => a.id === relatedToId)?.name || 'Unknown Account';
      case 'Partner': return partners.find(p => p.id === relatedToId)?.name || 'Unknown Partner';
      case 'Contact': return contacts.find(c => c.id === relatedToId)?.fullName || 'Unknown Contact';
      case 'Opportunity': return opportunities.find(o => o.id === relatedToId)?.name || 'Unknown Opportunity';
      case 'Project': return projects.find(p => p.id === relatedToId)?.name || 'Unknown Project';
      default: return 'Unknown';
    }
  };

  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => selectedTypes.length === 0 || selectedTypes.includes(a.type))
      .filter(a => entityType === 'All' || a.relatedToType === entityType)
      .filter(a => !dateFrom || new Date(a.createdAt) >= new Date(dateFrom))
      .filter(a => !dateTo || new Date(a.createdAt) <= new Date(dateTo + 'T23:59:59'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities, selectedTypes, entityType, dateFrom, dateTo]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-600" />
          <h1 className="text-xl font-bold text-gray-900">Activity Timeline</h1>
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${hasActiveFilters ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Filters {hasActiveFilters && `(${selectedTypes.length + (entityType !== 'All' ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)})`}
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {showFilters && (
        <TimelineFilters activityTypes={activityTypes} selectedTypes={selectedTypes} onTypeToggle={handleTypeToggle}
          entityType={entityType} onEntityTypeChange={setEntityType} dateFrom={dateFrom} dateTo={dateTo}
          onDateFromChange={setDateFrom} onDateToChange={setDateTo} onClearFilters={clearFilters} hasActiveFilters={hasActiveFilters} />
      )}

      <div className="text-sm text-gray-500">{filteredActivities.length} activities</div>

      <div className="relative">
        {filteredActivities.map(activity => (
          <TimelineActivityItem key={activity.id} activity={activity} user={users.find(u => u.id === activity.createdById)}
            entityName={getEntityName(activity)} onEntityClick={onNavigateToEntity} />
        ))}
        {filteredActivities.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No activities match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};
