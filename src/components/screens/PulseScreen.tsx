import { useState, useEffect, useRef } from 'react';
import { Activity, Newspaper, Upload, Download, Plus, ExternalLink, Network, CircleCheck as CheckCircle2, TrendingUp, TrendingDown, Minus, Phone, Users, FileText, Mail, ArrowRight, ArrowLeft, Settings, Zap, MapPin, Star, BrainCircuit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QuickAddModal } from '../crm/QuickAddModal';
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

Company Name,Headline,Summary,Impact,URL,Date

**Column Definitions:**
- **Company Name**: Exact name as provided in the target list
- **Headline**: One compelling insight (8-12 words max) that captures the most important finding
- **Summary**: Brief intelligence summary (2-3 sentences, 150 words max) covering key findings from research focus areas
- **Impact**: Must be EXACTLY one of these three values:
  - "opportunity" = Strong investment potential, positive signals, strategic alignment
  - "threat" = Competitive threat, market risk, or negative indicators
  - "neutral" = Noteworthy but no clear directional signal
- **URL**: Primary source URL for verification (use most authoritative source)
- **Date**: YYYY-MM-DD format (Publication Date of the news/announcement)

**Example Output:**
ABC Energy Corp,Announces $200M BESS expansion across Thailand,"ABC Energy announced plans to deploy 500MW of battery storage by 2025, partnering with leading EPC firms. Strong balance sheet with $300M credit facility. Active in solar+storage integration.",opportunity,https://abcenergy.com/news/2024-expansion,2025-12-15
XYZ Manufacturing,Delays renewable transition amid financial restructuring,"Company postponed its 100MW solar project due to liquidity constraints. Undergoing debt restructuring with creditors. Renewable energy strategy on hold until Q3 2025.",threat,https://industry-journal.com/xyz-delays,2025-11-20

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
  published_at: string;
  news_date?: string;
  account_name?: string;
  creator_name?: string;
  is_favorite?: boolean;
}

interface Activity {
  id: string;
  type: string;
  summary: string;
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
  dealName?: string;
  relatedToId?: string;
  relatedToType?: string;
  activityType?: string;
};

