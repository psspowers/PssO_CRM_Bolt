import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Monitor, Smartphone, Tablet, CheckCircle, XCircle, 
  RefreshCw, Globe, Clock, AlertTriangle, Shield, Info
} from 'lucide-react';

interface LoginEntry {
  id: string;
  email: string;
  success: boolean;
  ip_address: string;
  device_type: string;
  browser: string;
  os: string;
  failure_reason: string | null;
  created_at: string;
}

const LoginHistory: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const fetchHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setHistory(data || []);
      setServiceUnavailable(false);
    } catch (err: any) {
      console.error('LoginHistory error:', err);
      setError(err.message || 'Failed to load login history');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { 
    fetchHistory(); 
  }, [user]);

  const getDeviceIcon = (type: string) => {
    if (type === 'Mobile') return <Smartphone className="w-4 h-4" />;
    if (type === 'Tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const failedCount = history.filter(h => !h.success).length;
  const recentFailed = history.slice(0, 10).filter(h => !h.success).length;

  // Show service unavailable message
  if (serviceUnavailable) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Login History</h3>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">Login History Coming Soon</p>
            <p className="text-xs text-orange-600 mt-1">
              The login history feature is being set up. You'll be able to view your login activity here soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Login History</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {recentFailed >= 3 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Suspicious Activity Detected</p>
            <p className="text-xs text-red-600">{recentFailed} failed login attempts recently. If this wasn't you, change your password immediately.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-2xl font-bold text-green-700">{history.filter(h => h.success).length}</p>
          <p className="text-xs text-green-600">Successful logins</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-2xl font-bold text-red-700">{failedCount}</p>
          <p className="text-xs text-red-600">Failed attempts</p>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No login history found</p>
            <p className="text-xs mt-1">Your login activity will appear here</p>
          </div>
        ) : history.map((entry) => (
          <div key={entry.id} className={`p-3 rounded-lg border ${entry.success ? 'bg-gray-50' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entry.success ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span className={`text-sm font-medium ${entry.success ? 'text-green-700' : 'text-red-700'}`}>
                  {entry.success ? 'Successful' : 'Failed'}
                </span>
              </div>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />{formatDate(entry.created_at)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">{getDeviceIcon(entry.device_type)} {entry.device_type}</span>
              <span>{entry.browser} / {entry.os}</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{entry.ip_address}</span>
            </div>
            {entry.failure_reason && <p className="mt-1 text-xs text-red-600">{entry.failure_reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoginHistory;
