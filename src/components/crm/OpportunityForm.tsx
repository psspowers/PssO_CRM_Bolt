import React, { useState, useEffect } from 'react';
import { Save, X, Loader2, ChevronDown, TrendingUp, Info } from 'lucide-react';
import { Opportunity, OpportunityStage, Priority, REType } from '../../types/crm';
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

const stages: string[] = [
  'Discovery',
  'Pre-Dev',
  'Development',
  'Contract',
  'Won',
  'Engineering',
  'Permit - EPC',
  'Construction',
  'Commissioning',
  'Operational',
  'Lost'
];
const priorities: Priority[] = ['Low', 'Medium', 'High'];
const reTypes: REType[] = ['Solar - Rooftop', 'Solar - Ground', 'Solar - Floating'];

export const OpportunityForm: React.FC<OpportunityFormProps> = ({ opportunity, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: opportunity.name,
    value: opportunity.value,
    stage: opportunity.stage,
    priority: opportunity.priority,
    targetCapacity: opportunity.targetCapacity || 0,
    reType: opportunity.reType,
    nextAction: opportunity.nextAction || '',
    nextActionDate: opportunity.nextActionDate ? new Date(opportunity.nextActionDate).toISOString().split('T')[0] : '',
    targetDecisionDate: opportunity.targetDecisionDate ? new Date(opportunity.targetDecisionDate).toISOString().split('T')[0] : '',
    clickupLink: opportunity.clickupLink || '',
    notes: opportunity.notes || '',
    // Thai Taxonomy Classification
    sector: opportunity.sector || '',
    industry: opportunity.industry || '',
    subIndustry: opportunity.subIndustry || '',
  });
  const [saving, setSaving] = useState(false);
  const [taxonomyInfo, setTaxonomyInfo] = useState<{ score: number; points: number } | null>(null);

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
      await onSave({
        name: form.name,
        value: form.value,
        stage: form.stage,
        priority: form.priority,
        targetCapacity: form.targetCapacity,
        reType: form.reType,
        nextAction: form.nextAction,
        nextActionDate: form.nextActionDate ? new Date(form.nextActionDate) : undefined,
        targetDecisionDate: form.targetDecisionDate ? new Date(form.targetDecisionDate) : undefined,
        clickupLink: form.clickupLink,
        notes: form.notes,
        // Thai Taxonomy Classification
        sector: form.sector,
        industry: form.industry,
        subIndustry: form.subIndustry,
      });
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Value ($)</label>
          <input
            type="number"
            inputMode="decimal"
            value={form.value}
            onChange={e => setForm({ ...form, value: Number(e.target.value) })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Capacity (MW)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={form.targetCapacity}
            onChange={e => setForm({ ...form, targetCapacity: Number(e.target.value) })} 
            className={inputClass} 
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
        <label className="block text-sm font-medium text-gray-700 mb-1.5">RE Type</label>
        <div className="relative">
          <select 
            value={form.reType} 
            onChange={e => setForm({ ...form, reType: e.target.value as REType })} 
            className={selectClass}
          >
            {reTypes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
