import { useState, useEffect, useRef } from 'react';
import { Activity, Newspaper, Upload, Download, Plus, ExternalLink, Network, CheckCircle2, TrendingUp, TrendingDown, Minus, Phone, Users, FileText, Mail, ArrowRight, ArrowLeft, Settings, Zap } from 'lucide-react';
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

const ANALYST_PROMPT_TEMPLATE = `**Role & Context:**
You are a Senior Energy Investment Analyst specializing in the **Southeast Asian Renewable Energy** market, with deep expertise in Battery Energy Storage Systems (BESS), solar, wind, and grid integration projects. Your primary responsibility is to conduct comprehensive market intelligence research on target companies to assess their potential as investment opportunities, strategic partners, or acquisition targets.

**Your Mission:**
Research each company on today's target list and produce actionable intelligence that helps our investment team make informed decisions about market opportunities worth $50M-$500M+ in renewable energy infrastructure.

**Research Focus Areas:**

1. **Business Overview & Strategic Position**
   - Core business model and revenue streams
   - Market position in renewable energy sector
   - Geographic footprint and operational scale
   - Key competitive advantages or unique capabilities

2. **Financial Health & Growth Trajectory**
   - Recent financial performance and trends
   - Investment capacity and capital structure
   - Growth indicators and expansion plans
   - Notable recent transactions or funding rounds

3. **Renewable Energy Portfolio & Capabilities**
   - Existing renewable energy assets and projects
   - Technical capabilities in BESS, solar, or wind
   - Project pipeline and development capacity
   - Innovation initiatives and technology partnerships

4. **Investment Readiness & Strategic Fit**
   - Appetite for renewable energy investments
   - Partnership or M&A activity
   - Alignment with ESG and sustainability goals
   - Regulatory compliance and certifications

5. **Market Intelligence & Risk Factors**
   - Recent news, press releases, or announcements
   - Leadership changes or strategic shifts
   - Regulatory challenges or opportunities
   - Competitive threats or market disruptions

**Research Guidelines:**
- Prioritize recent information (last 12-18 months)
- Focus on publicly available sources: company websites, press releases, industry publications, financial filings, news articles
- Verify information from multiple sources when possible
- Identify data gaps and flag them clearly
- Look for signals of investment readiness and strategic intent

**The Strict Output Format (CSV):**
Return your findings ONLY in this exact CSV format with these columns:

Company Name,Headline,Summary,Impact,URL

**Column Definitions:**
- **Company Name**: Exact name as provided in the target list
- **Headline**: One compelling insight (8-12 words max) that captures the most important finding
- **Summary**: Brief intelligence summary (2-3 sentences, 150 words max) covering key findings from research focus areas
- **Impact**: Must be EXACTLY one of these three values:
  - "opportunity" = Strong investment potential, positive signals, strategic alignment
  - "threat" = Competitive threat, market risk, or negative indicators
  - "neutral" = Noteworthy but no clear directional signal
- **URL**: Primary source URL for verification (use most authoritative source)

**Example Output:**
ABC Energy Corp,Announces $200M BESS expansion across Thailand,"ABC Energy announced plans to deploy 500MW of battery storage by 2025, partnering with leading EPC firms. Strong balance sheet with $300M credit facility. Active in solar+storage integration.",opportunity,https://abcenergy.com/news/2024-expansion
XYZ Manufacturing,Delays renewable transition amid financial restructuring,"Company postponed its 100MW solar project due to liquidity constraints. Undergoing debt restructuring with creditors. Renewable energy strategy on hold until Q3 2025.",threat,https://industry-journal.com/xyz-delays

**Critical Requirements:**
- Research ALL companies on the target list
- Do NOT skip companies even if information is limited
- If you find minimal information, still create an entry with "neutral" impact and note data limitations in Summary
- Ensure CSV is properly formatted with commas separating fields and quotes around fields containing commas
- Include header row exactly as specified
- Do NOT add any commentary, explanations, or text outside the CSV format

**THE TARGET LIST FOR TODAY:**
`;

