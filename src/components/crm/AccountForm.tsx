import React, { useState, useEffect } from 'react';
import { Save, X, Loader2, Landmark, ChevronDown, Info, TrendingUp, AlertCircle } from 'lucide-react';
import { Account, Priority } from '../../types/crm';
import { toast } from '@/components/ui/use-toast'; // Import toast for errors
import { 
  getSectors, 
  getIndustries, 
  getSubIndustries,
  getTaxonomyInfo,
  SECTOR_ICONS,
  getScoreColor,
  getPointsColor
} from '../../data/thaiTaxonomy';

interface AccountFormProps {
  account: Account;
  onSave: (updates: Partial<Account>) => Promise<void>;
  onCancel: () => void;
}

const priorities: Priority[] = ['Low', 'Medium', 'High'];

export const AccountForm: React.FC<AccountFormProps> = ({ account, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: account.name,
    country: account.country || 'Thailand',
    sector: account.sector || '',
    industry: account.industry || '',
    subIndustry: account.subIndustry || '',
    strategicImportance: account.strategicImportance,
    clickupLink: account.clickupLink || '',
    notes: account.notes || '',
  });
  
  const [saving, setSaving] = useState(false);
  const [taxonomyInfo, setTaxonomyInfo] = useState<{ score: number; points: number } | null>(null);

  const sectors = getSectors();
  const industries = form.sector ? getIndustries(form.sector) : [];
  const subIndustries = form.industry ? getSubIndustries(form.industry) : [];

  useEffect(() => {
    if (form.subIndustry) {
      const info = getTaxonomyInfo(form.subIndustry);
      if (info) setTaxonomyInfo({ score: info.score, points: info.points });
    } else {
      setTaxonomyInfo(null);
    }
  }, [form.subIndustry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      toast({ title: "Success", description: "Account details updated." });
    } catch (err: any) {
      console.error("Save Error:", err);
      // STOP THE SPINNER AND SHOW THE ERROR
      setSaving(false); 
      toast({ 
        variant: "destructive", 
        title: "Database Error", 
        description: err.message || "Ensure 'industry' and 'sub_industry' columns exist in Supabase." 
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white text-sm outline-none";

  return (
    // Added pb-24 to ensure buttons are never covered by the BottomNav
    <form onSubmit={handleSubmit} className="space-y-5 pb-24"> 
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Landmark className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Account Classification</h3>
          <p className="text-xs text-gray-500">Thai Credit Underwriting Taxonomy</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Sector</label>
          <select value={form.sector} onChange={e => setForm({...form, sector: e.target.value, industry: '', subIndustry: ''})} className={inputClass} required>
            <option value="">Select Sector...</option>
            {sectors.map(s => <option key={s} value={s}>{SECTOR_ICONS[s] || '📁'} {s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Industry</label>
            <select value={form.industry} disabled={!form.sector} onChange={e => setForm({...form, industry: e.target.value, subIndustry: ''})} className={inputClass} required>
              <option value="">Select...</option>
              {industries.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Sub-Industry</label>
            <select value={form.subIndustry} disabled={!form.industry} onChange={e => setForm({...form, subIndustry: e.target.value})} className={inputClass} required>
              <option value="">Select...</option>
              {subIndustries.map(si => <option key={si.name} value={si.name}>{si.name}</option>)}
            </select>
          </div>
        </div>

        {taxonomyInfo && (
          <div className="flex gap-3 pt-2">
            <div className={`flex-1 rounded-xl p-3 ${getScoreColor(taxonomyInfo.score)}`}>
              <p className="text-[10px] font-bold uppercase opacity-70 text-current">Score: {taxonomyInfo.score}</p>
            </div>
            <div className={`flex-1 rounded-xl p-3 ${getPointsColor(taxonomyInfo.points)}`}>
              <p className="text-[10px] font-bold uppercase opacity-70 text-current">Points: {taxonomyInfo.points}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Company Name" required />
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className={inputClass} placeholder="Notes..." />
      </div>

      {/* FIXED BUTTON CONTAINER: Uses fixed position or higher padding to clear BottomNav */}
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold text-sm">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</div> : 'Save Account'}
        </button>
      </div>
    </form>
  );
};