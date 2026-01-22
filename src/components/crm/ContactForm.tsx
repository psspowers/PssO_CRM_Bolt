import React, { useState, useMemo, useEffect } from 'react';
import { Save, X, Loader2, Building2, Plus, Lock } from 'lucide-react';
import { Contact } from '../../types/crm';
import { useAppContext } from '../../contexts/AppContext';
import { getSectors } from '../../data/thaiTaxonomy';

interface ContactFormProps {
  contact?: Contact;
  initialData?: Partial<Contact>;
  defaultAccountId?: string;
  onSave: (data: Partial<Contact>) => Promise<void>;
  onCancel: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  initialData,
  defaultAccountId,
  onSave,
  onCancel
}) => {
  const { accounts, createAccount } = useAppContext();

  const sourceData = contact || initialData || {};

  const [form, setForm] = useState({
    fullName: sourceData.fullName || '',
    role: sourceData.role || '',
    accountId: defaultAccountId || sourceData.accountId || '',
    email: sourceData.email || '',
    phone: sourceData.phone || '',
    city: sourceData.city || '',
    country: sourceData.country || 'Thailand',
    clickupLink: sourceData.clickupLink || '',
    tags: (sourceData.tags || []).join(', ') || '',
  });

  const [orgSearch, setOrgSearch] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ name: '', sector: '' });
  const [saving, setSaving] = useState(false);

  const isAccountLocked = Boolean(defaultAccountId);
  const lockedAccount = useMemo(() =>
    accounts.find(a => a.id === defaultAccountId),
    [accounts, defaultAccountId]
  );

  const filteredAccounts = useMemo(() => {
    const sorted = accounts.sort((a, b) => a.name.localeCompare(b.name));
    if (!orgSearch) return sorted.slice(0, 5);
    return sorted.filter(a => a.name.toLowerCase().includes(orgSearch.toLowerCase()));
  }, [accounts, orgSearch]);

  const handleOrgSelect = (accountId: string, name: string) => {
    setForm(prev => ({ ...prev, accountId }));
    setOrgSearch(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalAccountId = form.accountId;

      if (isCreatingAccount && newAccountData.name) {
        const newAcc = await createAccount({
          name: newAccountData.name,
          country: form.country,
          sector: newAccountData.sector || 'Other',
          industry: 'Other',
          subIndustry: 'Other',
          strategicImportance: 'Medium',
          notes: 'Created via Contact Form',
          linkedPartnerIds: [],
        });
        finalAccountId = newAcc.id;
      }

      await onSave({
        ...form,
        accountId: finalAccountId,
        clickupLink: form.clickupLink || undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all";
  const lockedInputClass = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
          <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className={inputClass} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Job Title / Role</label>
          <input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className={inputClass} required />
        </div>
      </div>

      <div className={`p-3 rounded-xl border ${isAccountLocked ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-200'}`}>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2">
          {isAccountLocked && <Lock className="w-3 h-3" />}
          <Building2 className="w-3 h-3" /> Organization / Account
        </label>

        {isAccountLocked ? (
          <div className={lockedInputClass}>
            <span className="font-bold text-slate-700">{lockedAccount?.name || 'Locked Account'}</span>
            <span className="text-xs text-slate-400 ml-2">Auto-linked</span>
          </div>
        ) : (
          <>
            {!isCreatingAccount ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search or Create Organization..."
                  className={inputClass}
                  value={orgSearch || (accounts.find(a => a.id === form.accountId)?.name || '')}
                  onChange={e => {
                    setOrgSearch(e.target.value);
                    setForm(prev => ({ ...prev, accountId: '' }));
                  }}
                />
                {orgSearch && !form.accountId && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredAccounts.map(acc => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleOrgSelect(acc.id, acc.name)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                      >
                        <span className="font-bold text-slate-700">{acc.name}</span>
                        <span className="text-xs text-slate-400 ml-2">({acc.country})</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingAccount(true);
                        setNewAccountData({ ...newAccountData, name: orgSearch });
                      }}
                      className="w-full text-left px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-bold flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create new account: "{orgSearch}"
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-orange-600">Creating New Account</span>
                  <button type="button" onClick={() => setIsCreatingAccount(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                </div>
                <input
                  type="text"
                  value={newAccountData.name}
                  onChange={e => setNewAccountData({ ...newAccountData, name: e.target.value })}
                  className={inputClass}
                  placeholder="Company Name"
                />
                <select
                  value={newAccountData.sector}
                  onChange={e => setNewAccountData({ ...newAccountData, sector: e.target.value })}
                  className={inputClass}
                  required
                >
                  <option value="">Select Sector...</option>
                  {getSectors().map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
          <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Country</label>
          <input type="text" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
        <input type="email" inputMode="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} required />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
        <input type="tel" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ClickUp Link</label>
        <input type="url" inputMode="url" value={form.clickupLink} onChange={e => setForm({ ...form, clickupLink: e.target.value })} className={inputClass} placeholder="https://..." />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags (comma separated)</label>
        <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className={inputClass} placeholder="Decision Maker, Technical" />
      </div>

      <div className="flex gap-2 pt-2 border-t border-slate-100 mt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Contact
        </button>
      </div>
    </form>
  );
};
