import React, { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { Partner } from '../../types/crm';

interface PartnerFormProps {
  partner: Partner;
  onSave: (updates: Partial<Partner>) => Promise<void>;
  onCancel: () => void;
}

export const PartnerForm: React.FC<PartnerFormProps> = ({ partner, onSave, onCancel }) => {
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
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          <X className="w-4 h-4 inline mr-1" />Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}Save
        </button>
      </div>
    </form>
  );
};
