import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, Check, X, Globe, Clock } from 'lucide-react';

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

interface DeviceCardProps {
  device: Device;
  isCurrentDevice: boolean;
  editingId: string | null;
  editName: string;
  setEditingId: (id: string | null) => void;
  setEditName: (name: string) => void;
  handleRename: (id: string) => void;
  handleRevoke: (id: string) => void;
  getDeviceIcon: (type: string) => React.ReactNode;
  formatDate: (date: string) => string;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isCurrentDevice,
  editingId,
  editName,
  setEditingId,
  setEditName,
  handleRename,
  handleRevoke,
  getDeviceIcon,
  formatDate
}) => {
  const isEditing = editingId === device.id;

  return (
    <div className={`p-4 rounded-lg border ${isCurrentDevice ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isCurrentDevice ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
            {getDeviceIcon(device.device_type)}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm w-48"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={() => handleRename(device.id)}>
                  <Check className="w-4 h-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  <X className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{device.device_name}</h4>
                {isCurrentDevice && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    This device
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {device.browser} on {device.os}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {device.ip_address || 'Unknown IP'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(device.last_active_at)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingId(device.id);
              setEditName(device.device_name);
            }}
            className="h-8 w-8 p-0"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </Button>
          {!isCurrentDevice && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRevoke(device.id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceCard;
