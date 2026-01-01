import React from 'react';
import { Phone, MessageSquare, Users, MapPin, Mail, FileText, StickyNote, Image, ExternalLink, Building2, Target, Briefcase, FolderKanban } from 'lucide-react';
import { Activity, ActivityType, User } from '../../types/crm';

interface TimelineActivityItemProps {
  activity: Activity;
  user?: User;
  entityName?: string;
  onEntityClick?: (entityId: string, entityType: string) => void;
}

const typeIcons: Record<ActivityType, React.ElementType> = {
  Note: StickyNote, Call: Phone, Meeting: Users, WhatsApp: MessageSquare,
  'Site Visit': MapPin, Email: Mail, Document: FileText, Photo: Image,
};

const typeColors: Record<ActivityType, { bg: string; icon: string; border: string }> = {
  Note: { bg: 'bg-gray-100', icon: 'text-gray-600', border: 'border-gray-300' },
  Call: { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-300' },
  Meeting: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-300' },
  WhatsApp: { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-green-300' },
  'Site Visit': { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-300' },
  Email: { bg: 'bg-red-100', icon: 'text-red-600', border: 'border-red-300' },
  Document: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-300' },
  Photo: { bg: 'bg-pink-100', icon: 'text-pink-600', border: 'border-pink-300' },
};

const entityIcons: Record<string, React.ElementType> = {
  Partner: Users, Account: Building2, Contact: Briefcase, Opportunity: Target, Project: FolderKanban,
};

export const TimelineActivityItem: React.FC<TimelineActivityItemProps> = ({ activity, user, entityName, onEntityClick }) => {
  const Icon = typeIcons[activity.type];
  const colors = typeColors[activity.type];
  const EntityIcon = entityIcons[activity.relatedToType];
  const date = new Date(activity.createdAt);

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      <div className={`absolute left-0 top-0 w-6 h-6 rounded-full ${colors.bg} flex items-center justify-center ring-4 ring-white`}>
        <Icon className={`w-3 h-3 ${colors.icon}`} />
      </div>
      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200 last:hidden" />
      
      <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          {user?.avatar && (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.icon} font-medium`}>
                {activity.type}
              </span>
              <span className="text-xs text-gray-400">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <h4 className="font-medium text-gray-900 text-sm mb-1">{activity.summary}</h4>
            {activity.details && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{activity.details}</p>}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {user && <span className="text-xs text-gray-500">{user.name}</span>}
                {activity.tags?.slice(0, 2).map(tag => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">#{tag}</span>
                ))}
              </div>
              {entityName && (
                <button onClick={() => onEntityClick?.(activity.relatedToId, activity.relatedToType)}
                  className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700">
                  <EntityIcon className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{entityName}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
