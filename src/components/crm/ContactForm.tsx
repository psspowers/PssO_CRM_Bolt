import React, { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { Contact } from '../../types/crm';

interface ContactFormProps {
  contact: Contact;
  onSave: (updates: Partial<Contact>) => Promise<void>;
  onCancel: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ contact, onSave, onCancel }) => {
  const [form, setForm] = useState({
    fullName: contact.fullName,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
    city: contact.city,
    country: contact.country,
    clickupLink: contact.clickupLink || '',
    tags: contact.tags.join(', '),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        clickupLink: form.clickupLink || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className={inputClass} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputClass} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputClass} required />
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ClickUp Link</label>
        <input type="url" inputMode="url" value={form.clickupLink} onChange={e => setForm({ ...form, clickupLink: e.target.value })} className={inputClass} placeholder="https://..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
        <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="Decision Maker, Technical" />
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
