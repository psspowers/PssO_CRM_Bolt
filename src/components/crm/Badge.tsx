import React from 'react';
import { Award, Target, Users, Zap, Star, Trophy, Network, Radar } from 'lucide-react';

interface BadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const getBadgeStyle = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('rainmaker') || n.includes('deal closer')) return { icon: Trophy, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', iconColor: 'text-yellow-600' };
  if (n.includes('connector') || n.includes('network')) return { icon: Network, color: 'bg-blue-100 text-blue-700 border-blue-200', iconColor: 'text-blue-600' };
  if (n.includes('scout') || n.includes('early adopter')) return { icon: Radar, color: 'bg-purple-100 text-purple-700 border-purple-200', iconColor: 'text-purple-600' };
  if (n.includes('speed') || n.includes('activity star')) return { icon: Zap, color: 'bg-red-100 text-red-700 border-red-200', iconColor: 'text-red-600' };
  if (n.includes('partner')) return { icon: Star, color: 'bg-orange-100 text-orange-700 border-orange-200', iconColor: 'text-orange-600' };
  return { icon: Award, color: 'bg-slate-100 text-slate-700 border-slate-200', iconColor: 'text-slate-600' };
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

export const Badge: React.FC<BadgeProps> = ({ name, size = 'md' }) => {
  const style = getBadgeStyle(name);
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full border ${style.color}`}
      title={name}
    >
      <Icon className={`${iconSizes[size]} ${style.iconColor}`} />
      <span className="text-xs font-medium">{name}</span>
    </span>
  );
};

export const BadgeList: React.FC<{ badges: string[]; size?: 'sm' | 'md' | 'lg' }> = ({ badges, size = 'sm' }) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <Badge key={badge} name={badge} size={size} />
      ))}
    </div>
  );
};
