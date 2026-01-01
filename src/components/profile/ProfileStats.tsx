import React from 'react';
import { TrendingUp, Target, Users, Briefcase, Calendar, Award } from 'lucide-react';

interface StatsProps {
  activitiesCount: number;
  opportunitiesOwned: number;
  projectsOwned: number;
  contactsManaged: number;
  thisMonthActivities: number;
  winRate: number;
}

export const ProfileStats: React.FC<StatsProps> = ({
  activitiesCount,
  opportunitiesOwned,
  projectsOwned,
  contactsManaged,
  thisMonthActivities,
  winRate,
}) => {
  const stats = [
    { label: 'Total Activities', value: activitiesCount, icon: Calendar, color: 'bg-blue-500' },
    { label: 'This Month', value: thisMonthActivities, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Opportunities', value: opportunitiesOwned, icon: Target, color: 'bg-purple-500' },
    { label: 'Projects', value: projectsOwned, icon: Briefcase, color: 'bg-orange-500' },
    { label: 'Contacts', value: contactsManaged, icon: Users, color: 'bg-pink-500' },
    { label: 'Win Rate', value: `${winRate}%`, icon: Award, color: 'bg-yellow-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
