import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Network, Activity as ActivityIcon, Building2, TrendingUp, Zap } from 'lucide-react';
import { NetworkGraph } from './NetworkGraph';
import { NexusTab } from './NexusTab';
import { ActivityItem } from './ActivityItem';
import { ActivityForm } from './ActivityForm';
import { NewsItemCard } from './NewsItemCard';
import { Activity, Contact, Account, Partner, Relationship, ActivityType } from '../../types/crm';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface DetailModalUser { id: string; name: string; avatar: string; }

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  entityId: string;
  entityType: 'Contact' | 'Account' | 'Partner' | 'Opportunity';
  clickupLink?: string;
  children: React.ReactNode;
  velocityContent?: React.ReactNode;
  activities: Activity[];
  users: DetailModalUser[];
  contacts?: Contact[];
  accounts?: Account[];
  partners?: Partner[];
  relationships?: Relationship[];
  accountId?: string | null;
}

type Tab = 'overview' | 'velocity' | 'nexus' | 'activity' | 'pulse';

interface MarketNews {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  impact_type: 'opportunity' | 'threat' | 'neutral';
  news_date?: string;
  created_at: string;
  account_name?: string;
  creator_name?: string;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen, onClose, title, subtitle, entityId, entityType, clickupLink, children,
  velocityContent, activities, users, contacts = [], accounts = [], partners = [], relationships = [],
  accountId
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hiddenNews, setHiddenNews] = useState<Set<string>>(new Set());
  const { createActivity, updateActivity, deleteActivity, currentUser, canCreate, canEdit, canDelete } = useAppContext();
  const { user } = useAuth();

  const showPulse = (entityType === 'Opportunity' || entityType === 'Account') && accountId;

  useEffect(() => {
    if (isOpen && showPulse && accountId) {
      loadMarketNews();
    }
  }, [isOpen, accountId, showPulse]);

  const loadMarketNews = async () => {
    if (!accountId || !user?.id) return;

    setLoadingNews(true);
    try {
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
          .eq('related_account_id', accountId)
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
    } catch (error) {
      console.error('Error loading market news:', error);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleToggleFavorite = async (newsId: string) => {
    if (!user?.id) return;

    const isFavorited = favorites.has(newsId);

    try {
      if (isFavorited) {
        await supabase
          .from('market_news_interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('news_id', newsId);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(newsId);
          return next;
        });
      } else {
        await supabase
          .from('market_news_interactions')
          .upsert({
            user_id: user.id,
            news_id: newsId,
            is_favorite: true,
            is_hidden: false
          }, { onConflict: 'user_id,news_id' });
        setFavorites(prev => new Set(prev).add(newsId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleHideNews = async (newsId: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('market_news_interactions')
        .upsert({
          user_id: user.id,
          news_id: newsId,
          is_favorite: false,
          is_hidden: true
        }, { onConflict: 'user_id,news_id' });
      setHiddenNews(prev => new Set(prev).add(newsId));
    } catch (error) {
      console.error('Error hiding news:', error);
    }
  };

  if (!isOpen) return null;

  const entityActivities = activities.filter(a => a.relatedToId === entityId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const showNetwork = ['Contact', 'Account', 'Partner'].includes(entityType);
  const showVelocity = entityType === 'Opportunity' && velocityContent;

  const tabs: { id: Tab; label: string; icon: React.ElementType; hideLabel?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    ...(showVelocity ? [{ id: 'velocity' as Tab, label: 'Velocity', icon: TrendingUp }] : []),
    ...(showNetwork ? [{ id: 'nexus' as Tab, label: 'Nexus', icon: Network }] : []),
    ...(showPulse ? [{ id: 'pulse' as Tab, label: 'Pulse', icon: Zap, hideLabel: true }] : []),
    { id: 'activity', label: 'Activity', icon: ActivityIcon, hideLabel: true },
  ];

  const handleCreateActivity = async (data: { type: ActivityType; summary: string; details?: string }) => {
    if (!currentUser) throw new Error('Not authenticated');
    await createActivity({
      type: data.type, summary: data.summary, details: data.details,
      relatedToId: entityId, relatedToType: entityType, createdById: currentUser.id,
    });
  };

  const handleEditActivity = async (id: string, data: { type: ActivityType; summary: string; details?: string }) => {
    await updateActivity(id, { type: data.type, summary: data.summary, details: data.details });
  };

  const handleDeleteActivity = async (id: string) => {
    await deleteActivity(id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 id="detail-modal-title" className="font-semibold text-gray-900 truncate">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {clickupLink && (
                <a href={clickupLink} target="_blank" rel="noopener noreferrer"
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  aria-label="Open in ClickUp">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-lg" aria-label="Close modal"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            {tabs.map(({ id, label, icon: Icon, hideLabel }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                <Icon className="w-4 h-4" />
                {!hideLabel && <span className="hidden sm:inline">{label}</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto pb-32">
          {activeTab === 'overview' && <div className="p-4">{children}</div>}
          {activeTab === 'velocity' && showVelocity && <div className="p-4">{velocityContent}</div>}
          {activeTab === 'nexus' && showNetwork && (
            <div className="p-4">
              <NexusTab entityId={entityId} entityType={entityType as 'Contact' | 'Account' | 'Partner'} />
            </div>
          )}
          {activeTab === 'pulse' && showPulse && (
            <div>
              {loadingNews ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              ) : marketNews.filter(news => !hiddenNews.has(news.id)).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <Zap className="w-12 h-12 text-slate-300 mb-3" />
                  <h3 className="text-base font-semibold text-slate-700 mb-1">No market intelligence yet</h3>
                  <p className="text-sm text-slate-500 text-center">Market news for this account will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {marketNews.filter(news => !hiddenNews.has(news.id)).map(news => (
                    <NewsItemCard
                      key={news.id}
                      news={news}
                      isFavorited={favorites.has(news.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onHide={handleHideNews}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'activity' && (
            <div className="space-y-3 p-4">
              {canCreate() && <ActivityForm entityId={entityId} entityType={entityType} onSubmit={handleCreateActivity} />}
              {entityActivities.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">No activities yet</p>
              ) : entityActivities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} user={users.find(u => u.id === activity.createdById)}
                  canEdit={canEdit(activity.createdById)} canDelete={canDelete(activity.createdById)}
                  onEdit={handleEditActivity} onDelete={handleDeleteActivity} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
