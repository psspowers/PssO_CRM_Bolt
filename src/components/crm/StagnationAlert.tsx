import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Opportunity } from '../../types/crm';

interface StagnantDeal {
  id: string;
  name: string;
  stage: string;
  daysSinceUpdate: number;
  severity: 'critical' | 'warning';
}

export const StagnationAlert: React.FC = () => {
  const { opportunities } = useAppContext();
  const { user } = useAuth();

  const stagnantDeals = useMemo<StagnantDeal[]>(() => {
    if (!user?.id) return [];

    const myOpportunities = opportunities.filter(o => o.ownerId === user.id);
    const now = new Date();
    const stale: StagnantDeal[] = [];

    myOpportunities.forEach(opp => {
      const updatedAt = new Date(opp.updatedAt);
      const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      if (['Negotiation', 'Term Sheet'].includes(opp.stage) && daysSinceUpdate > 7) {
        stale.push({
          id: opp.id,
          name: opp.name,
          stage: opp.stage,
          daysSinceUpdate,
          severity: 'critical'
        });
      }

      if (['Proposal', 'Qualified'].includes(opp.stage) && daysSinceUpdate > 30) {
        stale.push({
          id: opp.id,
          name: opp.name,
          stage: opp.stage,
          daysSinceUpdate,
          severity: 'warning'
        });
      }
    });

    return stale.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
  }, [opportunities, user?.id]);

  if (stagnantDeals.length === 0) {
    return null;
  }

  const criticalCount = stagnantDeals.filter(d => d.severity === 'critical').length;
  const warningCount = stagnantDeals.filter(d => d.severity === 'warning').length;
  const top3Deals = stagnantDeals.slice(0, 3);

  return (
    <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold text-red-900 mb-1">Pipeline Health Alert</h3>

          <p className="text-sm text-red-700 mb-3">
            You have <span className="font-bold">{stagnantDeals.length} Stagnant Deal{stagnantDeals.length !== 1 ? 's' : ''}</span> requiring immediate attention
            {criticalCount > 0 && (
              <span className="ml-1">
                (<span className="font-bold">{criticalCount} Critical</span>
                {warningCount > 0 && <span>, {warningCount} Warning</span>})
              </span>
            )}
          </p>

          <div className="space-y-2">
            {top3Deals.map(deal => (
              <div
                key={deal.id}
                className="flex items-center justify-between bg-white/60 backdrop-blur rounded-lg px-3 py-2 border border-red-200/50"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">{deal.name}</p>
                  <p className="text-xs text-red-600">
                    {deal.stage} • {deal.daysSinceUpdate} days since update
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-md text-xs font-bold ${
                  deal.severity === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}>
                  {deal.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                </div>
              </div>
            ))}

            {stagnantDeals.length > 3 && (
              <p className="text-xs text-red-600 font-medium text-center pt-1">
                +{stagnantDeals.length - 3} more stagnant deal{stagnantDeals.length - 3 !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-red-200/50">
            <div className="flex items-center gap-2 text-xs text-red-700">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                <span>Critical: High value deals 7+ days stale</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span>Warning: Mid value deals 30+ days stale</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
