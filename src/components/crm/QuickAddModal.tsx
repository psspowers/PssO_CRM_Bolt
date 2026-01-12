import React, { useState, useEffect } from 'react';
import { X, StickyNote, Phone, Users, MessageSquare, MapPin, Building2, Briefcase, UserPlus, Target, CheckSquare, Clock, AlertCircle, ChevronDown, TrendingUp, Info, Loader2 } from 'lucide-react';
import { ActivityType, OpportunityStage, Priority, REType, User } from '../../types/crm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getSectors,
  getIndustries,
  getSubIndustries,
  getTaxonomyInfo,
  SECTOR_ICONS,
  getScoreColor,
  getPointsColor
} from '../../data/thaiTaxonomy';

type AddMode = 'activity' | 'entity';
type EntityType = 'Account' | 'Opportunity';
type RelateToType = 'Partner' | 'Account' | 'Opportunity' | 'Contact';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  onAddEntity?: (entityType: EntityType, data: Record<string, any>) => Promise<void>;
  entities?: { partners: {id:string,name:string}[], accounts: {id:string,name:string}[], opportunities: {id:string,name:string; ownerId:string}[], contacts: {id:string,fullName:string}[] };
  users?: User[];
  initialData?: {
    mode?: 'activity' | 'entity';
    isTask?: boolean;
    summary?: string;
    details?: string;
    relateToType?: 'Account' | 'Opportunity';
    relateToId?: string;
  };
}

const activityTypes: { type: ActivityType; icon: React.ElementType; label: string; color: string }[] = [
  { type: 'Note', icon: StickyNote, label: 'Note', color: 'bg-gray-100 text-gray-600' },
  { type: 'Call', icon: Phone, label: 'Call', color: 'bg-blue-100 text-blue-600' },
  { type: 'Meeting', icon: Users, label: 'Meeting', color: 'bg-purple-100 text-purple-600' },
  { type: 'WhatsApp', icon: MessageSquare, label: 'WhatsApp', color: 'bg-green-100 text-green-600' },
  { type: 'Site Visit', icon: MapPin, label: 'Site Visit', color: 'bg-amber-100 text-amber-600' },
];