const formatFeedItem = (rawItem: any): FeedItem | null => {
  if (rawItem.source === 'activity') {
    const activityType = rawItem.type?.toLowerCase();
    const summary = rawItem.summary || '';

    switch (activityType) {
      case 'call':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Logged a call${summary ? `: ${summary}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Phone className="w-4 h-4" />,
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/50',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: 'Call'
        };

      case 'meeting':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Logged a meeting${summary ? `: ${summary}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Users className="w-4 h-4" />,
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/50',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: 'Meeting'
        };

      case 'note':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Added a note${summary ? `: ${summary}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <FileText className="w-4 h-4" />,
          iconColor: 'text-slate-600',
          iconBgColor: 'bg-slate-100 dark:bg-slate-800',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: 'Note'
        };

      case 'email':
        const direction = summary.toLowerCase().includes('sent') ? 'Sent' : 'Received';
        return {
          id: rawItem.id,
          type: 'activity',
          content: `${direction} email${summary ? `: ${summary}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: direction === 'Sent' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />,
          iconColor: 'text-purple-600',
          iconBgColor: 'bg-purple-100 dark:bg-purple-900/50',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: 'Email'
        };

      case 'task':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Task${summary ? `: ${summary}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <CheckCircle2 className="w-4 h-4" />,
          iconColor: 'text-orange-600',
          iconBgColor: 'bg-orange-100 dark:bg-orange-900/50',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: 'Task'
        };

      case 'site visit':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `Site visit${summary ? `: ${summary}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <MapPin className="w-4 h-4" />,
          iconColor: 'text-green-600',
          iconBgColor: 'bg-green-100 dark:bg-green-900/50',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: 'Site Visit'
        };

      case 'whatsapp':
        return {
          id: rawItem.id,
          type: 'activity',
          content: `WhatsApp${summary ? `: ${summary}` : ''}`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Mail className="w-4 h-4" />,
          iconColor: 'text-green-600',
          iconBgColor: 'bg-green-100 dark:bg-green-900/50',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: 'WhatsApp'
        };

      default:
        return {
          id: rawItem.id,
          type: 'activity',
          content: summary || `${activityType} activity`,
          timestamp: rawItem.created_at,
          user_name: rawItem.user_name,
          user_avatar: rawItem.user_avatar,
          icon: <Activity className="w-4 h-4" />,
          iconColor: 'text-slate-600',
          iconBgColor: 'bg-slate-100 dark:bg-slate-800',
          dealName: rawItem.deal_name,
          relatedToId: rawItem.related_to_id,
          relatedToType: rawItem.related_to_type,
          activityType: activityType
        };
    }
  }

  if (rawItem.source === 'log') {
    const details = rawItem.details || {};
    const action = rawItem.action;
    const dealName = details.entity_name || rawItem.deal_name;

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
        iconBgColor: 'bg-green-100 dark:bg-green-900/50',
        dealName: dealName,
        relatedToId: details.entity_id,
        relatedToType: details.entity_type,
        activityType: 'Update'
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
          iconBgColor: 'bg-green-100 dark:bg-green-900/50',
          dealName: dealName,
          relatedToId: details.entity_id,
          relatedToType: details.entity_type,
          activityType: 'Update'
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
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/50',
          dealName: dealName,
          relatedToId: details.entity_id,
          relatedToType: details.entity_type,
          activityType: 'Update'
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
          iconBgColor: 'bg-purple-100 dark:bg-purple-900/50',
          dealName: dealName,
          relatedToId: details.entity_id,
          relatedToType: details.entity_type,
          activityType: 'Update'
        };
      }

      return null;
    }

    if (action === 'create' || action === 'CREATE' || action === 'INSERT' || action.toLowerCase().includes('create')) {
      let parsedDetails = {};
      try {
        parsedDetails = typeof rawItem.details === 'string' ? JSON.parse(rawItem.details) : (rawItem.details || {});
      } catch (e) {
        console.error('JSON parse error', e);
        parsedDetails = details;
      }

      const entityName = parsedDetails?.name || parsedDetails?.title || parsedDetails?.full_name || parsedDetails?.summary || details.entity_name || 'Unknown Item';
      const entityType = rawItem.entity_type || details.entity_type || 'Item';

      let humanType = 'Item';
      if (entityType === 'Opportunity') humanType = 'Deal';
      else if (entityType === 'Account') humanType = 'Account';
      else if (entityType === 'Contact') humanType = 'Contact';
      else if (entityType === 'Partner') humanType = 'Partner';
      else if (entityType === 'Relationship') humanType = 'Nexus Link';
      else if (entityType === 'Project') humanType = 'Project';
      else humanType = entityType || 'Item';

      const hasExtraContext = parsedDetails?.value || parsedDetails?.target_capacity;
      let extraContext = null;

      if (hasExtraContext) {
        const parts = [];
        if (parsedDetails.target_capacity) {
          parts.push(`${parsedDetails.target_capacity} MW`);
        }
        if (parsedDetails.value) {
          parts.push(`฿${parseInt(parsedDetails.value).toLocaleString()}`);
        }
        extraContext = parts.join(' • ');
      }

      return {
        id: rawItem.id,
        type: 'log',
        content: (
          <span>
            Created new {humanType}: <span className="font-bold text-slate-900 dark:text-slate-100">{entityName}</span>
            {extraContext && (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                {extraContext}
              </div>
            )}
          </span>
        ),
        timestamp: rawItem.created_at,
        user_name: rawItem.user_name,
        user_avatar: rawItem.user_avatar,
        icon: <Plus className="w-4 h-4" />,
        iconColor: 'text-green-600',
        iconBgColor: 'bg-green-100 dark:bg-green-900/50',
        dealName: dealName,
        relatedToId: details.entity_id || parsedDetails?.id,
        relatedToType: details.entity_type || entityType,
        activityType: 'Create'
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
        iconBgColor: 'bg-slate-100 dark:bg-slate-800',
        dealName: dealName,
        relatedToId: details.entity_id,
        relatedToType: details.entity_type,
        activityType: action
      };
    }

    return null;
  }

  return null;
};

interface PulseScreenProps {
  forcedOpenId?: string | null;
}

