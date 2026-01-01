import React from 'react';
import { Activity } from '@/types/crm';
import { Phone, Mail, MessageSquare, FileText, Camera, MapPin, Users, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const activityIcons: Record<string, React.ElementType> = {
  Call: Phone,
  Email: Mail,
  WhatsApp: MessageSquare,
  Document: FileText,
  Photo: Camera,
  'Site Visit': MapPin,
  Meeting: Users,
  Note: StickyNote,
};

const activityColors: Record<string, string> = {
  Call: 'bg-green-100 text-green-600',
  Email: 'bg-blue-100 text-blue-600',
  WhatsApp: 'bg-emerald-100 text-emerald-600',
  Document: 'bg-purple-100 text-purple-600',
  Photo: 'bg-pink-100 text-pink-600',
  'Site Visit': 'bg-orange-100 text-orange-600',
  Meeting: 'bg-indigo-100 text-indigo-600',
  Note: 'bg-yellow-100 text-yellow-600',
};

interface Props {
  activities: Activity[];
}

export const ProfileActivities: React.FC<Props> = ({ activities }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h2>
      {activities.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No activities logged yet</p>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 10).map((activity) => {
            const Icon = activityIcons[activity.type] || StickyNote;
            const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600';
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{activity.summary}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {activity.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {activity.tags && activity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activity.tags.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
