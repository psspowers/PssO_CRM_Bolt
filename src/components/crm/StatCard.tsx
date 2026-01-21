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
      className={`group relative w-full p-5 lg:p-6 rounded-2xl border ${colorClasses[color]} text-left transition-all hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl ${iconBgClasses[color]} flex items-center justify-center shadow-sm`}>
            <Icon className="w-5 h-5 lg:w-5.5 lg:h-5.5" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
              trend >= 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">{value}</p>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>}
        </div>
      </div>
    </button>
  );
};
