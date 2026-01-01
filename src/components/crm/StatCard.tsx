import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ElementType;
  color: 'emerald' | 'amber' | 'blue' | 'purple' | 'orange';
  onClick?: () => void;
}

const colorClasses = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:border-emerald-300 hover:shadow-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300 hover:shadow-amber-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300 hover:shadow-blue-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-300 hover:shadow-purple-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:border-orange-300 hover:shadow-orange-100',
};

const iconBgClasses = {
  emerald: 'bg-emerald-100',
  amber: 'bg-amber-100',
  blue: 'bg-blue-100',
  purple: 'bg-purple-100',
  orange: 'bg-orange-100',
};

export const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, trend, icon: Icon, color, onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 lg:p-6 rounded-xl lg:rounded-2xl border ${colorClasses[color]} text-left transition-all hover:shadow-lg active:scale-95`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl ${iconBgClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3 lg:mt-4">
        <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm lg:text-base font-medium mt-1">{title}</p>
        {subtitle && <p className="text-xs lg:text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </button>
  );
};
