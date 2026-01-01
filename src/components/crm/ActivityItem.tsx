import React, { useState } from 'react';
import { Phone, MessageSquare, Users, MapPin, Mail, FileText, StickyNote, ExternalLink, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { Activity, ActivityType } from '../../types/crm';

interface ActivityUser { id: string; name: string; avatar: string; }

interface ActivityItemProps {
  activity: Activity;
  user?: ActivityUser;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (id: string, data: { type: ActivityType; summary: string; details?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const typeIcons: Record<string, React.ElementType> = {
  Note: StickyNote, Call: Phone, Meeting: Users, WhatsApp: MessageSquare,
  'Site Visit': MapPin, Email: Mail, Document: FileText,
};

const typeColors: Record<string, string> = {
  Note: 'bg-gray-100 text-gray-600', Call: 'bg-blue-100 text-blue-600',
  Meeting: 'bg-purple-100 text-purple-600', WhatsApp: 'bg-green-100 text-green-600',
  'Site Visit': 'bg-amber-100 text-amber-600', Email: 'bg-red-100 text-red-600',
  Document: 'bg-indigo-100 text-indigo-600',
};

const activityTypes: ActivityType[] = ['Meeting', 'Call', 'Email', 'WhatsApp', 'Site Visit', 'Note'];

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, user, canEdit, canDelete, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({ type: activity.type, summary: activity.summary, details: activity.details || '' });

  const Icon = typeIcons[activity.type] || StickyNote;
  const timeAgo = getTimeAgo(new Date(activity.createdAt));

  const handleSave = async () => {
    if (!onEdit || !editData.summary.trim()) return;
    setLoading(true);
    try {
      await onEdit(activity.id, { type: editData.type, summary: editData.summary.trim(), details: editData.details.trim() || undefined });
      setIsEditing(false);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setLoading(true);
    try { await onDelete(activity.id); } finally { setLoading(false); setShowDeleteConfirm(false); }
  };

  if (isEditing) {
    return (
      <div className="p-3 bg-white rounded-xl border-2 border-emerald-200">
        <div className="space-y-3">
          <select value={editData.type} onChange={e => setEditData(d => ({ ...d, type: e.target.value as ActivityType }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="text" value={editData.summary} onChange={e => setEditData(d => ({ ...d, summary: e.target.value }))}
            placeholder="Summary *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <textarea value={editData.details} onChange={e => setEditData(d => ({ ...d, details: e.target.value }))}
            placeholder="Details (optional)" rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} disabled={loading}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={loading || !editData.summary.trim()}
              className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="p-3 bg-red-50 rounded-xl border-2 border-red-200">
        <p className="text-sm text-red-800 mb-3">Delete this activity? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setShowDeleteConfirm(false)} disabled={loading}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleDelete} disabled={loading}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 group">
      <div className={`w-10 h-10 rounded-lg ${typeColors[activity.type]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-gray-900 text-sm">{activity.summary}</h4>
          <div className="flex items-center gap-1">
            {(canEdit || canDelete) && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {canEdit && onEdit && (
                  <button onClick={() => setIsEditing(true)} className="p-3 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" aria-label="Edit activity">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && onDelete && (
                  <button onClick={() => setShowDeleteConfirm(true)} className="p-3 hover:bg-red-50 rounded text-gray-400 hover:text-red-600" aria-label="Delete activity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <span className="text-xs text-gray-600 whitespace-nowrap">{timeAgo}</span>
          </div>
        </div>
        {activity.details && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{activity.details}</p>}
        <div className="flex items-center gap-2 mt-2">
          {user && (
            <div className="flex items-center gap-1">
              <img src={user.avatar} alt={user.name} className="w-4 h-4 rounded-full" />
              <span className="text-xs text-gray-500">{user.name.split(' ')[0]}</span>
            </div>
          )}
          {activity.tags?.map(tag => <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">#{tag}</span>)}
          {activity.clickupLink && (
            <a href={activity.clickupLink} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 flex items-center gap-0.5">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
