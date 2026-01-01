import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import DeviceCard from './DeviceCard';
import { 
  Monitor, Smartphone, Tablet, RefreshCw, Shield, 
  LogOut, AlertTriangle, Info
} from 'lucide-react';

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  is_current: boolean;
  is_trusted: boolean;
  last_active_at: string;
  created_at: string;
}

const TrustedDevices: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const fetchDevices = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .order('last_active_at', { ascending: false });

      if (error) {
        throw error;
      }

      setDevices(data || []);
      setServiceUnavailable(false);
    } catch (err: any) {
      console.error('TrustedDevices error:', err);
      setError(err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDevices(); 
  }, [user]);

  const getDeviceIcon = (type: string) => {
    if (type === 'Mobile') return <Smartphone className="w-5 h-5" />;
    if (type === 'Tablet') return <Tablet className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Active now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const handleRename = async (deviceId: string) => {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase
        .from('trusted_devices')
        .update({ device_name: editName })
        .eq('id', deviceId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setEditingId(null);
      fetchDevices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (!confirm('Revoke access from this device?')) return;
    try {
      const { error } = await supabase
        .from('trusted_devices')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', deviceId)
        .eq('user_id', user?.id);

      if (error) throw error;

      fetchDevices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevokeAll = async (currentId: string) => {
    if (!confirm('Sign out from all other devices?')) return;
    try {
      const { error } = await supabase
        .from('trusted_devices')
        .update({ revoked_at: new Date().toISOString() })
        .neq('id', currentId)
        .eq('user_id', user?.id)
        .is('revoked_at', null);

      if (error) throw error;

      fetchDevices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const currentDevice = devices.find(d => d.is_current);

  // Show service unavailable message
  if (serviceUnavailable) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Trusted Devices</h3>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Device Management Coming Soon</p>
            <p className="text-xs text-blue-600 mt-1">
              The trusted devices feature is being set up. You'll be able to manage your logged-in devices here soon.
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
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Trusted Devices</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchDevices} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Manage devices that have accessed your account. Revoke access from devices you don't recognize.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {devices.length > 1 && currentDevice && (
        <Button variant="outline" size="sm" className="mb-4 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRevokeAll(currentDevice.id)}>
          <LogOut className="w-4 h-4 mr-1" /> Sign out all other devices
        </Button>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No devices found</p>
            <p className="text-xs mt-1">Your current device will appear here after setup</p>
          </div>
        ) : devices.map((device) => (
          <DeviceCard key={device.id} device={device} editingId={editingId} editName={editName} setEditingId={setEditingId} setEditName={setEditName} handleRename={handleRename} handleRevoke={handleRevoke} getDeviceIcon={getDeviceIcon} formatDate={formatDate} />
        ))}
      </div>
    </div>
  );
};

export default TrustedDevices;
