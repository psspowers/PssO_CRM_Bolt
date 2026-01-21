import React, { useState, useEffect } from 'react';
import { Save, X, Loader2, ChevronDown, TrendingUp, Info, Building2, Plus } from 'lucide-react';
import { Opportunity, OpportunityStage, Priority, REType } from '../../types/crm';
import { useAppContext } from '../../contexts/AppContext';
import {
  getSectors,
  getIndustries,
  getSubIndustries,
  getTaxonomyInfo,
  SECTOR_ICONS,
  getScoreColor,
  getPointsColor
} from '../../data/thaiTaxonomy';

interface OpportunityFormProps {
  opportunity: Opportunity;
  onSave: (updates: Partial<Opportunity>) => Promise<void>;
  onCancel: () => void;
}

const stages: OpportunityStage[] = [
  'Prospect',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Term Sheet',
  'Won',
  'Lost'
];
const priorities: Priority[] = ['Low', 'Medium', 'High'];
const RE_OPTIONS: REType[] = ['PV - Roof', 'PV - Ground', 'PV - Floating', 'BESS', 'Wind'];

export const OpportunityForm: React.FC<OpportunityFormProps> = ({ opportunity, onSave, onCancel }) => {
  const { users, accounts, partners, createAccount } = useAppContext();
  const [form, setForm] = useState({
    name: opportunity.name,
    accountId: opportunity.accountId || '',
    value: opportunity.value,
    stage: opportunity.stage,
    priority: opportunity.priority,
    ownerId: opportunity.ownerId,
    maxCapacity: opportunity.maxCapacity || 0,
    targetCapacity: opportunity.targetCapacity || 0,
    ppaTermYears: opportunity.ppaTermYears || 0,
    epcCost: opportunity.epcCost || 0,
    manualProbability: opportunity.manualProbability || 0,
    projectIRR: opportunity.projectIRR || 0,
    primaryPartnerId: opportunity.primaryPartnerId || '',
    reType: Array.isArray(opportunity.reType) ? opportunity.reType : (opportunity.reType ? [opportunity.reType as any] : []),
    nextAction: opportunity.nextAction || '',
    nextActionDate: opportunity.nextActionDate ? new Date(opportunity.nextActionDate).toISOString().split('T')[0] : '',
    targetDecisionDate: opportunity.targetDecisionDate ? new Date(opportunity.targetDecisionDate).toISOString().split('T')[0] : '',
    clickupLink: opportunity.clickupLink || '',
    googleDriveLink: opportunity.googleDriveLink || '',
    notes: opportunity.notes || '',
    // Thai Taxonomy Classification
    sector: opportunity.sector || '',
    industry: opportunity.industry || '',
    subIndustry: opportunity.subIndustry || '',
  });
  const [saving, setSaving] = useState(false);
  const [taxonomyInfo, setTaxonomyInfo] = useState<{ score: number; points: number } | null>(null);

  const [accountSearch, setAccountSearch] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ name: '', sector: '' });

  // Pre-fill account search with selected account name
  useEffect(() => {
    if (form.accountId) {
      const acc = accounts.find(a => a.id === form.accountId);
      if (acc) setAccountSearch(acc.name);
    }
  }, [form.accountId, accounts]);

  // Filter accounts based on search
  const filteredAccounts = accounts
    .filter(a => a.name.toLowerCase().includes(accountSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 5);

  const handleAccountSelect = (accountId: string, name: string) => {
    setForm(prev => ({ ...prev, accountId }));
    setAccountSearch(name);
  };

  // --- CASCADING LOGIC ---
  const sectors = getSectors();
  
  const industries = form.sector 
    ? getIndustries(form.sector)
    : [];
    
  const subIndustries = form.industry
    ? getSubIndustries(form.industry)
    : [];

  // Update taxonomy info when sub-industry changes
  useEffect(() => {
    if (form.subIndustry) {
      const info = getTaxonomyInfo(form.subIndustry);
      if (info) {
        setTaxonomyInfo({ score: info.score, points: info.points });
      }
    } else {
      setTaxonomyInfo(null);
    }
  }, [form.subIndustry]);

  // Reset dependent fields when parent changes
  const handleSectorChange = (sector: string) => {
    setForm(prev => ({
      ...prev,
      sector,
      industry: '',
      subIndustry: ''
    }));
  };

  const handleIndustryChange = (industry: string) => {
    setForm(prev => ({
      ...prev,
      industry,
      subIndustry: ''
    }));
  };

  const handleSubIndustryChange = (subIndustry: string) => {
    setForm(prev => ({
      ...prev,
      subIndustry
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalAccountId = form.accountId;

      // Create new account if needed
      if (isCreatingAccount && newAccountData.name) {
        const newAcc = await createAccount({
          name: newAccountData.name,
          country: 'Thailand',
          sector: newAccountData.sector || 'Other',
          industry: 'Other',
          subIndustry: 'Other',
          strategicImportance: 'Medium',
          notes: 'Created via Opportunity Form',
          linkedPartnerIds: [],
        });
        finalAccountId = newAcc.id;
      }

      await onSave({
        name: form.name,
        accountId: finalAccountId,
        value: form.value,
        stage: form.stage,
        priority: form.priority,
        ownerId: form.ownerId,
        maxCapacity: form.maxCapacity,
        targetCapacity: form.targetCapacity,
        ppaTermYears: form.ppaTermYears,
        epcCost: form.epcCost,
        manualProbability: form.manualProbability,
        projectIRR: form.projectIRR,
        primaryPartnerId: form.primaryPartnerId || undefined,
        reType: form.reType,
        nextAction: form.nextAction,
        nextActionDate: form.nextActionDate ? new Date(form.nextActionDate) : undefined,
        targetDecisionDate: form.targetDecisionDate ? new Date(form.targetDecisionDate) : undefined,
        clickupLink: form.clickupLink,
        googleDriveLink: form.googleDriveLink,
        notes: form.notes,
        // Thai Taxonomy Classification
        sector: form.sector,
        industry: form.industry,
        subIndustry: form.subIndustry,
      });
    } catch (err) {
      console.error('Failed to save opportunity:', err);
      alert('Failed to save opportunity');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white";
  const selectClass = "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white appearance-none cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Info */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Opportunity Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className={inputClass}
          placeholder="Enter opportunity name"
          required
        />
      </div>

      {/* Account & Partner Section */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Account / Company
        </label>

        {!isCreatingAccount ? (
          <div className="relative">
            <input
              type="text"
              placeholder="Search or create account..."
              className={inputClass}
              value={accountSearch || (accounts.find(a => a.id === form.accountId)?.name || '')}
              onChange={e => {
                setAccountSearch(e.target.value);
                setForm(prev => ({ ...prev, accountId: '' }));
              }}
            />
            {accountSearch && !form.accountId && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.map(acc => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAccountSelect(acc.id, acc.name)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <div className="font-semibold text-gray-900">{acc.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {acc.sector} • {acc.country}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No accounts found
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingAccount(true);
                    setNewAccountData({ ...newAccountData, name: accountSearch });
                  }}
                  className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create new account: "{accountSearch}"
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-emerald-600">Creating New Account</span>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingAccount(false);
                  setAccountSearch('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Account Name</label>
              <input
                type="text"
                value={newAccountData.name}
                onChange={e => setNewAccountData({ ...newAccountData, name: e.target.value })}
                className={inputClass}
                placeholder="Company name"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Sector</label>
              <div className="relative">
                <select
                  value={newAccountData.sector}
                  onChange={e => setNewAccountData({ ...newAccountData, sector: e.target.value })}
                  className={selectClass}
                  required
                >
                  <option value="">-- Select Sector --</option>
                  {getSectors().map(sector => (
                    <option key={sector} value={sector}>
                      {SECTOR_ICONS[sector] || '📁'} {sector}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Primary Partner Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Partner (EPC / Developer)</label>
          <div className="relative">
            <select
              value={form.primaryPartnerId}
              onChange={e => setForm({ ...form, primaryPartnerId: e.target.value })}
              className={selectClass}
            >
              <option value="">-- Select Primary Partner --</option>
              {partners
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.partnerType || 'Partner'})
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Value (฿)</label>
          <input
            type="text"
            inputMode="numeric"
            value={form.value ? Math.round(form.value).toLocaleString('en-US') : ''}
            onChange={e => {
              const numericValue = e.target.value.replace(/[^0-9]/g, '');
              setForm({ ...form, value: numericValue ? Number(numericValue) : 0 });
            }}
            className={inputClass}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Capacity (MW)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.maxCapacity}
            onChange={e => setForm({ ...form, maxCapacity: Number(e.target.value) })}
            className={inputClass}
            placeholder="Customer's theoretical max"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Capacity (MW)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.targetCapacity}
            onChange={e => setForm({ ...form, targetCapacity: Number(e.target.value) })}
            className={inputClass}
            placeholder="What we're willing to offer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project IRR (%)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="100"
            value={form.projectIRR}
            onChange={e => setForm({ ...form, projectIRR: Number(e.target.value) })}
            className={inputClass}
            placeholder="Expected IRR"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Manual Probability (%)</label>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            max="100"
            value={form.manualProbability}
            onChange={e => setForm({ ...form, manualProbability: Number(e.target.value) })}
            className={inputClass}
            placeholder="Leader's commitment %"
          />
        </div>
        <div></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">PPA Term (Years)</label>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={form.ppaTermYears}
            onChange={e => setForm({ ...form, ppaTermYears: Number(e.target.value) })}
            className={inputClass}
            placeholder="PPA duration"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">EPC Cost (THB)</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.epcCost}
            onChange={e => setForm({ ...form, epcCost: Number(e.target.value) })}
            className={inputClass}
            placeholder="Total EPC costs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Stage</label>
          <div className="relative">
            <select
              value={form.stage}
              onChange={e => setForm({ ...form, stage: e.target.value })}
              className={selectClass}
            >
              {stages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
          <div className="relative">
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value as Priority })}
              className={selectClass}
            >
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner / Leader</label>
        <div className="relative">
          <select
            value={form.ownerId}
            onChange={e => setForm({ ...form, ownerId: e.target.value })}
            className={selectClass}
          >
            <option value="">-- Select Owner --</option>
            {users
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Technologies (Select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {RE_OPTIONS.map(type => {
            const isSelected = (form.reType || []).includes(type);
            return (
              <button
                type="button"
                key={type}
                onClick={() => {
                  const current = form.reType || [];
                  const newTypes = isSelected
                    ? current.filter(t => t !== type)
                    : [...current, type];
                  setForm({ ...form, reType: newTypes });
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thai Taxonomy Classification - Cascading Dropdowns */}
      <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <TrendingUp className="w-4 h-4" />
          Industry Classification (Thai Taxonomy)
        </div>

        {/* Sector */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
            Sector
          </label>
          <div className="relative">
            <select 
              value={form.sector} 
              onChange={e => handleSectorChange(e.target.value)} 
              className={selectClass}
            >
              <option value="">-- Select Sector --</option>
              {sectors.map(s => (
                <option key={s} value={s}>
                  {SECTOR_ICONS[s] || '📁'} {s}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Industry - Only show if sector is selected */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
            Industry
          </label>
          <div className="relative">
            <select 
              value={form.industry} 
              onChange={e => handleIndustryChange(e.target.value)} 
              className={`${selectClass} ${!form.sector ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              disabled={!form.sector}
            >
              <option value="">-- Select Industry --</option>
              {industries.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Sub-Industry - Only show if industry is selected */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">
            Sub-Industry
          </label>
          <div className="relative">
            <select 
              value={form.subIndustry} 
              onChange={e => handleSubIndustryChange(e.target.value)} 
              className={`${selectClass} ${!form.industry ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              disabled={!form.industry}
            >
              <option value="">-- Select Sub-Industry --</option>
              {subIndustries.map(si => (
                <option key={si.name} value={si.name}>
                  {si.name} (Score: {si.score}, Points: {si.points})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Credit Score Display */}
        {taxonomyInfo && (
          <div className="flex gap-3 pt-2">
            <div className={`flex-1 rounded-xl p-3 ${getScoreColor(taxonomyInfo.score)}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Credit Score</p>
              <p className="text-2xl font-bold">{taxonomyInfo.score}</p>
              <p className="text-[10px] opacity-70">Lower = Better Credit</p>
            </div>
            <div className={`flex-1 rounded-xl p-3 ${getPointsColor(taxonomyInfo.points)}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Priority Points</p>
              <p className="text-2xl font-bold">{taxonomyInfo.points}</p>
              <p className="text-[10px] opacity-70">Higher = Higher Priority</p>
            </div>
          </div>
        )}

        {!form.sector && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Select a sector to classify this opportunity. This determines credit underwriting parameters.
            </p>
          </div>
        )}
      </div>

      {/* Next Action */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Next Action</label>
        <input 
          type="text" 
          value={form.nextAction} 
          onChange={e => setForm({ ...form, nextAction: e.target.value })} 
          className={inputClass}
          placeholder="What's the next step?"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Next Action Date</label>
          <input
            type="date"
            value={form.nextActionDate}
            onChange={e => setForm({ ...form, nextActionDate: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Decision</label>
          <input
            type="date"
            value={form.targetDecisionDate}
            onChange={e => setForm({ ...form, targetDecisionDate: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      {/* ClickUp Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">ClickUp Link</label>
        <input
          type="url"
          inputMode="url"
          value={form.clickupLink}
          onChange={e => setForm({ ...form, clickupLink: e.target.value })}
          className={inputClass}
          placeholder="https://app.clickup.com/..."
        />
      </div>

      {/* Google Drive Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Drive Link</label>
        <input
          type="url"
          inputMode="url"
          value={form.googleDriveLink}
          onChange={e => setForm({ ...form, googleDriveLink: e.target.value })}
          className={inputClass}
          placeholder="https://drive.google.com/..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
        <textarea
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className={inputClass}
          placeholder="Additional notes about this opportunity..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-3">
        <button 
          type="button" 
          onClick={onCancel} 
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={saving} 
          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Opportunity'}
        </button>
      </div>
    </form>
  );
};
