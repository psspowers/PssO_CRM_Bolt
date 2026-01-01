import React from 'react';
import { Calendar, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { Opportunity, Account } from '../../types/crm';

interface UpcomingActionsProps {
  opportunities: Opportunity[];
  accounts: Account[];
  onOpportunityClick: (id: string) => void;
}

export const UpcomingActions: React.FC<UpcomingActionsProps> = ({ opportunities, accounts, onOpportunityClick }) => {
  const now = new Date();
  const upcoming = opportunities
    .filter(o => o.nextActionDate && o.nextAction)
    .map(o => ({
      ...o,
      account: accounts.find(a => a.id === o.linkedAccountId),
      daysUntil: Math.ceil((new Date(o.nextActionDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter(o => o.daysUntil >= -7 && o.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'bg-red-50 border-red-200 text-red-700';
    if (days <= 2) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-slate-100 border-slate-200 text-slate-600';
  };

  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Upcoming Actions</h3>
          <p className="text-sm text-slate-500">Next 14 days</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {upcoming.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500">No upcoming actions</p>
          </div>
        ) : (
          upcoming.map(item => (
            <button 
              key={item.id} 
              onClick={() => onOpportunityClick(item.id)}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group"
            >
              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${getUrgencyColor(item.daysUntil)}`}>
                {item.daysUntil < 0 ? (
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue</span>
                ) : item.daysUntil === 0 ? 'Today' : item.daysUntil === 1 ? 'Tomorrow' : `${item.daysUntil} days`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{item.nextAction}</p>
                <p className="text-xs text-slate-500 mt-1">{item.account?.name} • {formatDate(item.nextActionDate!)}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 group-hover:text-orange-500 transition-colors" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
