import { useEffect, useState } from 'react';
import { Zap, Flame, Trophy, Target, TrendingUp, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

interface BadgeProgress {
  scout: { current: number; target: number; name: string };
  closer: { current: number; target: number; name: string };
  rainmaker: { current: number; target: number; name: string };
}

interface TopCloser {
  id: string;
  name: string;
  mw: number;
  avatar_url?: string;
  rank: number;
}

export function StatusCurrencyCard() {
  const { user } = useAuth();
  const [wattsBalance, setWattsBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mwWon, setMwWon] = useState(0);
  const [quotaPercent, setQuotaPercent] = useState(0);
  const [badgeProgress, setBadgeProgress] = useState<BadgeProgress>({
    scout: { current: 0, target: 20, name: 'Scout' },
    closer: { current: 0, target: 10, name: 'Closer' },
    rainmaker: { current: 0, target: 50, name: 'Rainmaker' }
  });
  const [topClosers, setTopClosers] = useState<TopCloser[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchStatusData();
  }, [user]);

  const fetchStatusData = async () => {
    if (!user) return;

    try {
      const wattsPromise = supabase
        .from('watts_ledger')
        .select('amount')
        .eq('user_id', user.id);

      const streakPromise = supabase.rpc('get_user_streak', { p_user_id: user.id });

      const wonDealsPromise = supabase
        .from('opportunities')
        .select('mw')
        .eq('stage', 'Won')
        .eq('assigned_to_id', user.id);

      const pulseConvertsPromise = supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('created_by_id', user.id)
        .eq('from_pulse', true);

      const closedDealsPromise = supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'Won')
        .eq('assigned_to_id', user.id);

      const topClosersPromise = supabase
        .from('opportunities')
        .select(`
          assigned_to_id,
          mw,
          crm_users!opportunities_assigned_to_id_fkey(name, avatar_url)
        `)
        .eq('stage', 'Won')
        .order('mw', { ascending: false })
        .limit(100);

      const [wattsRes, streakRes, wonDealsRes, pulseRes, closedRes, topRes] = await Promise.all([
        wattsPromise,
        streakPromise,
        wonDealsPromise,
        pulseConvertsPromise,
        closedDealsPromise,
        topClosersPromise
      ]);

      const totalWatts = (wattsRes.data || []).reduce((sum, entry) => sum + entry.amount, 0);
      setWattsBalance(totalWatts);

      setStreak(streakRes.data || 0);

      const totalMw = (wonDealsRes.data || []).reduce((sum, deal) => sum + (deal.mw || 0), 0);
      setMwWon(totalMw);

      const quota = 100;
      setQuotaPercent(Math.min(Math.round((totalMw / quota) * 100), 100));

      const pulseCount = pulseRes.count || 0;
      const closedCount = closedRes.count || 0;

      setBadgeProgress({
        scout: { current: pulseCount, target: 20, name: 'Scout' },
        closer: { current: closedCount, target: 10, name: 'Closer' },
        rainmaker: { current: totalMw, target: 50, name: 'Rainmaker' }
      });

      const aggregated = (topRes.data || []).reduce((acc, deal) => {
        const userId = deal.assigned_to_id;
        if (!userId) return acc;

        const userData = Array.isArray(deal.crm_users) ? deal.crm_users[0] : deal.crm_users;

        if (!acc[userId]) {
          acc[userId] = {
            id: userId,
            name: userData?.name || 'Unknown',
            avatar_url: userData?.avatar_url,
            mw: 0
          };
        }
        acc[userId].mw += deal.mw || 0;
        return acc;
      }, {} as Record<string, { id: string; name: string; avatar_url?: string; mw: number }>);

      const sorted = Object.values(aggregated)
        .sort((a, b) => b.mw - a.mw)
        .slice(0, 5)
        .map((closer, idx) => ({ ...closer, rank: idx + 1 }));

      setTopClosers(sorted);
    } catch (error) {
      console.error('Error fetching status data:', error);
    }
  };

  const getBadgeIcon = (badgeName: string) => {
    switch (badgeName) {
      case 'Scout':
        return <Target className="w-3 h-3" />;
      case 'Closer':
        return <Trophy className="w-3 h-3" />;
      case 'Rainmaker':
        return <Crown className="w-3 h-3" />;
      default:
        return <Trophy className="w-3 h-3" />;
    }
  };

  const getBadgeColor = (badgeName: string) => {
    switch (badgeName) {
      case 'Scout':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
      case 'Closer':
        return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
      case 'Rainmaker':
        return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
      default:
        return 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/30';
    }
  };

  const isUserInTop5 = topClosers.some(closer => closer.id === user?.id);
  const userRank = topClosers.findIndex(closer => closer.id === user?.id) + 1;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 border border-orange-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
      {/* Compact Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400 leading-none">
                {wattsBalance.toLocaleString()}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Watts
              </div>
            </div>
          </div>

          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span className="text-sm font-black text-red-600 dark:text-red-400">{streak}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {mwWon.toFixed(1)} MW
            </span>
          </div>
        </div>

        {isUserInTop5 && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <Crown className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
            <span className="text-xs font-black text-yellow-700 dark:text-yellow-300">
              #{userRank}
            </span>
          </div>
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-orange-100 dark:border-slate-700/50 pt-4">
          {/* Quota Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Personal Quota
              </span>
              <span className="font-black text-slate-900 dark:text-white">
                {quotaPercent}%
              </span>
            </div>
            <Progress value={quotaPercent} className="h-2 bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all"
                style={{ width: `${quotaPercent}%` }}
              />
            </Progress>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right">
              {mwWon.toFixed(1)} / 100 MW
            </div>
          </div>

          {/* Badge Progress */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Badge Progress
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(badgeProgress).map((badge) => {
                const progress = Math.min(Math.round((badge.current / badge.target) * 100), 100);
                const isComplete = badge.current >= badge.target;

                return (
                  <div
                    key={badge.name}
                    className={`relative p-2 rounded-lg border ${
                      isComplete
                        ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-700'
                        : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${getBadgeColor(badge.name)}`}>
                      {getBadgeIcon(badge.name)}
                    </div>
                    <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {badge.name}
                    </div>
                    <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                      {badge.current}/{badge.target}
                    </div>
                    <Progress value={progress} className="h-1 mt-1 bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isComplete
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                            : 'bg-gradient-to-r from-orange-400 to-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </Progress>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 Leaderboard */}
          {topClosers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Top Closers This Period
                </div>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div className="space-y-1">
                {topClosers.map((closer) => {
                  const isCurrentUser = closer.id === user?.id;

                  return (
                    <div
                      key={closer.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                        isCurrentUser
                          ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700'
                          : 'bg-white/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        closer.rank === 1
                          ? 'bg-yellow-500 text-white'
                          : closer.rank === 2
                            ? 'bg-slate-400 text-white'
                            : closer.rank === 3
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}>
                        {closer.rank}
                      </div>

                      <Avatar className="w-6 h-6">
                        <AvatarImage src={closer.avatar_url} />
                        <AvatarFallback className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {closer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <span className={`flex-1 text-xs font-semibold truncate ${
                        isCurrentUser
                          ? 'text-orange-900 dark:text-orange-100'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {closer.name}
                      </span>

                      <span className={`text-xs font-black ${
                        isCurrentUser
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {closer.mw.toFixed(1)} MW
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