const ANALYST_INSTRUCTIONS_ADDENDUM = `

**After copying this prompt:**
1. Go to ChatGPT (GPT-4 or higher)
2. Paste this entire prompt
3. Wait for the CSV output
4. Copy the CSV results
5. Return to Pulse > Market Intel tab
6. Click the Settings icon (gear) > Import CSV
7. Upload the CSV file or paste the results

The system will automatically parse and import all intelligence items.`;

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
  const [showAnalystModal, setShowAnalystModal] = useState(false);
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
        crm_users!activities_created_by_fkey(name, avatar)
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
          user_name: activity.crm_users?.name,
          user_avatar: activity.crm_users?.avatar
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
        crm_users!admin_activity_logs_user_id_fkey(name, avatar)
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
          user_name: log.crm_users?.name,
          user_avatar: log.crm_users?.avatar
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
        crm_users!market_news_created_by_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedNews = data.map((item: any) => ({
        ...item,
        account_name: item.accounts?.name,
        creator_name: item.crm_users?.name
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
        let skippedCount = 0;
        let linkedCount = 0;
        const errorDetails: string[] = [];

        if (rows.length === 0) {
          toast.error('CSV file is empty or has no valid rows.');
          return;
        }

        const normalize = (str: string) =>
          str
            .toLowerCase()
            .replace(/co\.?,?|ltd\.?|plc\.?|pcl\.?|group|holdings/g, '')
            .replace(/[^a-z0-9]/g, '');

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNumber = i + 2;

          try {
            const companyName = row['Company Name'] || row['company name'] || row['Company'] || row['Account Name'];
            const title = row['Headline'] || row['headline'] || row['Title'] || row['title'];
            const summary = row['Summary'] || row['summary'] || row['Summary (Analysis)'] || row['Description'];
            const impactRaw = (row['Impact'] || row['impact'] || row['Type'] || '').toLowerCase().trim();
            const url = row['URL'] || row['url'] || row['Link'] || row['Source'];

            if (!title || title.trim() === '') {
              skippedCount++;
              if (errorDetails.length < 10) {
                errorDetails.push(`Row ${rowNumber}: Missing headline/title`);
              }
              continue;
            }

            let accountId = null;
            if (companyName && companyName.trim() !== '') {
              const csvName = companyName.trim();

              const matchedAccount = accounts.find(a => {
                const dbName = normalize(a.name);
                const importName = normalize(csvName);
                return dbName.includes(importName) || importName.includes(dbName);
              });

              if (matchedAccount) {
                accountId = matchedAccount.id;
                linkedCount++;
              }
            }

            let impactType: 'opportunity' | 'threat' | 'neutral' = 'neutral';
            if (impactRaw.includes('opp')) {
              impactType = 'opportunity';
            } else if (impactRaw.includes('threat') || impactRaw.includes('risk')) {
              impactType = 'threat';
            } else if (['opportunity', 'threat', 'neutral'].includes(impactRaw)) {
              impactType = impactRaw as 'opportunity' | 'threat' | 'neutral';
            }

            const { error } = await supabase.from('market_news').insert({
              title: title.trim(),
              summary: summary && summary.trim() !== '' ? summary.trim() : null,
              url: url && url.trim() !== '' ? url.trim() : null,
              impact_type: impactType,
              related_account_id: accountId,
              created_by: user?.id,
              source_type: 'Analyst'
            });

            if (error) throw error;
            successCount++;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`Failed to import row ${rowNumber}:`, row, err);
            failCount++;

            if (errorDetails.length < 10) {
              const titlePreview = row['Headline'] || row['Title'] || row['headline'] || 'Unknown';
              errorDetails.push(`Row ${rowNumber} (${titlePreview.substring(0, 30)}...): ${errorMsg}`);
            }
          }
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        if (successCount === 0 && failCount === 0 && skippedCount > 0) {
          const errorSummary = errorDetails.length > 0
            ? '\n\n' + errorDetails.join('\n')
            : '';
          toast.error('Import Failed. Please check CSV headers match: Company Name, Headline, Summary, Impact, URL.' + errorSummary, {
            duration: 10000
          });
          return;
        }

        if (successCount === 0 && failCount > 0) {
          const errorSummary = errorDetails.length > 0
            ? '\n\nErrors:\n' + errorDetails.join('\n') + (failCount > 10 ? `\n...and ${failCount - 10} more errors` : '')
            : '';

          alert(`Import Failed\n\n${failCount} rows had errors.${errorSummary}\n\nCheck browser console (F12) for full details.`);
          return;
        }

        if (failCount > 0 && successCount > 0) {
          const errorSummary = errorDetails.length > 0
            ? '\n\nSample Errors:\n' + errorDetails.join('\n') + (failCount > 10 ? `\n...and ${failCount - 10} more errors` : '')
            : '';

          alert(`Import Partially Complete\n\nSuccess: ${successCount} rows\nFailed: ${failCount} rows\nSkipped: ${skippedCount} rows${errorSummary}\n\nCheck browser console (F12) for full details.`);
        }

        const linkInfo = linkedCount > 0 ? ` ${linkedCount} linked to Accounts.` : '';
        const message = `Imported ${successCount} news items.${linkInfo}${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`;
        toast.success(message, { duration: 5000 });
        loadMarketNews();
      },
      error: (error) => {
        toast.error('Failed to parse CSV file: ' + error.message);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
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

  const handleGenerateDailyMission = async () => {
    try {
      const { data, error } = await supabase.rpc('fetch_daily_scan_targets', { batch_size: 30 });

      if (error) {
        toast.error('Failed to fetch targets: ' + error.message);
        return;
      }

      if (!data || data.length === 0) {
        toast.error('No accounts found for scanning');
        return;
      }

      const listText = data.map((item: { name: string }, index: number) => `${index + 1}. ${item.name}`).join('\n');
      const fullPrompt = ANALYST_PROMPT_TEMPLATE + '\n' + listText + ANALYST_INSTRUCTIONS_ADDENDUM;

      await navigator.clipboard.writeText(fullPrompt);

      toast.success(`Mission Generated! ${data.length} targets copied to clipboard. Paste into ChatGPT.`, {
        duration: 5000
      });

      setShowAnalystModal(false);
    } catch (err) {
      toast.error('Failed to generate mission');
      console.error(err);
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            The Pulse
          </h1>

          {activeTab === 'market' && showAnalystConsole && (
            <button
              onClick={() => setShowAnalystModal(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex w-full">
          <button
            onClick={() => setActiveTab('internal')}
            className="flex-1 py-3 text-sm font-bold text-center relative hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <span className={activeTab === 'internal' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>
              For You
            </span>
            {activeTab === 'internal' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full mx-12" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className="flex-1 py-3 text-sm font-bold text-center relative hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <span className={activeTab === 'market' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}>
              Market Intel
            </span>
            {activeTab === 'market' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full mx-12" />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : activeTab === 'internal' ? (
        <>
          {feedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">No activity yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your team's momentum will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {feedItems.map((item) => (
                <div key={item.id} className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-slate-100 dark:ring-slate-700">
                      <AvatarImage src={item.user_avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-sm font-semibold">
                        {item.user_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.user_name || 'System'}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">·</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }).replace('about ', '')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full ${item.iconBgColor}`}>
                          <div className={item.iconColor}>
                            {item.icon}
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
                          {item.type === 'activity' ? 'Activity' : 'Update'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {marketNews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Newspaper className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">No market intelligence yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start tracking market opportunities and threats</p>
              <Button
                onClick={() => setShowPostModal(true)}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post First Intel
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {marketNews.map((news) => {
                const impactColor = news.impact_type === 'opportunity'
                  ? 'bg-green-50 dark:bg-green-950/20'
                  : news.impact_type === 'threat'
                  ? 'bg-red-50 dark:bg-red-950/20'
                  : 'bg-white dark:bg-slate-800';

                return (
                  <div
                    key={news.id}
                    className={`px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${impactColor}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getImpactIcon(news.impact_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {news.creator_name && (
                            <>
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {news.creator_name}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 text-sm">·</span>
                            </>
                          )}
                          <span className="text-slate-500 dark:text-slate-400 text-sm">
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

                        {news.summary && (
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">
                            {news.summary}
                          </p>
                        )}

                        {news.account_name && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                            Related: <span className="font-semibold">{news.account_name}</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {news.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(news.url!, '_blank')}
                              className="text-xs h-7 px-2"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Source
                            </Button>
                          )}
                          {news.related_account_id && (
                            <button
                              className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-1 rounded-md hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
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
              })}
            </div>
          )}
        </>
      )}

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

      <Dialog open={showAnalystModal} onOpenChange={setShowAnalystModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Analyst Console</DialogTitle>
            <DialogDescription>
              Smart rotation automatically selects the 30 companies that need scanning
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              className="w-full justify-center h-auto py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
              onClick={handleGenerateDailyMission}
            >
              <Zap className="w-6 h-6 mr-3" />
              <div className="text-left">
                <div className="text-lg font-bold">Generate Daily Mission</div>
                <div className="text-xs text-orange-100">Auto-select 30 targets + copy mega-prompt</div>
              </div>
            </Button>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
                Additional Tools
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    handleDownloadTemplate();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowAnalystModal(false);
                    setShowPostModal(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAnalystModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportCSV}
      />
    </div>
  );
}
