import React, { useState } from 'react';
import { Plus, X, Send, Loader2 } from 'lucide-react';
import { ActivityType } from '../../types/crm';

interface ActivityFormProps {
  entityId: string;
  entityType: 'Contact' | 'Account' | 'Partner' | 'Opportunity' | 'Project';
  onSubmit: (data: { type: ActivityType; summary: string; details?: string }) => Promise<void>;
}

const activityTypes: ActivityType[] = ['Meeting', 'Call', 'Email', 'WhatsApp', 'Site Visit', 'Note'];

export const ActivityForm: React.FC<ActivityFormProps> = ({ entityId, entityType, onSubmit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [type, setType] = useState<ActivityType>('Note');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) { setError('Summary is required'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({ type, summary: summary.trim(), details: details.trim() || undefined });
      setSummary(''); setDetails(''); setType('Note'); setIsExpanded(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <button onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors">
        <Plus className="w-5 h-5" /><span className="font-medium">Add Activity</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">New Activity</h4>
        <button type="button" onClick={() => setIsExpanded(false)} className="p-3 hover:bg-gray-200 rounded" aria-label="Collapse form">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as ActivityType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
          <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Additional details..." rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSubmitting ? 'Saving...' : 'Save Activity'}
        </button>
      </div>
    </form>
  );
};
