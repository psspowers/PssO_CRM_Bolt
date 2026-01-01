import React, { useState, useEffect } from 'react';
import { Save, X, Loader2, FolderKanban, Building2, MapPin, Zap, Users, FileText, Link, AlertCircle } from 'lucide-react';
import { Project, ProjectStatus, Account, Partner } from '../../types/crm';

interface ProjectFormProps {
  project?: Project; // Optional: if provided, we are editing
  accounts: Account[];
  partners: Partner[];
  currentUserId?: string;
  onSave: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

const PROJECT_STATUSES: ProjectStatus[] = ['Won', 'Engineering', 'Permit/EPC', 'Construction', 'Commissioning', 'Operational'];

const statusColors: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  'Won': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
  'Engineering': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  'Permit/EPC': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  'Construction': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  'Commissioning': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  'Operational': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
};

export const ProjectForm: React.FC<ProjectFormProps> = ({ 
  project, 
  accounts, 
  partners, 
  currentUserId,
  onSave, 
  onCancel 
}) => {
  const [form, setForm] = useState({
    name: project?.name || '',
    linkedAccountId: project?.linkedAccountId || '',
    country: project?.country || 'Thailand',
    capacity: project?.capacity || 0,
    status: project?.status || 'Won' as ProjectStatus,
    ownerId: project?.ownerId || currentUserId || '',
    linkedPartnerIds: project?.linkedPartnerIds || [] as string[],
    clickupLink: project?.clickupLink || '',
    notes: project?.notes || '',
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (!form.linkedAccountId) {
      newErrors.linkedAccountId = 'Please select an account';
    }
    
    if (!form.country.trim()) {
      newErrors.country = 'Country is required';
    }
    
    if (form.capacity < 0) {
      newErrors.capacity = 'Capacity cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        linkedAccountId: form.linkedAccountId,
        country: form.country.trim(),
        capacity: Number(form.capacity),
        status: form.status,
        ownerId: form.ownerId,
        linkedPartnerIds: form.linkedPartnerIds,
        clickupLink: form.clickupLink.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePartnerToggle = (partnerId: string) => {
    setForm(prev => ({
      ...prev,
      linkedPartnerIds: prev.linkedPartnerIds.includes(partnerId)
        ? prev.linkedPartnerIds.filter(id => id !== partnerId)
        : [...prev.linkedPartnerIds, partnerId]
    }));
  };

  const isEditing = !!project;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
          <FolderKanban className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Edit Project' : 'New Project'}
          </h2>
          <p className="text-sm text-slate-500">
            {isEditing ? 'Update project details' : 'Add a new project to your pipeline'}
          </p>
        </div>
      </div>

      {/* Project Name */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Solar Farm Phase 1"
          className={`w-full px-4 py-3 rounded-xl border ${
            errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'
          } focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500`}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Account Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Linked Account *
        </label>
        <select
          value={form.linkedAccountId}
          onChange={(e) => setForm({ ...form, linkedAccountId: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border ${
            errors.linkedAccountId ? 'border-red-300 bg-red-50' : 'border-slate-200'
          } focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500`}
          aria-invalid={errors.linkedAccountId ? 'true' : 'false'}
          aria-describedby={errors.linkedAccountId ? 'account-error' : undefined}
        >
          <option value="">Select an account...</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.country})
            </option>
          ))}
        </select>
        {errors.linkedAccountId && (
          <p id="account-error" className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert">
            <AlertCircle className="w-4 h-4" />
            {errors.linkedAccountId}
          </p>
        )}
      </div>

      {/* Country & Capacity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Country *
          </label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            placeholder="e.g., Thailand"
            className={`w-full px-4 py-3 rounded-xl border ${
              errors.country ? 'border-red-300 bg-red-50' : 'border-slate-200'
            } focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500`}
          />
          {errors.country && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.country}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Zap className="w-4 h-4 inline mr-1" />
            Capacity (MW)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: parseFloat(e.target.value) || 0 })}
            placeholder="e.g., 5.5"
            className={`w-full px-4 py-3 rounded-xl border ${
              errors.capacity ? 'border-red-300 bg-red-50' : 'border-slate-200'
            } focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500`}
            aria-invalid={errors.capacity ? 'true' : 'false'}
            aria-describedby={errors.capacity ? 'capacity-error' : undefined}
          />
          {errors.capacity && (
            <p id="capacity-error" className="mt-1 text-sm text-red-600 flex items-center gap-1" role="alert">
              <AlertCircle className="w-4 h-4" />
              {errors.capacity}
            </p>
          )}
        </div>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Status
        </label>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {PROJECT_STATUSES.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setForm({ ...form, status })}
              className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                form.status === status
                  ? `${statusColors[status].bg} ${statusColors[status].text} ${statusColors[status].border} ring-2 ring-offset-1 ring-slate-400`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Partners Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Linked Partners ({form.linkedPartnerIds.length} selected)
        </label>
        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
          {partners.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No partners available</p>
          ) : (
            partners.map(partner => (
              <button
                key={partner.id}
                type="button"
                onClick={() => handlePartnerToggle(partner.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                  form.linkedPartnerIds.includes(partner.id)
                    ? 'bg-orange-50 border border-orange-200'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                  form.linkedPartnerIds.includes(partner.id)
                    ? 'bg-orange-500 border-orange-500'
                    : 'border-slate-300'
                }`}>
                  {form.linkedPartnerIds.includes(partner.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{partner.name}</p>
                  <p className="text-xs text-slate-500">{partner.region} • {partner.country}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ClickUp Link */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <Link className="w-4 h-4 inline mr-1" />
          ClickUp Link (optional)
        </label>
        <input
          type="url"
          inputMode="url"
          value={form.clickupLink}
          onChange={(e) => setForm({ ...form, clickupLink: e.target.value })}
          placeholder="https://app.clickup.com/..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Notes (optional)
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Add any additional notes about this project..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4 inline mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isEditing ? 'Update Project' : 'Create Project'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
