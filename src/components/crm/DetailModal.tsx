import React, { useState } from 'react';
import { X, ExternalLink, Network, Activity as ActivityIcon, Building2, TrendingUp } from 'lucide-react';
import { NetworkGraph } from './NetworkGraph';
import { NexusTab } from './NexusTab';
import { ActivityItem } from './ActivityItem';
import { ActivityForm } from './ActivityForm';
import { Activity, Contact, Account, Partner, Relationship, ActivityType } from '../../types/crm';
import { useAppContext } from '../../contexts/AppContext';

interface DetailModalUser { id: string; name: string; avatar: string; }

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  entityId: string;
  entityType: 'Contact' | 'Account' | 'Partner' | 'Opportunity';
  clickupLink?: string;
  children: React.ReactNode;
  velocityContent?: React.ReactNode;
  activities: Activity[];
  users: DetailModalUser[];
  contacts?: Contact[];
  accounts?: Account[];
  partners?: Partner[];
  relationships?: Relationship[];
}

type Tab = 'overview' | 'velocity' | 'nexus' | 'activity';

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen, onClose, title, subtitle, entityId, entityType, clickupLink, children,
  velocityContent, activities, users, contacts = [], accounts = [], partners = [], relationships = []
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { createActivity, updateActivity, deleteActivity, currentUser, canCreate, canEdit, canDelete } = useAppContext();

  if (!isOpen) return null;

  const entityActivities = activities.filter(a => a.relatedToId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const showNetwork = ['Contact', 'Account', 'Partner'].includes(entityType);
  const showVelocity = entityType === 'Opportunity' && velocityContent;

  const tabs: { id: Tab; label: string; icon: React.ElementType; hideLabel?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    ...(showVelocity ? [{ id: 'velocity' as Tab, label: 'Velocity', icon: TrendingUp }] : []),
    ...(showNetwork ? [{ id: 'nexus' as Tab, label: 'Nexus', icon: Network }] : []),
    { id: 'activity', label: 'Activity', icon: ActivityIcon, hideLabel: true },
  ];

  const handleCreateActivity = async (data: { type: ActivityType; summary: string; details?: string }) => {
    if (!currentUser) throw new Error('Not authenticated');
    await createActivity({
      type: data.type, summary: data.summary, details: data.details,
      relatedToId: entityId, relatedToType: entityType, createdById: currentUser.id,
    });
  };

  const handleEditActivity = async (id: string, data: { type: ActivityType; summary: string; details?: string }) => {
    await updateActivity(id, { type: data.type, summary: data.summary, details: data.details });
  };

  const handleDeleteActivity = async (id: string) => {
    await deleteActivity(id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 id="detail-modal-title" className="font-semibold text-gray-900 truncate">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {clickupLink && (
                <a href={clickupLink} target="_blank" rel="noopener noreferrer"
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  aria-label="Open in ClickUp">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-lg" aria-label="Close modal"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            {tabs.map(({ id, label, icon: Icon, hideLabel }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                <Icon className="w-4 h-4" />
                {!hideLabel && <span className="hidden sm:inline">{label}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 pb-32">
          {activeTab === 'overview' && children}
          {activeTab === 'velocity' && showVelocity && velocityContent}
          {activeTab === 'nexus' && showNetwork && (
            <NexusTab entityId={entityId} entityType={entityType as 'Contact' | 'Account' | 'Partner'} />
          )}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {canCreate() && <ActivityForm entityId={entityId} entityType={entityType} onSubmit={handleCreateActivity} />}
              {entityActivities.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">No activities yet</p>
              ) : entityActivities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} user={users.find(u => u.id === activity.createdById)}
                  canEdit={canEdit(activity.createdById)} canDelete={canDelete(activity.createdById)}
                  onEdit={handleEditActivity} onDelete={handleDeleteActivity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
