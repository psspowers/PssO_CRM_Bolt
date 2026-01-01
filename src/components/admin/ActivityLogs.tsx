import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, User, Settings, Trash2, Edit, Plus, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="w-4 h-4 text-green-500" />,
  logout: <LogOut className="w-4 h-4 text-gray-500" />,
  create: <Plus className="w-4 h-4 text-blue-500" />,
  update: <Edit className="w-4 h-4 text-orange-500" />,
  delete: <Trash2 className="w-4 h-4 text-red-500" />,
  settings: <Settings className="w-4 h-4 text-purple-500" />,
};

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const getActionIcon = (action: string) => {
    const key = Object.keys(actionIcons).find(k => action.toLowerCase().includes(k));
    return key ? actionIcons[key] : <Activity className="w-4 h-4 text-gray-400" />;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading activity logs...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recent Activity ({logs.length})</h3>
      </div>
      
      {logs.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No activity logs yet</p>
          <p className="text-sm">System events will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y max-h-[500px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-gray-50">
              <div className="mt-1">{getActionIcon(log.action)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{log.action}</p>
                <p className="text-xs text-gray-500 truncate">
                  {log.user_email || 'System'} 
                  {log.entity_type && ` • ${log.entity_type}`}
                  {log.entity_id && ` #${log.entity_id.slice(0, 8)}`}
                </p>
                {log.details && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {JSON.stringify(log.details)}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {format(new Date(log.created_at), 'MMM d, HH:mm')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
