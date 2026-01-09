import { useState, useEffect, useRef } from 'react';
import { Activity, Newspaper, Upload, Download, Plus, ExternalLink, Network, CheckCircle2, TrendingUp, TrendingDown, Minus, Phone, Users, FileText, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Papa from 'papaparse';

interface MarketNews {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  impact_type: 'opportunity' | 'threat' | 'neutral';
  source_type: string;
  related_account_id: string | null;
  created_by: string | null;
  created_at: string;
  account_name?: string;
  creator_name?: string;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

interface AdminLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_name?: string;
}

type FeedItem = {
  id: string;
  type: 'activity' | 'log';
  content: string;
  timestamp: string;
  user_name?: string;
  user_avatar?: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBgColor: string;
};

const formatFeedItem = (rawItem: any): FeedItem | null => {
  if (rawItem.source === 'activity') {
    const activityType = rawItem.type?.toLowerCase();
    const description = rawItem.description || '';

    switch (activityType) {
      case 'call':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Logged a call${description ? `: ${description}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Phone className="w-4 h-4" />,
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/50'
        };

      case 'meeting':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Logged a meeting${description ? `: ${description}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Users className="w-4 h-4" />,
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/50'
        };

      case 'note':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Added a note${description ? `: ${description}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <FileText className="w-4 h-4" />,
          iconColor: 'text-slate-600',
          iconBgColor: 'bg-slate-100 dark:bg-slate-800'
        };

      case 'email':
        const direction = description.toLowerCase().includes('sent') ? 'Sent' : 'Received';
        return {
          id: rawItem.id,
          type: 'activity',
          content: `${direction} email${description ? `: ${description}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: direction === 'Sent' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />,
          iconColor: 'text-purple-600',
          iconBgColor: 'bg-purple-100 dark:bg-purple-900/50'
        };

      case 'task':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Task${description ? `: ${description}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <CheckCircle2 className="w-4 h-4" />,
          iconColor: 'text-orange-600',
          iconBgColor: 'bg-orange-100 dark:bg-orange-900/50'
        };

      default:
        return {
          id: rawItem.id,
          type: 'activity',
          content: description || `${activityType} activity`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Activity className="w-4 h-4" />,
          iconColor: 'text-slate-600',
          iconBgColor: 'bg-slate-100 dark:bg-slate-800'
        };
    }
  }

  if (rawItem.source === 'log') {
    const details = rawItem.details || {};
    const action = rawItem.action;

    if (details.old_stage && details.new_stage) {
      return {
        id: rawItem.id,
        type: 'log',
        content: `Moved ${details.entity_name || 'deal'} to ${details.new_stage}`,
        timestamp: rawItem.created_at,
        user_name: rawItem.user_name,
        user_avatar: rawItem.user_avatar,
        icon: <TrendingUp className="w-4 h-4" />,
        iconColor: 'text-green-600',
        iconBgColor: 'bg-green-100 dark:bg-green-900/50'
      };
    }

    if (action === 'update' || action === 'Update') {
      const changes = details.changes || {};

      if (changes.value || details.new_value) {
        const newValue = changes.value || details.new_value;
        return {
          id: rawItem.id,
          type: 'log',
          content: `Updated value to ${newValue}${details.entity_name ? ` for ${details.entity_name}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <TrendingUp className="w-4 h-4" />,
          iconColor: 'text-green-600',
          iconBgColor: 'bg-green-100 dark:bg-green-900/50'
        };
      }

      if (changes.target_capacity || details.target_capacity) {
        const capacity = changes.target_capacity || details.target_capacity;
        return {
          id: rawItem.id,
          type: 'log',
          content: `Updated capacity to ${capacity} MW${details.entity_name ? ` for ${details.entity_name}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Activity className="w-4 h-4" />,
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/50'
        };
      }

      if (changes.owner_id || details.owner_change) {
        return {
          id: rawItem.id,
          type: 'log',
          content: `Transferred ownership${details.entity_name ? ` of ${details.entity_name}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Users className="w-4 h-4" />,
          iconColor: 'text-purple-600',
          iconBgColor: 'bg-purple-100 dark:bg-purple-900/50'
        };
      }

      return null;
    }

    if (action.toLowerCase().includes('create')) {
      return {
        id: rawItem.id,
        type: 'log',
        content: `Created ${details.entity_name || details.entity_type || 'item'}`,
        timestamp: rawItem.created_at,
        user_name: rawItem.user_name,
        user_avatar: rawItem.user_avatar,
        icon: <Plus className="w-4 h-4" />,
        iconColor: 'text-green-600',
        iconBgColor: 'bg-green-100 dark:bg-green-900/50'
      };
    }

    if (details.entity_name) {
      return {
        id: rawItem.id,
        type: 'log',
        content: `${action} - ${details.entity_name}`,
        timestamp: rawItem.created_at,
        user_name: rawItem.user_name,
        user_avatar: rawItem.user_avatar,
        icon: <Activity className="w-4 h-4" />,
        iconColor: 'text-slate-600',
        iconBgColor: 'bg-slate-100 dark:bg-slate-800'
      };
    }

    return null;
  }

  return null;
};

export default function PulseScreen() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'internal' | 'market'>('internal');
  const [showPostModal, setShowPostModal] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAnalyst = profile?.badges?.includes('Analyst');
  const showAnalystConsole = isSuperAdmin || isAnalyst;

  const [newPost, setNewPost] = useState({
    title: '',
    summary: '',
    url: '',
    impact_type: 'neutral' as 'opportunity' | 'threat' | 'neutral',
    related_account_id: ''
  });

  useEffect(() => {
    loadData();
    loadAccounts();
  }, [activeTab]);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name');
    if (data) setAccounts(data);
  };

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'internal') {
      await loadInternalFeed();
    } else {
      await loadMarketNews();
    }
    setLoading(false);
  };

  const loadInternalFeed = async () => {
    const rawFeed: any[] = [];

    const { data: activities } = await supabase
      .from('activities')
      .select(`
        id,
        type,
        description,
        created_at,
        created_by,
        crm_users!activities_created_by_fkey(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activities) {
      activities.forEach((activity: any) => {
        rawFeed.push({
          id: activity.id,
          source: 'activity',
          type: activity.type,
          description: activity.description,
          created_at: activity.created_at,
          user_name: activity.crm_users?.full_name,
          user_avatar: activity.crm_users?.avatar_url
        });
      });
    }

    const { data: logs } = await supabase
      .from('admin_activity_logs')
      .select(`
        id,
        action,
        details,
        created_at,
        user_id,
        crm_users!admin_activity_logs_user_id_fkey(full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (logs) {
      logs.forEach((log: any) => {
        rawFeed.push({
          id: log.id,
          source: 'log',
          action: log.action,
          details: log.details,
          created_at: log.created_at,
          user_name: log.crm_users?.full_name,
          user_avatar: log.crm_users?.avatar_url
        });
      });
    }

    const formattedFeed = rawFeed
      .map(item => formatFeedItem(item))
      .filter((item): item is FeedItem => item !== null);

    formattedFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFeedItems(formattedFeed);
  };

  const loadMarketNews = async () => {
    const { data, error } = await supabase
      .from('market_news')
      .select(`
        *,
        accounts(name),
        crm_users!market_news_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedNews = data.map((item: any) => ({
        ...item,
        account_name: item.accounts?.name,
        creator_name: item.crm_users?.full_name
      }));
      setMarketNews(formattedNews);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = Papa.unparse({
      fields: ['Company Name', 'Headline', 'Summary', 'Impact', 'URL'],
      data: [
        ['ABC Manufacturing', 'Expansion into renewable energy', 'Company announced $50M investment in solar', 'opportunity', 'https://example.com/news'],
        ['XYZ Corp', 'Factory closure due to regulations', 'Government imposed new environmental standards', 'threat', 'https://example.com/news2'],
      ]
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-intel-template-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let failCount = 0;

        for (const row of rows) {
          try {
            const companyName = row['Company Name'] || row['company name'] || row['Company'];
            let accountId = null;

            if (companyName) {
              const { data: matchedAccount } = await supabase
                .from('accounts')
                .select('id, name')
                .ilike('name', `%${companyName}%`)
                .limit(1)
                .single();

              if (matchedAccount) {
                accountId = matchedAccount.id;
              }
            }

            const impactRaw = (row['Impact'] || row['impact'] || 'neutral').toLowerCase();
            const impactType = ['opportunity', 'threat', 'neutral'].includes(impactRaw)
              ? impactRaw
              : 'neutral';

            const { error } = await supabase.from('market_news').insert({
              title: row['Headline'] || row['headline'] || row['Title'] || 'Untitled',
              summary: row['Summary'] || row['summary'] || null,
              url: row['URL'] || row['url'] || null,
              impact_type: impactType,
              related_account_id: accountId,
              created_by: user?.id,
              source_type: 'Analyst'
            });

            if (error) throw error;
            successCount++;
          } catch (err) {
            console.error('Failed to import row:', row, err);
            failCount++;
          }
        }

        toast.success(`Imported ${successCount} news items${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        loadMarketNews();
      },
      error: (error) => {
        toast.error('Failed to parse CSV: ' + error.message);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePostIntel = async () => {
    if (!newPost.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const { error } = await supabase.from('market_news').insert({
      ...newPost,
      created_by: user?.id,
      source_type: 'Manual'
    });

    if (error) {
      toast.error('Failed to post intel');
      return;
    }

    toast.success('Intel posted');
    setShowPostModal(false);
    setNewPost({
      title: '',
      summary: '',
      url: '',
      impact_type: 'neutral',
      related_account_id: ''
    });
    loadMarketNews();
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'opportunity': return 'border-green-500 bg-green-500/5';
      case 'threat': return 'border-red-500 bg-red-500/5';
      default: return 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'threat': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 min-h-screen bg-gradient-to-b from-slate-50 to-orange-50/30 dark:from-slate-900 dark:to-slate-900">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-7 h-7 text-orange-500" />
                The Pulse
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Internal updates and market intelligence
              </p>
            </div>

            {activeTab === 'market' && (
              <div className="flex gap-2">
                {showAnalystConsole && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  onClick={() => setShowPostModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post Intel
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-full flex gap-1 w-fit mx-auto">
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-6 py-2.5 font-medium transition-all rounded-full flex items-center gap-2 ${
              activeTab === 'internal'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            For You
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`px-6 py-2.5 font-medium transition-all rounded-full flex items-center gap-2 ${
              activeTab === 'market'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Market Intel
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : activeTab === 'internal' ? (
          <div className="relative">
            {feedItems.length === 0 ? (
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
                <Activity className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No activity yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your team's momentum will appear here</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-[46px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-orange-200 via-slate-200 to-slate-200 dark:from-orange-900/50 dark:via-slate-700 dark:to-slate-700" />

                <div className="space-y-6">
                  {feedItems.map((item, index) => (
                    <div key={item.id} className="relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 w-20 text-right pr-3 font-medium">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }).replace('about ', '')}
                        </div>
                      </div>

                      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${item.iconBgColor} ${item.iconColor} z-10 ring-4 ring-white dark:ring-slate-900 shadow-sm`}>
                        {item.icon}
                      </div>

                      <div className="flex-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-xl p-4 hover:shadow-lg hover:scale-[1.01] transition-all">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-9 h-9 ring-2 ring-slate-100 dark:ring-slate-700">
                            <AvatarImage src={item.user_avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold">
                              {item.user_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                {item.user_name || 'System'}
                              </span>
                              <Badge variant="outline" className="text-xs border-slate-300 dark:border-slate-600">
                                {item.type === 'activity' ? 'Activity' : 'Update'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {item.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {marketNews.length === 0 ? (
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
                <Newspaper className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No market intelligence yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start tracking market opportunities and threats</p>
                <Button
                  onClick={() => setShowPostModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post First Intel
                </Button>
              </div>
            ) : (
              marketNews.map((news) => {
                const borderColor = news.impact_type === 'opportunity'
                  ? 'border-l-4 border-emerald-400'
                  : news.impact_type === 'threat'
                  ? 'border-l-4 border-red-400'
                  : 'border-l-4 border-slate-300 dark:border-slate-600';

                return (
                  <div
                    key={news.id}
                    className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${borderColor}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getImpactIcon(news.impact_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                {formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  news.impact_type === 'opportunity'
                                    ? 'border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                                    : news.impact_type === 'threat'
                                    ? 'border-red-400 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
                                    : 'border-slate-300 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {news.impact_type}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2 leading-tight">
                              {news.title}
                            </h3>
                          </div>
                        </div>

                        {news.summary && (
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-2 leading-relaxed">
                            {news.summary}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                          {news.creator_name && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">{news.creator_name}</span>
                            </span>
                          )}
                          {news.account_name && (
                            <>
                              {news.creator_name && <span>•</span>}
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{news.account_name}</span>
                            </>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {news.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(news.url!, '_blank')}
                              className="text-xs h-8"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Source
                            </Button>
                          )}
                          {news.related_account_id && (
                            <button
                              className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
                            >
                              <Network className="w-3 h-3" />
                              Map Nexus
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Market Intelligence</DialogTitle>
            <DialogDescription>
              Share important market news and insights with the team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Headline</label>
              <Input
                placeholder="e.g., Major renewable energy expansion announced"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Summary</label>
              <Textarea
                placeholder="Provide context and key details..."
                rows={4}
                value={newPost.summary}
                onChange={(e) => setNewPost({ ...newPost, summary: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Impact Type</label>
                <Select
                  value={newPost.impact_type}
                  onValueChange={(value: any) => setNewPost({ ...newPost, impact_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="threat">Threat</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Related Account</label>
                <Select
                  value={newPost.related_account_id}
                  onValueChange={(value) => setNewPost({ ...newPost, related_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Source URL (Optional)</label>
              <Input
                placeholder="https://..."
                value={newPost.url}
                onChange={(e) => setNewPost({ ...newPost, url: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePostIntel}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Post Intel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
