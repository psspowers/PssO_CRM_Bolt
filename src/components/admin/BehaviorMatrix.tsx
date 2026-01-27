import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, TrendingUp, Users, Zap } from 'lucide-react';

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
}

interface Rule {
  id: string;
  name: string;
  event_key: string;
  points: number;
  is_active: boolean;
}

interface MatrixData {
  users: User[];
  rules: Rule[];
  data: Record<string, Record<string, { count: number; watts: number }>>;
}

type Timeframe = 7 | 30 | null;

export const BehaviorMatrix: React.FC = () => {
  const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>(30);

  useEffect(() => {
    fetchMatrixData();
  }, [timeframe]);

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_behavioral_matrix', {
        timeframe_days: timeframe
      });

      if (error) throw error;

      setMatrixData(data as MatrixData);
    } catch (error) {
      console.error('Error fetching matrix data:', error);
      toast.error('Failed to load behavioral matrix');
    } finally {
      setLoading(false);
    }
  };

  const getCellData = (userId: string, eventKey: string) => {
    return matrixData?.data[userId]?.[eventKey] || { count: 0, watts: 0 };
  };

  const getCellStyle = (count: number) => {
    if (count === 0) return 'text-slate-300 bg-slate-50/30';
    if (count >= 20) return 'bg-orange-500 text-white font-bold';
    if (count >= 10) return 'bg-orange-400 text-white font-bold';
    if (count >= 5) return 'bg-orange-200 text-orange-900 font-bold';
    return 'bg-orange-50 text-orange-700 font-semibold';
  };

  const getTotalsByUser = (userId: string) => {
    const userData = matrixData?.data[userId] || {};
    return Object.values(userData).reduce(
      (acc, val) => ({
        count: acc.count + val.count,
        watts: acc.watts + val.watts
      }),
      { count: 0, watts: 0 }
    );
  };

  const getTotalsByRule = (eventKey: string) => {
    const totals = { count: 0, watts: 0 };
    if (!matrixData) return totals;

    Object.values(matrixData.data).forEach(userData => {
      const cellData = userData[eventKey];
      if (cellData) {
        totals.count += cellData.count;
        totals.watts += cellData.watts;
      }
    });
    return totals;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!matrixData || matrixData.users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">No user activity data available yet</p>
      </div>
    );
  }

  const totalActions = Object.values(matrixData.data).reduce(
    (sum, userData) =>
      sum + Object.values(userData).reduce((s, v) => s + v.count, 0),
    0
  );

  const totalWatts = Object.values(matrixData.data).reduce(
    (sum, userData) =>
      sum + Object.values(userData).reduce((s, v) => s + v.watts, 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Behavioral Matrix</h2>
              <p className="text-xs text-white/80">User Activity Heatmap</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-black">{totalActions.toLocaleString()}</div>
              <p className="text-[10px] text-white/70">Total Actions</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {totalWatts.toLocaleString()}
              </div>
              <p className="text-[10px] text-white/70">Total Watts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200">
        <span className="text-xs font-semibold text-slate-600 px-2">Timeframe:</span>
        <Button
          size="sm"
          variant={timeframe === 7 ? 'default' : 'outline'}
          onClick={() => setTimeframe(7)}
          className={timeframe === 7 ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
        >
          7 Days
        </Button>
        <Button
          size="sm"
          variant={timeframe === 30 ? 'default' : 'outline'}
          onClick={() => setTimeframe(30)}
          className={timeframe === 30 ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
        >
          30 Days
        </Button>
        <Button
          size="sm"
          variant={timeframe === null ? 'default' : 'outline'}
          onClick={() => setTimeframe(null)}
          className={timeframe === null ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
        >
          All Time
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wide border-r border-slate-200 min-w-[200px]">
                  Trigger
                </th>
                {matrixData.users.map(user => (
                  <th
                    key={user.id}
                    className="px-3 py-3 text-center border-r border-slate-200 min-w-[80px]"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-emerald-500 text-white text-xs">
                          {user.name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-[10px] font-semibold text-slate-700 truncate max-w-[70px]">
                        {user.name}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[8px] px-1 py-0 bg-slate-100 border-slate-300"
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center bg-slate-100 border-l-2 border-slate-300 min-w-[80px]">
                  <div className="text-[10px] font-bold text-slate-600">TOTAL</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {matrixData.rules.map((rule, ruleIdx) => {
                const ruleTotals = getTotalsByRule(rule.event_key);
                return (
                  <tr
                    key={rule.id}
                    className={`border-b border-slate-200 hover:bg-slate-50/50 transition-colors ${
                      ruleIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            rule.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {rule.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {rule.event_key}
                          </div>
                        </div>
                      </div>
                    </td>
                    {matrixData.users.map(user => {
                      const cellData = getCellData(user.id, rule.event_key);
                      return (
                        <td
                          key={user.id}
                          className={`px-3 py-3 text-center border-r border-slate-200 transition-all ${getCellStyle(
                            cellData.count
                          )}`}
                        >
                          <div className="text-sm font-bold">{cellData.count}</div>
                          {cellData.watts > 0 && (
                            <div className="text-[9px] opacity-75 flex items-center justify-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" />
                              {cellData.watts}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center bg-slate-100 border-l-2 border-slate-300 font-bold">
                      <div className="text-sm text-slate-800">{ruleTotals.count}</div>
                      {ruleTotals.watts > 0 && (
                        <div className="text-[9px] text-slate-600 flex items-center justify-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          {ruleTotals.watts}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                <td className="sticky left-0 z-10 bg-slate-100 px-4 py-3 border-r border-slate-200 text-xs text-slate-700 uppercase tracking-wide">
                  Total
                </td>
                {matrixData.users.map(user => {
                  const userTotals = getTotalsByUser(user.id);
                  return (
                    <td
                      key={user.id}
                      className="px-3 py-3 text-center border-r border-slate-200 bg-emerald-50"
                    >
                      <div className="text-sm font-black text-emerald-800">
                        {userTotals.count}
                      </div>
                      {userTotals.watts > 0 && (
                        <div className="text-[9px] text-emerald-700 flex items-center justify-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" />
                          {userTotals.watts}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-center bg-slate-200 border-l-2 border-slate-300">
                  <div className="text-sm font-black text-slate-900">{totalActions}</div>
                  <div className="text-[9px] text-slate-700 flex items-center justify-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    {totalWatts}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
        <span className="font-semibold">Legend:</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded bg-slate-50/30 border border-slate-200" />
          <span>0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded bg-orange-50 border border-orange-100" />
          <span>1-4</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded bg-orange-200" />
          <span>5-9</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded bg-orange-400" />
          <span>10-19</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded bg-orange-500" />
          <span>20+</span>
        </div>
      </div>
    </div>
  );
};
