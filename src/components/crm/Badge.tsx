import React from 'react';
import { Award, Target, Users, Zap, Star, Trophy } from 'lucide-react';

interface BadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const badgeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'Deal Closer': { icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  'Network Builder': { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  'Activity Star': { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100' },
  'Connector': { icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  'Early Adopter': { icon: Star, color: 'text-pink-600', bg: 'bg-pink-100' },
  'Partner Champion': { icon: Trophy, color: 'text-orange-600', bg: 'bg-orange-100' },
};

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Badge: React.FC<BadgeProps> = ({ name, size = 'md' }) => {
  const config = badgeConfig[name] || { icon: Award, color: 'text-gray-600', bg: 'bg-gray-100' };
  const Icon = config.icon;

  return (
    <div
      className={`${sizeClasses[size]} ${config.bg} rounded-full flex items-center justify-center`}
      title={name}
    >
      <Icon className={`${iconSizes[size]} ${config.color}`} />
    </div>
  );
};

export const BadgeList: React.FC<{ badges: string[]; size?: 'sm' | 'md' | 'lg' }> = ({ badges, size = 'sm' }) => {
  return (
    <div className="flex items-center gap-1">
      {badges.map((badge) => (
        <Badge key={badge} name={badge} size={size} />
      ))}
    </div>
  );
};