const stages: OpportunityStage[] = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const priorities: Priority[] = ['Low', 'Medium', 'High'];
const reTypes: REType[] = ['Solar - Rooftop', 'Solar - Ground', 'Solar - Floating'];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, onAdd, onAddEntity, entities, users = [], initialData }) => {
  const { profile } = useAuth();
  const [mode, setMode] = useState<AddMode>('activity');
  const [entityType, setEntityType] = useState<EntityType>('Account');
  const [isTask, setIsTask] = useState(false);
  const [selectedType, setSelectedType] = useState<ActivityType>('Note');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [relateToType, setRelateToType] = useState<RelateToType>('Partner');
  const [relateToId, setRelateToId] = useState('');
  const [saving, setSaving] = useState(false);

  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const [filteredOpportunities, setFilteredOpportunities] = useState<{id: string; name: string; ownerId: string}[]>([]);

  // Account form state
  const [accountForm, setAccountForm] = useState({
    name: '',
    country: 'Thailand',
    sector: '',
    industry: '',
    subIndustry: '',
    strategicImportance: 'Medium' as Priority,
    notes: '',
  });

  // Opportunity form state
  const [oppForm, setOppForm] = useState({
    name: '',
    accountId: '',
    value: 0,
    stage: 'Prospect' as OpportunityStage,
    priority: 'Medium' as Priority,
    targetCapacity: 0,
    reType: 'Solar - Rooftop' as REType,
    sector: '',
    industry: '',
    subIndustry: '',
    nextAction: '',
    nextActionDate: '',
    clickupLink: '',
    notes: '',
  });

  const [taxonomyInfo, setTaxonomyInfo] = useState<{ score: number; points: number } | null>(null);

  // Taxonomy cascading logic
  const sectors = getSectors();
  const accountIndustries = accountForm.sector ? getIndustries(accountForm.sector) : [];
  const accountSubIndustries = accountForm.industry ? getSubIndustries(accountForm.industry) : [];
  const oppIndustries = oppForm.sector ? getIndustries(oppForm.sector) : [];
  const oppSubIndustries = oppForm.industry ? getSubIndustries(oppForm.industry) : [];

  // Update taxonomy info when sub-industry changes
  useEffect(() => {
    const subIndustry = entityType === 'Account' ? accountForm.subIndustry : oppForm.subIndustry;
    if (subIndustry) {
      const info = getTaxonomyInfo(subIndustry);
      if (info) {
        setTaxonomyInfo({ score: info.score, points: info.points });
      }
    } else {
      setTaxonomyInfo(null);
    }
  }, [accountForm.subIndustry, oppForm.subIndustry, entityType]);

  // Initialize or reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Pre-fill from props
        setMode(initialData.mode || 'activity');
        setIsTask(initialData.isTask || false);
        setSummary(initialData.summary || '');
        setDetails(initialData.details || '');
        if (initialData.relateToType) setRelateToType(initialData.relateToType);
        if (initialData.relateToId) setRelateToId(initialData.relateToId);
      } else {
        // Reset to defaults
        setMode('activity');
        setIsTask(false);
        setSummary('');
        setDetails('');
        setRelateToId('');
        setAssignedToId('');
        setSelectedType('Note');
        setDueDate('');
        setPriority('Medium');
      }
    } else {
      // Reset everything when modal closes
      setAccountForm({
        name: '',
        country: 'Thailand',
        sector: '',
        industry: '',
        subIndustry: '',
        strategicImportance: 'Medium',
        notes: '',
      });
      setOppForm({
        name: '',
        accountId: '',
        value: 0,
        stage: 'Prospect',
        priority: 'Medium',
        targetCapacity: 0,
        reType: 'Solar - Rooftop',
        sector: '',
        industry: '',
        subIndustry: '',
        nextAction: '',
        nextActionDate: '',
        clickupLink: '',
        notes: '',
      });
      setSummary('');
      setDetails('');
      setRelateToId('');
      setIsTask(false);
      setTaxonomyInfo(null);
      setAssignedToId('');
      setFilteredOpportunities([]);
      setMode('activity');
      setSelectedType('Note');
      setDueDate('');
      setPriority('Medium');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const filterOpportunitiesByAssignee = () => {
      const targetUserId = assignedToId || profile?.id;
      if (!targetUserId || !isTask || !entities?.opportunities) {
        setFilteredOpportunities([]);
        return;
      }

      console.log('Filtering opportunities for user:', targetUserId, 'assignedToId:', assignedToId, 'profile?.id:', profile?.id);
      const filtered = entities.opportunities
        .filter(opp => opp.ownerId === targetUserId)
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log('Filtered opportunities:', filtered);
      setFilteredOpportunities(filtered);
    };

    filterOpportunitiesByAssignee();
  }, [assignedToId, profile?.id, isTask, entities?.opportunities]);

  if (!isOpen) return null;

  const handleAccountSectorChange = (sector: string) => {
    setAccountForm(prev => ({ ...prev, sector, industry: '', subIndustry: '' }));
  };

  const handleAccountIndustryChange = (industry: string) => {
    setAccountForm(prev => ({ ...prev, industry, subIndustry: '' }));
  };

  const handleOppSectorChange = (sector: string) => {
    setOppForm(prev => ({ ...prev, sector, industry: '', subIndustry: '' }));
  };

  const handleOppIndustryChange = (industry: string) => {
    setOppForm(prev => ({ ...prev, industry, subIndustry: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'activity') {
      onAdd({
        type: selectedType,
        summary,
        details,
        relatedToType: relateToType,
        relatedToId: relateToId,
        isTask,
        assignedToId: isTask ? assignedToId : null,
        dueDate: isTask ? dueDate : null,
        priority: isTask ? priority : null,
        taskStatus: isTask ? 'Pending' : null
      });
      setSummary(''); setDetails(''); setRelateToId(''); setIsTask(false);
      onClose();
    } else if (mode === 'entity' && onAddEntity) {
      setSaving(true);
      try {
        if (entityType === 'Account') {
          await onAddEntity('Account', {
            name: accountForm.name,
            country: accountForm.country,
            sector: accountForm.sector,
            industry: accountForm.industry,
            subIndustry: accountForm.subIndustry,
            strategicImportance: accountForm.strategicImportance,
            notes: accountForm.notes,
            linkedPartnerIds: [],
          });
        } else {
          await onAddEntity('Opportunity', {
            name: oppForm.name,
            accountId: oppForm.accountId,
            value: oppForm.value,
            stage: oppForm.stage,
            priority: oppForm.priority,
            targetCapacity: oppForm.targetCapacity,
            reType: oppForm.reType,
            sector: oppForm.sector,
            industry: oppForm.industry,
            subIndustry: oppForm.subIndustry,
            nextAction: oppForm.nextAction,
            nextActionDate: oppForm.nextActionDate ? new Date(oppForm.nextActionDate) : undefined,
            clickupLink: oppForm.clickupLink,
            notes: oppForm.notes,
            ownerId: profile?.id || '',
            linkedPartnerIds: [],
          });
        }
        onClose();
      } catch (error) {
        console.error('Error creating entity:', error);
        alert('Error creating ' + entityType + ': ' + (error as Error).message);
      } finally {
        setSaving(false);
      }
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white text-sm";
  const selectClass = "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white appearance-none cursor-pointer text-sm";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-900">Quick Add</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex border-b border-gray-200">
          <button onClick={() => setMode('activity')} className={`flex-1 py-3 text-sm font-bold ${mode === 'activity' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500'}`}>Activity / Task</button>
          <button onClick={() => setMode('entity')} className={`flex-1 py-3 text-sm font-bold ${mode === 'entity' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500'}`}>New Customer/Deal</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-10">
          {mode === 'activity' && (
            <>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex items-center gap-2 text-orange-700">
                  <CheckSquare className="w-5 h-5" />
                  <span className="font-bold text-sm">Convert to Task?</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isTask} 
                  onChange={(e) => setIsTask(e.target.checked)}
                  className="w-5 h-5 accent-orange-500"
                />
              </div>

              <div className="grid grid-cols-5 gap-2">
                {activityTypes.map(({ type, icon: Icon, label, color }) => (
                  <button key={type} type="button" onClick={() => setSelectedType(type)} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${selectedType === type ? 'ring-2 ring-orange-500 ' + color : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <Icon className="w-5 h-5" /><span className="text-[10px] font-medium">{label}</span>
                  </button>
                ))}
              </div>

              {isTask && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Assign To</label>
                      <select
                        value={assignedToId}
                        onChange={e => {
                          console.log('Assignee changed to:', e.target.value);
                          setAssignedToId(e.target.value);
                          setRelateToId('');
                        }}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                        required={isTask}
                      >
                        <option value="">Select Member...</option>
                        {profile && <option value={profile.id}>Me, Myself & I</option>}
                        {users
                          .filter(u => u.id !== profile?.id)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Priority</label>
                      <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as any)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Link to Opportunity</label>
                    <select
                      value={relateToType === 'Opportunity' ? relateToId : ''}
                      onChange={e => {
                        if (e.target.value) {
                          setRelateToType('Opportunity');
                          setRelateToId(e.target.value);
                        } else {
                          setRelateToId('');
                        }
                      }}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">-- Select Opportunity (Optional) --</option>
                      {filteredOpportunities.map(opp => (
                        <option key={opp.id} value={opp.id}>{opp.name}</option>
                      ))}
                      {filteredOpportunities.length === 0 && (
                        <option value="" disabled>No opportunities found for this user</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Deadline</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white"
                      required={isTask}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {!isTask && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">Link to Opportunity *</label>
                    <div className="relative">
                      <select
                        value={relateToType === 'Opportunity' ? relateToId : ''}
                        onChange={e => {
                          if (e.target.value) {
                            setRelateToType('Opportunity');
                            setRelateToId(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white"
                        required
                      >
                        <option value="">-- Select Opportunity --</option>
                        {entities?.opportunities
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(opp => (
                            <option key={opp.id} value={opp.id}>{opp.name}</option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder={isTask ? "What needs to be done?" : "Summary of activity..."}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Additional details (optional)..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none outline-none"
                />
              </div>

              <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95">
                {isTask ? 'Create Task' : 'Log Activity'}
              </button>
            </>
          )}

          {mode === 'entity' && (
            <>
              {/* Entity Type Toggle */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntityType('Account')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    entityType === 'Account' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setEntityType('Opportunity')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    entityType === 'Opportunity' 
                      ? 'bg-white text-orange-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  Deal
                </button>
              </div>

              {entityType === 'Account' && (
                <div className="space-y-4">
                  {/* Account Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Customer Name *</label>
                    <input 
                      type="text" 
                      value={accountForm.name} 
                      onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} 
                      className={inputClass} 
                      placeholder="e.g. Thai Textile Group Co., Ltd."
                      required 
                    />
                  </div>

                  {/* Country & Importance */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Country</label>
                      <div className="relative">
                        <select 
                          value={accountForm.country} 
                          onChange={e => setAccountForm({ ...accountForm, country: e.target.value })} 
                          className={selectClass}
                        >
                          <option value="Thailand">Thailand</option>
                          <option value="Vietnam">Vietnam</option>
                          <option value="Indonesia">Indonesia</option>
                          <option value="Malaysia">Malaysia</option>
                          <option value="Philippines">Philippines</option>
                          <option value="Singapore">Singapore</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Importance</label>
                      <div className="relative">
                        <select 
                          value={accountForm.strategicImportance} 
                          onChange={e => setAccountForm({ ...accountForm, strategicImportance: e.target.value as Priority })} 
                          className={selectClass}
                        >
                          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Thai Taxonomy Classification */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <TrendingUp className="w-4 h-4" />
                      Industry Classification
                    </div>

                    {/* Sector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Sector *</label>
                      <div className="relative">
                        <select 
                          value={accountForm.sector} 
                          onChange={e => handleAccountSectorChange(e.target.value)} 
                          className={selectClass}
                          required
                        >
                          <option value="">-- Select Sector --</option>
                          {sectors.map(s => (
                            <option key={s} value={s}>{SECTOR_ICONS[s] || ''} {s}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Industry */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Industry</label>
                      <div className="relative">
                        <select 
                          value={accountForm.industry} 
                          onChange={e => handleAccountIndustryChange(e.target.value)} 
                          className={`${selectClass} ${!accountForm.sector ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={!accountForm.sector}
                        >
                          <option value="">-- Select Industry --</option>
                          {accountIndustries.map(i => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sub-Industry */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Sub-Industry</label>
                      <div className="relative">
                        <select 
                          value={accountForm.subIndustry} 
                          onChange={e => setAccountForm({ ...accountForm, subIndustry: e.target.value })} 
                          className={`${selectClass} ${!accountForm.industry ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={!accountForm.industry}
                        >
                          <option value="">-- Select Sub-Industry --</option>
                          {accountSubIndustries.map(si => (
                            <option key={si.name} value={si.name}>
                              {si.name} (Score: {si.score})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Credit Score Display */}
                    {taxonomyInfo && entityType === 'Account' && (
                      <div className="flex gap-3 pt-2">
                        <div className={`flex-1 rounded-xl p-3 ${getScoreColor(taxonomyInfo.score)}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Credit Score</p>
                          <p className="text-xl font-bold">{taxonomyInfo.score}</p>
                        </div>
                        <div className={`flex-1 rounded-xl p-3 ${getPointsColor(taxonomyInfo.points)}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Priority</p>
                          <p className="text-xl font-bold">{taxonomyInfo.points}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Notes</label>
                    <textarea 
                      value={accountForm.notes} 
                      onChange={e => setAccountForm({ ...accountForm, notes: e.target.value })} 
                      rows={2} 
                      className={inputClass}
                      placeholder="Additional notes about this customer..."
                    />
                  </div>
                </div>
              )}

              {entityType === 'Opportunity' && (
                <div className="space-y-4">
                  {/* Deal Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Deal Name *</label>
                    <input 
                      type="text" 
                      value={oppForm.name} 
                      onChange={e => setOppForm({ ...oppForm, name: e.target.value })} 
                      className={inputClass} 
                      placeholder="e.g. 5MW Rooftop Solar Project"
                      required 
                    />
                  </div>

                  {/* Link to Customer */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Customer *</label>
                    <div className="relative">
                      <select
                        value={oppForm.accountId}
                        onChange={e => setOppForm({ ...oppForm, accountId: e.target.value })}
                        className={selectClass}
                        required
                      >
                        <option value="">-- Select Customer --</option>
                        {entities?.accounts
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Value & Capacity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">PPA Value ($)</label>
                      <input 
                        type="number" 
                        value={oppForm.value} 
                        onChange={e => setOppForm({ ...oppForm, value: Number(e.target.value) })} 
                        className={inputClass} 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Capacity (MW)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={oppForm.targetCapacity} 
                        onChange={e => setOppForm({ ...oppForm, targetCapacity: Number(e.target.value) })} 
                        className={inputClass} 
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Stage & Priority */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Stage</label>
                      <div className="relative">
                        <select 
                          value={oppForm.stage} 
                          onChange={e => setOppForm({ ...oppForm, stage: e.target.value as OpportunityStage })} 
                          className={selectClass}
                        >
                          {stages.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Priority</label>
                      <div className="relative">
                        <select 
                          value={oppForm.priority} 
                          onChange={e => setOppForm({ ...oppForm, priority: e.target.value as Priority })} 
                          className={selectClass}
                        >
                          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* RE Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">RE Type</label>
                    <div className="relative">
                      <select 
                        value={oppForm.reType} 
                        onChange={e => setOppForm({ ...oppForm, reType: e.target.value as REType })} 
                        className={selectClass}
                      >
                        {reTypes.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Thai Taxonomy Classification */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <TrendingUp className="w-4 h-4" />
                      Industry Classification
                    </div>

                    {/* Sector */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Sector</label>
                      <div className="relative">
                        <select 
                          value={oppForm.sector} 
                          onChange={e => handleOppSectorChange(e.target.value)} 
                          className={selectClass}
                        >
                          <option value="">-- Select Sector --</option>
                          {sectors.map(s => (
                            <option key={s} value={s}>{SECTOR_ICONS[s] || ''} {s}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Industry */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Industry</label>
                      <div className="relative">
                        <select 
                          value={oppForm.industry} 
                          onChange={e => handleOppIndustryChange(e.target.value)} 
                          className={`${selectClass} ${!oppForm.sector ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={!oppForm.sector}
                        >
                          <option value="">-- Select Industry --</option>
                          {oppIndustries.map(i => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sub-Industry */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Sub-Industry</label>
                      <div className="relative">
                        <select 
                          value={oppForm.subIndustry} 
                          onChange={e => setOppForm({ ...oppForm, subIndustry: e.target.value })} 
                          className={`${selectClass} ${!oppForm.industry ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={!oppForm.industry}
                        >
                          <option value="">-- Select Sub-Industry --</option>
                          {oppSubIndustries.map(si => (
                            <option key={si.name} value={si.name}>
                              {si.name} (Score: {si.score})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Credit Score Display */}
                    {taxonomyInfo && entityType === 'Opportunity' && (
                      <div className="flex gap-3 pt-2">
                        <div className={`flex-1 rounded-xl p-3 ${getScoreColor(taxonomyInfo.score)}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Credit Score</p>
                          <p className="text-xl font-bold">{taxonomyInfo.score}</p>
                        </div>
                        <div className={`flex-1 rounded-xl p-3 ${getPointsColor(taxonomyInfo.points)}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Priority</p>
                          <p className="text-xl font-bold">{taxonomyInfo.points}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Next Action */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Next Action</label>
                    <input 
                      type="text" 
                      value={oppForm.nextAction} 
                      onChange={e => setOppForm({ ...oppForm, nextAction: e.target.value })} 
                      className={inputClass}
                      placeholder="What's the next step?"
                    />
                  </div>

                  {/* Next Action Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Next Action Date</label>
                    <input
                      type="date"
                      value={oppForm.nextActionDate}
                      onChange={e => setOppForm({ ...oppForm, nextActionDate: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  {/* ClickUp Link */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">ClickUp Link</label>
                    <input
                      type="url"
                      value={oppForm.clickupLink}
                      onChange={e => setOppForm({ ...oppForm, clickupLink: e.target.value })}
                      className={inputClass}
                      placeholder="https://app.clickup.com/..."
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Notes</label>
                    <textarea
                      value={oppForm.notes}
                      onChange={e => setOppForm({ ...oppForm, notes: e.target.value })}
                      rows={2}
                      className={inputClass}
                      placeholder="Additional notes about this deal..."
                    />
                  </div>
                </div>
              )}

              {/* Submit Button for Entity */}
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {entityType === 'Account' ? <Building2 className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                    Create {entityType === 'Account' ? 'Customer' : 'Deal'}
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
