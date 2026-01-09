import { useState, useEffect, useRef } from 'react';
import { Activity, Newspaper, Upload, Download, Plus, ExternalLink, Network, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
};

export default function PulseScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'internal' | 'market'>('internal');
  const [showPostModal, setShowPostModal] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const feed: FeedItem[] = [];

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
        feed.push({
          id: activity.id,
          type: 'activity',
          content: activity.description || `${activity.type} activity`,
          timestamp: activity.created_at,
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
        const details = log.details || {};
        let content = log.action;

        if (details.entity_name) {
          content = `${log.action} - ${details.entity_name}`;
        }
        if (details.old_stage && details.new_stage) {
          content = `Moved ${details.entity_name} from ${details.old_stage} to ${details.new_stage}`;
        }

        feed.push({
          id: log.id,
          type: 'log',
          content,
          timestamp: log.created_at,
          user_name: log.crm_users?.full_name,
          user_avatar: log.crm_users?.avatar_url
        });
      });
    }

    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFeedItems(feed);
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
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-7 h-7 text-blue-500" />
              The Pulse
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Internal updates and market intelligence
            </p>
          </div>

          {activeTab === 'market' && (
            <div className="flex gap-2">
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
              <Button
                size="sm"
                onClick={() => setShowPostModal(true)}
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

        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'internal'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            For You
            {activeTab === 'internal' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'market'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Newspaper className="w-4 h-4 inline mr-2" />
            Market Intel
            {activeTab === 'market' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : activeTab === 'internal' ? (
          <div className="space-y-3">
            {feedItems.length === 0 ? (
              <Card className="p-8 text-center">
                <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">No activity yet</p>
              </Card>
            ) : (
              feedItems.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={item.user_avatar} />
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                        {item.user_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {item.user_name || 'System'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {item.content}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.type === 'activity' ? 'Activity' : 'Update'}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {marketNews.length === 0 ? (
              <Card className="p-8 text-center">
                <Newspaper className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">No market intelligence yet</p>
                <Button onClick={() => setShowPostModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Post First Intel
                </Button>
              </Card>
            ) : (
              marketNews.map((news) => (
                <Card
                  key={news.id}
                  className={`p-5 border-l-4 ${getImpactColor(news.impact_type)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getImpactIcon(news.impact_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {news.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={
                            news.impact_type === 'opportunity'
                              ? 'border-green-500 text-green-700 dark:text-green-400'
                              : news.impact_type === 'threat'
                              ? 'border-red-500 text-red-700 dark:text-red-400'
                              : ''
                          }
                        >
                          {news.impact_type}
                        </Badge>
                      </div>

                      {news.summary && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                          {news.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          {formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}
                        </span>
                        {news.creator_name && (
                          <>
                            <span>•</span>
                            <span>{news.creator_name}</span>
                          </>
                        )}
                        {news.account_name && (
                          <>
                            <span>•</span>
                            <span className="font-medium">{news.account_name}</span>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        {news.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(news.url!, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Source
                          </Button>
                        )}
                        {news.related_account_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <Network className="w-3 h-3 mr-1" />
                            View Nexus
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
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
