import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, MessageSquare, CheckSquare, DollarSign, Users } from 'lucide-react';

interface ActivityNotificationSettings {
  newActivity: boolean;
  mentions: boolean;
  taskReminders: boolean;
  dealUpdates: boolean;
  partnerUpdates: boolean;
}

interface Props {
  settings: ActivityNotificationSettings;
  onChange: (key: keyof ActivityNotificationSettings, value: boolean) => void;
}

const notificationTypes = [
  {
    key: 'newActivity' as const,
    label: 'New Activity Alerts',
    description: 'When new activities are logged on your assigned entities',
    icon: Clock,
    color: 'text-blue-500',
  },
  {
    key: 'mentions' as const,
    label: 'Mentions & Tags',
    description: 'When someone mentions you in notes or comments',
    icon: MessageSquare,
    color: 'text-purple-500',
  },
  {
    key: 'taskReminders' as const,
    label: 'Task Reminders',
    description: 'Reminders for upcoming tasks and follow-ups',
    icon: CheckSquare,
    color: 'text-green-500',
  },
  {
    key: 'dealUpdates' as const,
    label: 'Deal Stage Changes',
    description: 'When opportunities move to different pipeline stages',
    icon: DollarSign,
    color: 'text-orange-500',
  },
  {
    key: 'partnerUpdates' as const,
    label: 'Partner Activity',
    description: 'Updates on partner-related activities and changes',
    icon: Users,
    color: 'text-teal-500',
  },
];

export const ActivityNotifications: React.FC<Props> = ({ settings, onChange }) => {
  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center gap-2 text-purple-600">
        <MessageSquare className="w-5 h-5" />
        <h3 className="font-medium">Activity-Based Notifications</h3>
      </div>
      <p className="text-sm text-gray-500">
        Choose which types of activities trigger email notifications
      </p>
      
      <div className="space-y-3 mt-4">
        {notificationTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.key}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white shadow-sm ${type.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <Label className="font-medium cursor-pointer">{type.label}</Label>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
              </div>
              <Switch
                checked={settings[type.key]}
                onCheckedChange={(v) => onChange(type.key, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