export default function PulseScreen({ forcedOpenId }: PulseScreenProps) {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'internal' | 'market'>('internal');
  const [showPostModal, setShowPostModal] = useState(false);
  const [showAnalystModal, setShowAnalystModal] = useState(false);
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hiddenNews, setHiddenNews] = useState<Set<string>>(new Set());
  const [starredFeed, setStarredFeed] = useState<Set<string>>(new Set());
  const [hiddenFeed, setHiddenFeed] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [taskInitialData, setTaskInitialData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAnalyst = profile?.badges?.includes('Analyst');
  const showAnalystConsole = isSuperAdmin || isAnalyst;

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [newPost, setNewPost] = useState({
    title: '',
    summary: '',
    url: '',
    impact_type: 'neutral' as 'opportunity' | 'threat' | 'neutral',
    related_account_id: '',
    news_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
    loadEntityData();
  }, [activeTab]);

  const loadEntityData = async () => {
    const { data: accData } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name');
    if (accData) setAccounts(accData);

    const { data: userData } = await supabase
      .from('crm_users')
      .select('id, name, avatar, role');
    if (userData) setUsers(userData);

    const { data: oppData } = await supabase
      .from('opportunities')
      .select('id, name, owner_id')
      .neq('stage', 'Won')
      .neq('stage', 'Lost')
      .order('name');
    if (oppData) setOpportunities(oppData);
  };

  useEffect(() => {
    if (!forcedOpenId) return;

    if (activeTab !== 'market') setActiveTab('market');

    const attemptScroll = (attempts = 0) => {
      const element = document.getElementById(`news-${forcedOpenId}`);

      if (element) {
        console.log("Target found, scrolling...", forcedOpenId);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setHighlightedId(forcedOpenId);
        setTimeout(() => setHighlightedId(null), 3000);
        return;
      }

      if (attempts < 10) {
        setTimeout(() => attemptScroll(attempts + 1), 200 * (attempts + 1));
      } else {
        console.warn("Could not find target news item after multiple attempts:", forcedOpenId);
      }
    };

    attemptScroll();

  }, [forcedOpenId, marketNews, activeTab]);

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
    if (!user?.id) return;

    const rawFeed: any[] = [];

    const { data: activities } = await supabase
      .from('activities')
      .select(`
        id,
        type,
        summary,
        created_at,
        created_by,
        related_to_id,
        related_to_type,
        crm_users!activities_created_by_fkey(name, avatar)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activities) {
      const opportunityIds = activities.filter(a => a.related_to_type?.toLowerCase() === 'opportunity').map(a => a.related_to_id).filter(Boolean);
      const projectIds = activities.filter(a => a.related_to_type?.toLowerCase() === 'project').map(a => a.related_to_id).filter(Boolean);
      const accountIds = activities.filter(a => a.related_to_type?.toLowerCase() === 'account').map(a => a.related_to_id).filter(Boolean);
      const contactIds = activities.filter(a => a.related_to_type?.toLowerCase() === 'contact').map(a => a.related_to_id).filter(Boolean);
      const partnerIds = activities.filter(a => a.related_to_type?.toLowerCase() === 'partner').map(a => a.related_to_id).filter(Boolean);

      const [opportunitiesRes, projectsRes, accountsRes, contactsRes, partnersRes] = await Promise.all([
        opportunityIds.length > 0 ? supabase.from('opportunities').select('id, name').in('id', opportunityIds) : Promise.resolve({ data: [] }),
        projectIds.length > 0 ? supabase.from('projects').select('id, name').in('id', projectIds) : Promise.resolve({ data: [] }),
        accountIds.length > 0 ? supabase.from('accounts').select('id, name').in('id', accountIds) : Promise.resolve({ data: [] }),
        contactIds.length > 0 ? supabase.from('contacts').select('id, full_name').in('id', contactIds) : Promise.resolve({ data: [] }),
        partnerIds.length > 0 ? supabase.from('partners').select('id, name').in('id', partnerIds) : Promise.resolve({ data: [] })
      ]);

      const nameMap = new Map();
      opportunitiesRes.data?.forEach((o: any) => nameMap.set(o.id, o.name));
      projectsRes.data?.forEach((p: any) => nameMap.set(p.id, p.name));
      accountsRes.data?.forEach((a: any) => nameMap.set(a.id, a.name));
      contactsRes.data?.forEach((c: any) => nameMap.set(c.id, c.full_name));
      partnersRes.data?.forEach((p: any) => nameMap.set(p.id, p.name));

      activities.forEach((activity) => {
        const dealName = activity.related_to_id ? nameMap.get(activity.related_to_id) : null;

        rawFeed.push({
          id: activity.id,
          source: 'activity',
          type: activity.type,
          summary: activity.summary,
          created_at: activity.created_at,
          user_name: activity.crm_users?.name,
          user_avatar: activity.crm_users?.avatar,
          related_to_id: activity.related_to_id,
          related_to_type: activity.related_to_type,
          deal_name: dealName
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

    const allEntityIds = rawFeed.map(item => item.id);

    if (allEntityIds.length > 0) {
      const { data: interactions } = await supabase
        .from('feed_interactions')
        .select('entity_id, entity_type, is_starred, is_hidden')
        .eq('user_id', user.id)
        .in('entity_id', allEntityIds);

      const interactionsMap = new Map<string, { is_starred: boolean; is_hidden: boolean }>();
      if (interactions) {
        interactions.forEach((interaction: any) => {
          const key = `${interaction.entity_id}-${interaction.entity_type}`;
          interactionsMap.set(key, {
            is_starred: interaction.is_starred,
            is_hidden: interaction.is_hidden
          });
        });
      }

      const newStarred = new Set<string>();
      const newHidden = new Set<string>();

      rawFeed.forEach(item => {
        const key = `${item.id}-${item.source}`;
        const interaction = interactionsMap.get(key);

        if (interaction?.is_starred) {
          newStarred.add(item.id);
        }
        if (interaction?.is_hidden) {
          newHidden.add(item.id);
        }
      });

      setStarredFeed(newStarred);
      setHiddenFeed(newHidden);
    }

    const formattedFeed = rawFeed
      .map(item => formatFeedItem(item))
      .filter((item): item is FeedItem => item !== null);

    formattedFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setFeedItems(formattedFeed);
  };

  const loadMarketNews = async () => {
    if (!user?.id) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [newsResult, interactionsResult] = await Promise.all([
      supabase
        .from('market_news')
        .select(`
          *,
          accounts(name),
          crm_users!market_news_created_by_fkey(name)
        `)
        .lte('published_at', new Date().toISOString())
        .gte('news_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('published_at', { ascending: false }),
      supabase
        .from('market_news_interactions')
        .select('news_id, is_favorite, is_hidden')
        .eq('user_id', user.id)
    ]);

    if (newsResult.data) {
      const interactionsMap = new Map<string, { is_favorite: boolean; is_hidden: boolean }>();
      if (interactionsResult.data) {
        interactionsResult.data.forEach((interaction: any) => {
          interactionsMap.set(interaction.news_id, {
            is_favorite: interaction.is_favorite,
            is_hidden: interaction.is_hidden
          });
        });
      }

      const newFavorites = new Set<string>();
      const newHidden = new Set<string>();

      const formattedNews = newsResult.data.map((item: any) => {
        const interaction = interactionsMap.get(item.id);

        if (interaction?.is_favorite) {
          newFavorites.add(item.id);
        }
        if (interaction?.is_hidden) {
          newHidden.add(item.id);
        }

        return {
          ...item,
          account_name: item.accounts?.name,
          creator_name: item.crm_users?.name
        };
      });

      setMarketNews(formattedNews);
      setFavorites(newFavorites);
      setHiddenNews(newHidden);
    }
  };

  const loadFavorites = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('user_favorites')
      .select('entity_id')
      .eq('user_id', user.id)
      .eq('entity_type', 'market_news');

    if (data) {
      setFavorites(new Set(data.map(f => f.entity_id)));
    }
  };

  const handleToggleFavorite = async (newsId: string) => {
    if (!user?.id) return;

    const isFavorited = favorites.has(newsId);

    setFavorites(prev => {
      const next = new Set(prev);
      if (isFavorited) {
        next.delete(newsId);
      } else {
        next.add(newsId);
      }
      return next;
    });

    const { error } = await supabase
      .from('market_news_interactions')
      .upsert({
        user_id: user.id,
        news_id: newsId,
        is_favorite: !isFavorited
      }, {
        onConflict: 'user_id,news_id'
      });

    if (!error) {
      toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
    } else {
      setFavorites(prev => {
        const next = new Set(prev);
        if (isFavorited) {
          next.add(newsId);
        } else {
          next.delete(newsId);
        }
        return next;
      });
      toast.error('Failed to update favorite status');
    }
  };

  const handleOpenTaskModal = (news: MarketNews) => {
    setTaskInitialData({
      mode: 'activity',
      isTask: true,
      summary: `Follow up: ${news.title}`,
      details: `Source: ${news.url || 'Internal Feed'}\n\nSummary: ${news.summary || ''}`,
      relateToType: news.related_account_id ? 'Account' : undefined,
      relateToId: news.related_account_id || undefined
    });
    setShowQuickAdd(true);
  };

  const handleQuickAddSubmit = async (data: any) => {
    try {
      const { error } = await supabase.from('activities').insert({
        type: data.type,
        summary: data.summary,
        notes: data.details,
        is_task: data.isTask,
        status: data.isTask ? data.taskStatus : undefined,
        due_date: data.dueDate,
        priority: data.priority,
        assigned_to: data.assignedToId || user?.id,
        related_to_type: data.relatedToType,
        related_to_id: data.relatedToId,
        created_by: user?.id
      });

      if (error) throw error;
      toast.success("Task created successfully");
      setShowQuickAdd(false);
      loadInternalFeed();
    } catch (e: any) {
      toast.error("Failed to create task: " + e.message);
    }
  };

  const handleHideNews = async (newsId: string) => {
    if (!user?.id) return;

    setHiddenNews(prev => new Set(prev).add(newsId));

    const { error } = await supabase
      .from('market_news_interactions')
      .upsert({
        user_id: user.id,
        news_id: newsId,
        is_hidden: true
      }, {
        onConflict: 'user_id,news_id'
      });

    if (!error) {
      toast.success('News hidden from your feed');
    } else {
      setHiddenNews(prev => {
        const next = new Set(prev);
        next.delete(newsId);
        return next;
      });
      toast.error('Failed to hide news');
    }
  };

  const handleToggleFeedStar = async (itemId: string, entityType: 'activity' | 'log') => {
    if (!user?.id) return;

    const isStarred = starredFeed.has(itemId);

    setStarredFeed(prev => {
      const next = new Set(prev);
      if (isStarred) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

    const { error } = await supabase
      .from('feed_interactions')
      .upsert({
        user_id: user.id,
        entity_id: itemId,
        entity_type: entityType,
        is_starred: !isStarred
      }, {
        onConflict: 'user_id,entity_id,entity_type'
      });

    if (!error) {
      toast.success(isStarred ? 'Removed from starred' : 'Starred');
    } else {
      setStarredFeed(prev => {
        const next = new Set(prev);
        if (isStarred) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        return next;
      });
      toast.error('Failed to update starred status');
    }
  };

  const handleHideFeedItem = async (itemId: string, entityType: 'activity' | 'log') => {
    if (!user?.id) return;

    setHiddenFeed(prev => new Set(prev).add(itemId));

    const { error } = await supabase
      .from('feed_interactions')
      .upsert({
        user_id: user.id,
        entity_id: itemId,
        entity_type: entityType,
        is_hidden: true
      }, {
        onConflict: 'user_id,entity_id,entity_type'
      });

    if (!error) {
      toast.success('Item hidden from your feed');
    } else {
      setHiddenFeed(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      toast.error('Failed to hide item');
    }
  };

  const handleOpenFeedTaskModal = (item: FeedItem) => {
    setTaskInitialData({
      mode: 'activity',
      isTask: true,
      summary: `Follow up: ${item.content.substring(0, 50)}`,
      details: item.content,
      relateToType: item.relatedToType,
      relateToId: item.relatedToId
    });
    setShowQuickAdd(true);
  };

  const handleDownloadTemplate = () => {
    const csv = Papa.unparse({
      fields: ['Company Name', 'Headline', 'Summary', 'Impact', 'URL', 'Date'],
      data: [
        ['ABC Manufacturing', 'Expansion into renewable energy', 'Company announced $50M investment in solar', 'opportunity', 'https://example.com/news', '2026-01-09'],
        ['XYZ Corp', 'Factory closure due to regulations', 'Government imposed new environmental standards', 'threat', 'https://example.com/news2', '2026-01-08'],
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

        let scheduledTime = new Date();

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNumber = i + 2;

          try {
            const companyName = row['Company Name'] || row['company name'] || row['Company'] || row['Account Name'];
            const title = row['Headline'] || row['headline'] || row['Title'] || row['title'];
            const summary = row['Summary'] || row['summary'] || row['Summary (Analysis)'] || row['Description'];
            const impactRaw = (row['Impact'] || row['impact'] || row['Type'] || '').toLowerCase().trim();
            const url = row['URL'] || row['url'] || row['Link'] || row['Source'];
            const dateRaw = row['Date'] || row['date'] || row['News Date'] || row['Published Date'];

            if (!title || title.trim() === '') {
              skippedCount++;
              if (errorDetails.length < 10) {
                errorDetails.push(`Row ${rowNumber}: Missing headline/title`);
              }
              continue;
            }

            let newsDate: Date | null = null;
            if (dateRaw && dateRaw.trim() !== '') {
              const parsedDate = new Date(dateRaw.trim());
              if (!isNaN(parsedDate.getTime())) {
                newsDate = parsedDate;
              }
            }
            if (!newsDate) {
              newsDate = new Date();
            }

            const delayMinutes = Math.floor(Math.random() * (60 - 40 + 1) + 40);
            scheduledTime = new Date(scheduledTime.getTime() + delayMinutes * 60000);

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
              source_type: 'Analyst',
              news_date: newsDate.toISOString().split('T')[0],
              published_at: scheduledTime.toISOString()
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
          toast.error('Import Failed. Please check CSV headers match: Company Name, Headline, Summary, Impact, URL, Date.' + errorSummary, {
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
        const dripFeedHours = Math.round((successCount * 50) / 60);
        const message = `Imported ${successCount} items. They will drip-feed over the next ${dripFeedHours} hours.${linkInfo}${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`;
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
      source_type: 'Manual',
      published_at: new Date().toISOString()
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
      related_account_id: '',
      news_date: new Date().toISOString().split('T')[0]
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
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-sm pt-safe">
        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              The Pulse
            </h1>
          </div>

          {activeTab === 'market' && showAnalystConsole && (
            <button
              onClick={() => setShowAnalystModal(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex w-full border-b border-slate-200 dark:border-slate-700">
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
              {feedItems.filter(item => !hiddenFeed.has(item.id)).map((item) => {
                const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: false })
                  .replace('about ', '')
                  .replace('less than a minute', '1m')
                  .replace(' minutes', 'm')
                  .replace(' minute', 'm')
                  .replace(' hours', 'h')
                  .replace(' hour', 'h')
                  .replace(' days', 'd')
                  .replace(' day', 'd')
                  .replace(' months', 'mo')
                  .replace(' month', 'mo')
                  .replace(' years', 'y')
                  .replace(' year', 'y');

                const isStarred = starredFeed.has(item.id);
                const entityType = item.type === 'admin_log' ? 'log' : 'activity';

                return (
                  <div key={item.id} className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <Avatar className="w-11 h-11 ring-2 ring-slate-100 dark:ring-slate-700">
                          <AvatarImage src={item.user_avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-sm font-semibold">
                            {item.user_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                          {timeAgo}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {item.user_name || 'System'}
                            </span>
                          </div>

                          {item.relatedToId && item.relatedToType && (
                            <button
                              className="flex-shrink-0 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                              onClick={() => {
                                const typeMap: Record<string, string> = {
                                  'Opportunity': 'opportunities',
                                  'Project': 'projects',
                                  'Account': 'accounts',
                                  'Contact': 'contacts',
                                  'Partner': 'partners'
                                };
                                const view = typeMap[item.relatedToType] || 'home';
                                window.location.href = `/?view=${view}`;
                              }}
                              title={`Go to ${item.relatedToType}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-md ${item.iconBgColor}`}>
                            <div className={item.iconColor}>
                              {item.icon}
                            </div>
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                            {item.activityType || (item.type === 'activity' ? 'Activity' : 'Update')}
                          </span>
                        </div>

                        {item.dealName && (
                          <div className="mb-2">
                            <span className="inline-block px-2 py-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 rounded-md">
                              {item.dealName}
                            </span>
                          </div>
                        )}

                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                          {item.content}
                        </div>

                        <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleToggleFeedStar(item.id, entityType)}
                                  className={`p-2 rounded-full transition-colors ${
                                    isStarred
                                      ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                      : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                  }`}
                                >
                                  <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Star</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleOpenFeedTaskModal(item)}
                                  className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Create Task</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleHideFeedItem(item.id, entityType)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Hide</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {favorites.size > 0 && (
            <div className="px-4 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 border-b border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400 fill-current" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pinned Intel</h2>
                <Badge variant="outline" className="text-xs border-yellow-600 text-yellow-700 dark:text-yellow-400">
                  {favorites.size}
                </Badge>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {marketNews
                  .filter(news => favorites.has(news.id) && !hiddenNews.has(news.id))
                  .slice(0, 5)
                  .map(news => (
                    <button
                      key={news.id}
                      onClick={() => {
                        document.getElementById(`news-${news.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="flex-shrink-0 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-yellow-300 dark:border-yellow-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getImpactIcon(news.impact_type)}
                        <span className="text-xs font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                          {news.title}
                        </span>
                      </div>
                      {news.account_name && (
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {news.account_name}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {marketNews.some(n => n.impact_type !== 'neutral' && !hiddenNews.has(n.id)) && (
            <div className="mx-4 mt-4 mb-6 bg-gradient-to-br from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 p-4 rounded-2xl border border-orange-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 fill-orange-600" />
                </div>
                <h3 className="text-xs font-black uppercase text-orange-900 dark:text-orange-200 tracking-wider">Critical Updates</h3>
              </div>
              <div className="flex flex-col gap-3">
                {marketNews
                  .filter(n => n.impact_type !== 'neutral' && !hiddenNews.has(n.id))
                  .slice(0, 3)
                  .map(news => (
                    <div
                      key={'pinned-' + news.id}
                      className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        document.getElementById(`news-${news.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${news.impact_type === 'opportunity' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{news.title}</h4>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(news.published_at || news.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {news.summary && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">{news.summary}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

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
              {marketNews.filter(news => !hiddenNews.has(news.id)).map((news) => {
                const impactColor = news.impact_type === 'opportunity'
                  ? 'bg-green-50 dark:bg-green-950/20'
                  : news.impact_type === 'threat'
                  ? 'bg-red-50 dark:bg-red-950/20'
                  : 'bg-white dark:bg-slate-800';

                const isFavorited = favorites.has(news.id);

                return (
                  <div
                    id={`news-${news.id}`}
                    key={news.id}
                    className={`p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-1000 ${
                      highlightedId === news.id
                        ? 'ring-2 ring-orange-500 bg-orange-50 shadow-lg scale-[1.02]'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-shrink-0 mt-1">
                        {getImpactIcon(news.impact_type)}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        {news.creator_name && (
                          <>
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {news.creator_name}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm">·</span>
                          </>
                        )}
                        <span className="text-slate-500 dark:text-slate-400 text-sm">
                          {news.news_date ? new Date(news.news_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : formatDistanceToNow(new Date(news.created_at), { addSuffix: true })}
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
                    </div>

                    <div className="mt-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug mb-2">
                        {news.title}
                      </h3>

                      {news.summary && (
                        <div className="relative">
                          <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${expandedIds.has(news.id) ? '' : 'line-clamp-3'}`}>
                            {news.summary}
                          </p>
                          {(news.summary?.length || 0) > 150 && (
                            <button
                              onClick={() => toggleExpand(news.id)}
                              className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1 hover:underline"
                            >
                              {expandedIds.has(news.id) ? 'Show Less' : 'Read More'}
                            </button>
                          )}
                        </div>
                      )}

                      {news.account_name && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                          Related: <span className="font-semibold">{news.account_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-1">
                        {news.url && (
                          <button
                            onClick={() => window.open(news.url!, '_blank')}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-orange-600 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 px-2.5 py-1.5 rounded-lg transition-colors mr-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Source
                          </button>
                        )}

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleToggleFavorite(news.id)}
                                className={`p-2 rounded-full transition-colors ${
                                  isFavorited
                                    ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                    : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                }`}
                              >
                                <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Save</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleOpenTaskModal(news)}
                                className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Create Task</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleHideNews(news.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Hide</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <button
                        onClick={() => {
                          const prompt = "Analyze investment impact of: " + news.title;
                          navigator.clipboard.writeText(prompt);
                          window.open("https://chat.openai.com");
                          toast.success("AI Prompt Copied!");
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <BrainCircuit className="w-3.5 h-3.5" />
                        Dig Deeper
                      </button>
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

      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdd={handleQuickAddSubmit}
        initialData={taskInitialData}
        entities={{ accounts: accounts, partners: [], opportunities: opportunities, contacts: [] }}
        users={users}
      />
    </div>
  );
}
