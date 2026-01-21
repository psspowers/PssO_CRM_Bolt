import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Loader2, Clock, ExternalLink, Trash2, AlertCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserDropdown } from './UserDropdown';
import { OnlineUsersStack } from './OnlineUsersStack';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  entity_id?: string;
  entity_type?: string;
  created_at: string;
}

interface HeaderProps {
  onQuickAdd: () => void;
  onNavigate?: (tab: any, id?: string) => void;
  activeTab?: string;
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickAdd, onNavigate, activeTab = 'home', onSearchClick }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableExists, setTableExists] = useState(true);
  const [notificationPopoverOpen, setNotificationPopoverOpen] = useState(false);
  const channelRef = useRef<any>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch notifications from database
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          // Check if the error is because the table doesn't exist
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('Notifications table does not exist yet. Notifications feature disabled.');
            setTableExists(false);
            setNotifications([]);
          } else {
            console.error('Error fetching notifications:', error);
          }
        } else {
          setTableExists(true);
          setNotifications(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Only subscribe to real-time if we believe the table exists
    // We'll set this up after the initial fetch succeeds
  }, [user]);

  // Set up real-time subscription only if table exists
  useEffect(() => {
    if (!user || !tableExists) return;

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime subscription error (notifications will still work via polling):', err);
        }
        if (status === 'TIMED_OUT') {
          console.warn('Realtime subscription timed out (notifications will still work via polling)');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, tableExists]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!tableExists) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllRead = async () => {
    if (!user || !tableExists) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Delete old notifications (older than 30 days)
  const deleteOldNotifications = async () => {
    if (!user || !tableExists) return;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', thirtyDaysAgo.toISOString());

      setNotifications(prev => 
        prev.filter(n => new Date(n.created_at) > thirtyDaysAgo)
      );
    } catch (err) {
      console.error('Failed to delete old notifications:', err);
    }
  };

  // Delete single notification
  const deleteNotification = async (notificationId: string) => {
    if (!tableExists) return;
    
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Handle notification click
  const handleItemClick = async (n: Notification) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }

    // Close the popover
    setNotificationPopoverOpen(false);

    // Navigate to related entity
    if (onNavigate && n.entity_type && n.entity_id) {
      const tabMap: Record<string, string> = {
        'Opportunity': 'opportunities',
        'Account': 'accounts',
        'Partner': 'partners',
        'Contact': 'contacts',
        'Project': 'projects',
        'MarketNews': 'pulse',
        'Activity': 'pulse'
      };
      const tab = tabMap[n.entity_type] || 'home';
      onNavigate(tab, n.entity_id);
    }
  };

  // Handle mouse enter - cancel any pending close
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Handle mouse leave - close after a short delay
  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setNotificationPopoverOpen(false);
    }, 300); // 300ms delay before closing
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 z-50" role="banner">
      <div className="flex items-center justify-between">
        {/* Mobile Logo - Hidden on desktop since sidebar has logo - Clickable to go home */}
        <button
          onClick={() => onNavigate?.('home')}
          className="flex items-center gap-2 lg:hidden hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to Dashboard"
        >
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/6906bb3c71e38f27025f3702_1764911901727_6285940b.png" 
            className="w-12 h-12 object-contain" 
            alt="PSS Orange Logo" 
          />
          <div className="text-left">
            <h1 className="text-sm font-bold text-gray-900 leading-tight">PSS Orange</h1>
            <span className="text-[10px] text-orange-600 font-black uppercase tracking-tighter">Investor CRM</span>
          </div>
        </button>

        {/* Desktop: Global Search Button - Always visible */}
        <div className="hidden lg:flex items-center flex-1 max-w-2xl">
          <button
            onClick={() => onSearchClick?.()}
            className="relative w-full"
          >
            <div className="flex items-center w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-200 hover:border-slate-300 transition-all cursor-pointer text-left">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <span>Search deals, accounts, contacts...</span>
              <span className="ml-auto text-xs text-slate-400 font-medium">Ctrl+K</span>
            </div>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          {/* ONLY SHOW CRM TOOLS IF LOGGED IN */}
          {user ? (
            <>

              {/* Quick Add - Mobile only (desktop has sidebar button) */}
              <button
                onClick={onQuickAdd}
                className="lg:hidden w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-100 active:scale-90 transition-all"
                aria-label="Create new entry"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <Popover open={notificationPopoverOpen} onOpenChange={setNotificationPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="relative w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[calc(100%-1rem)] sm:w-96 max-w-[96vw] p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden"
                  align="end"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <span className="font-bold">Notifications</span>
                    {tableExists && (
                      <div className="flex gap-2">
                        <button 
                          onClick={deleteOldNotifications}
                          className="text-xs font-bold uppercase text-slate-400 hover:text-slate-300 transition-colors"
                          title="Delete notifications older than 30 days"
                        >
                          Clean up
                        </button>
                        <button 
                          onClick={markAllRead} 
                          className="text-xs font-bold uppercase text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          Mark all read
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto bg-white divide-y divide-slate-100">
                    {loading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
                        <p className="text-sm text-slate-500 mt-2">Loading notifications...</p>
                      </div>
                    ) : !tableExists ? (
                      <div className="p-8 text-center">
                        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 font-medium">Notifications not available</p>
                        <p className="text-xs text-slate-600 mt-1">Database setup required</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No notifications yet</p>
                        <p className="text-xs text-slate-600 mt-1">You'll see updates here</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`w-full text-left p-4 flex gap-3 hover:bg-slate-50 transition-colors ${n.is_read ? 'opacity-60' : 'bg-orange-50/30'}`}
                        >
                          <button
                            onClick={() => handleItemClick(n)}
                            className="flex-1 flex gap-3 text-left"
                          >
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${n.is_read ? 'bg-slate-200' : 'bg-orange-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 font-semibold leading-tight">{n.title || n.message}</p>
                              {n.title && n.message && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{formatTimeAgo(n.created_at)}
                                </span>
                                {!n.is_read && (
                                  <span className="text-xs font-bold text-orange-600 uppercase flex items-center gap-1">
                                    View <ExternalLink className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            className="p-3 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Online Users Stack - Desktop only */}
              <div className="hidden lg:flex">
                <OnlineUsersStack />
              </div>

              {/* User Dropdown */}
              <UserDropdown />
            </>
          ) : (
            // SHOW LOGIN BUTTON IF NOT LOGGED IN
            !authLoading && (
              <button 
                onClick={() => navigate('/login')} 
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-100 transition-all"
              >
                Sign In
              </button>
            )
          )}
          {authLoading && <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
        </div>
      </div>
    </header>
  );
};
