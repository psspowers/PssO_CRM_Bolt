import React, { useState } from 'react';
import { Save, X, Loader2, Trash2 } from 'lucide-react';
import { Partner } from '../../types/crm';

interface PartnerFormProps {
  partner: Partner;
  onSave: (updates: Partial<Partner>) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export const PartnerForm: React.FC<PartnerFormProps> = ({ partner, onSave, onCancel, onDelete }) => {
  const [form, setForm] = useState({
    name: partner.name,
    region: partner.region,
    country: partner.country,
    email: partner.email,
    phone: partner.phone,
    partnerType: partner.partnerType || '',
    companyName: partner.companyName || '',
    clickupLink: partner.clickupLink || '',
    notes: partner.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        partnerType: form.partnerType || undefined,
        companyName: form.companyName || undefined,
        clickupLink: form.clickupLink || undefined,
        notes: form.notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to delete partner');
      setDeleting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <input type="text" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className={inputClass} required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" inputMode="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input type="tel" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Partner Type</label>
          <input type="text" value={form.partnerType} onChange={e => setForm({ ...form, partnerType: e.target.value })} className={inputClass} placeholder="EPC, O&M, Developer, etc." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Legal Name</label>
          <input type="text" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} className={inputClass} placeholder="Official registered name" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ClickUp Link</label>
        <input type="url" inputMode="url" value={form.clickupLink} onChange={e => setForm({ ...form, clickupLink: e.target.value })} className={inputClass} placeholder="https://..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className={inputClass} />
      </div>
      <div className="flex gap-2 pt-2">
        {onDelete && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold flex items-center justify-center gap-2">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Partner</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-700 dark:text-slate-300 mb-6">
              Are you sure you want to delete <span className="font-bold">{form.name}</span>?
              This will permanently remove this partner and all associated data.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Partner
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
