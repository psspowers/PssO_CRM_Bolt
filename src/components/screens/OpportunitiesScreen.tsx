import React, { useState, useMemo, useEffect } from 'react';
import { 
  SearchBar, 
  OpportunityCard, 
  FilterModal, 
  DetailModal, 
  OpportunityForm, 
  LoadAnalyzer, 
  MediaVault, 
  QualityGate, 
  InvestmentModeler,
  CreditRiskHub 
} from '../crm';
import { useAppContext } from '../../contexts/AppContext';
import { Opportunity } from '../../types/crm';
import { 
  DollarSign, 
  Zap, 
  Loader2, 
  CheckSquare, 
  Square, 
  X, 
  Trash2, 
  Pencil, 
  ShieldCheck, 
  PieChart,
  LayoutGrid,
  List,
  Users,
  User,
  Info
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

// Added forcedOpenId to the Props interface
interface OpportunitiesScreenProps {
  forcedOpenId?: string | null;
}

export const OpportunitiesScreen: React.FC<OpportunitiesScreenProps> = ({ forcedOpenId }) => {
  const {
    opportunities,
    accounts,
    contacts,
    partners,
    activities,
    relationships,
    users,
    loading,
    deleteOpportunity,
    updateOpportunity,
    canDelete,
    canEdit
  } = useAppContext();

  // Get current logged-in user from AuthContext
  const { user, profile } = useAuth();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // NEW: Hierarchy View Filter State
  // 'mine' = Only deals owned by the current user
  // 'team' = All deals visible to the user (includes subordinates' deals via RLS)
  const [hierarchyView, setHierarchyView] = useState<'mine' | 'team'>('mine');
  
  // Track subordinate IDs for the team view
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  // Fetch subordinates when component mounts or user changes
  // This uses the user_hierarchy table populated by the org-hierarchy edge function
  useEffect(() => {
    const fetchSubordinates = async () => {
      if (!user?.id) return;
      
      setLoadingSubordinates(true);
      try {
        // Query the user_hierarchy table to get all subordinates
        // The user_hierarchy table stores: manager_id, subordinate_id, depth
        const { data, error } = await supabase
          .from('user_hierarchy')
          .select('subordinate_id')
          .eq('manager_id', user.id);
        
        if (error) {
          console.error('Error fetching subordinates:', error);
          setSubordinateIds([]);
        } else {
          const ids = data?.map(row => row.subordinate_id) || [];
          setSubordinateIds(ids);
        }
      } catch (err) {
        console.error('Failed to fetch subordinates:', err);
        setSubordinateIds([]);
      } finally {
        setLoadingSubordinates(false);
      }
    };

    fetchSubordinates();
  }, [user?.id]);

  // --- DEEP LINKING LOGIC ---
  // This hook "watches" for an ID coming from a notification click
  useEffect(() => {
    if (forcedOpenId && opportunities.length > 0) {
      const target = opportunities.find(o => o.id === forcedOpenId);
      if (target) {
        setSelectedOpp(target);
        setIsEditing(false); // Ensure we open in View mode, not Edit mode
      }
    }
  }, [forcedOpenId, opportunities]);

  const userCanDelete = canDelete();
  const userCanEdit = selectedOpp ? canEdit(selectedOpp.ownerId) : false;

  // Get the linked account for the selected opportunity
  const linkedAccount = selectedOpp ? accounts.find(a => a.id === selectedOpp.accountId) : null;

  // FILTERED OPPORTUNITIES with Hierarchy View
  // This is the key integration point with the org hierarchy system:
  // - 'mine': Shows only deals where ownerId matches the current user
  // - 'team': Shows all deals visible to the user (own + subordinates)
  //   The subordinate filtering is done client-side using the user_hierarchy table data
  //   In production, RLS policies would handle this at the database level
  const filtered = useMemo(() => {
    return opportunities.filter(o => {
    // 0. OPPORTUNITY STAGE FILTER - Only show pre-win opportunities
    // Pre-win stages: Prospect, Qualified, Proposal, Negotiation, Term Sheet, Lost
    // Exclude Won and project stages (Engineering, Permit/EPC, Construction, Commissioning, Operational)
    const preWinStages = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Lost'];
    if (!preWinStages.includes(o.stage)) return false;

    // 1. HIERARCHY FILTER - Filter based on ownership/team view
    if (hierarchyView === 'mine') {
      // "My Deals" - Only show deals owned by the current user
      if (o.ownerId !== user?.id) return false;
    } else {
      // "Team Deals" - Show deals owned by the user OR their subordinates
      // This includes:
      // - Deals owned by the current user
      // - Deals owned by anyone in their subordinate chain (from user_hierarchy)
      const isMyDeal = o.ownerId === user?.id;
      const isSubordinateDeal = subordinateIds.includes(o.ownerId);

      if (!isMyDeal && !isSubordinateDeal) return false;
    }

    // 2. SEARCH FILTER - Match against deal name or account name
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
                          accounts.find(a => a.id === o.accountId)?.name.toLowerCase().includes(search.toLowerCase());

    // 3. STAGE FILTER
    const matchesStage = stageFilter === 'all' || o.stage === stageFilter;

    // 4. PRIORITY FILTER
    const matchesPriority = priorityFilter === 'all' || o.priority === priorityFilter;

    return matchesSearch && matchesStage && matchesPriority;
  });
  }, [opportunities, accounts, search, stageFilter, priorityFilter, hierarchyView, user?.id, subordinateIds]);

  // Calculate stats for the header (only count pre-win opportunities)
  const preWinStages = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Lost'];
  const myDealsCount = useMemo(() =>
    opportunities.filter(o => o.ownerId === user?.id && preWinStages.includes(o.stage)).length,
    [opportunities, user?.id]
  );

  const teamDealsCount = useMemo(() =>
    opportunities.filter(o => (o.ownerId === user?.id || subordinateIds.includes(o.ownerId)) && preWinStages.includes(o.stage)).length,
    [opportunities, user?.id, subordinateIds]
  );

  const deletableOpps = filtered.filter(o => canDelete(o.ownerId));
  const allSelected = deletableOpps.length > 0 && deletableOpps.every(o => selectedIds.has(o.id));

  const formatValue = (val: number) => {
    const num = Number(val) || 0;
    return num >= 1000000 ? `฿${(num / 1000000).toFixed(2)}M` : `฿${(num / 1000).toFixed(0)}K`;
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => { const next = new Set(prev); selected ? next.add(id) : next.delete(id); return next; });
  };

  const handleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(deletableOpps.map(o => o.id)));
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try { 
      await Promise.all(Array.from(selectedIds).map(id => deleteOpportunity(id))); 
      exitSelectionMode(); 
      setShowBulkDeleteDialog(false); 
    }
    catch (e) { console.error('Bulk delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleSaveOpportunity = async (updates: Partial<Opportunity>) => {
    if (selectedOpp) {
      await updateOpportunity(selectedOpp.id, updates);
      setSelectedOpp({ ...selectedOpp, ...updates });
      setIsEditing(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedOpp) return;
    const currentMilestones = selectedOpp.completedMilestones || [];
    const updatedMilestones = currentMilestones.includes(milestoneId)
      ? currentMilestones.filter(id => id !== milestoneId)
      : [...currentMilestones, milestoneId];
    await updateOpportunity(selectedOpp.id, { completedMilestones: updatedMilestones });
    setSelectedOpp({ ...selectedOpp, completedMilestones: updatedMilestones });
  };

  const handleLostReasonChange = async (reason: string) => {
    if (!selectedOpp) return;
    await updateOpportunity(selectedOpp.id, { lostReason: reason });
    setSelectedOpp({ ...selectedOpp, lostReason: reason });
  };

  const handleAdvanceStage = async () => {
    if (!selectedOpp) return;

    const stageProgression: Record<string, string | null> = {
      'Prospect': 'Qualified',
      'Qualified': 'Proposal',
      'Proposal': 'Negotiation',
      'Negotiation': 'Term Sheet',
      'Term Sheet': 'Won',
      'Won': null,
      'Lost': null
    };

    const nextStage = stageProgression[selectedOpp.stage];
    if (!nextStage) return;

    await updateOpportunity(selectedOpp.id, {
      stage: nextStage,
      completedMilestones: []
    });
    setSelectedOpp({ ...selectedOpp, stage: nextStage, completedMilestones: [] });
  };

  const handleCloseModal = () => { setSelectedOpp(null); setIsEditing(false); };

  // Get owner name for display
  const getOwnerName = (ownerId: string): string => {
    const owner = users.find(u => u.id === ownerId);
    return owner?.name || 'Unknown';
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Selection Toolbar */}
      {selectionMode ? (
        <div className="flex items-center justify-between bg-orange-50 rounded-xl lg:rounded-2xl p-4 border border-orange-200">
          <div className="flex items-center gap-3">
            <button onClick={exitSelectionMode} className="p-2 hover:bg-orange-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-bold text-orange-800">{selectedIds.size} Selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSelectAll} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 rounded-xl transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <button 
              onClick={() => setShowBulkDeleteDialog(true)} 
              disabled={selectedIds.size === 0} 
              className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* NEW: Hierarchy View Toggle - My Deals vs Team Deals */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* View Toggle Buttons */}
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button 
                  onClick={() => setHierarchyView('mine')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    hierarchyView === 'mine' 
                      ? 'bg-white shadow-sm text-orange-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>My Deals</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    hierarchyView === 'mine' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {myDealsCount}
                  </span>
                </button>
                <button 
                  onClick={() => setHierarchyView('team')}
                  disabled={loadingSubordinates}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    hierarchyView === 'team' 
                      ? 'bg-white shadow-sm text-orange-600' 
                      : 'text-slate-500 hover:text-slate-700'
                  } ${loadingSubordinates ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Users className="w-4 h-4" />
                  <span>Team Deals</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    hierarchyView === 'team' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {loadingSubordinates ? '...' : teamDealsCount}
                  </span>
                </button>
              </div>
              
              {/* Info Tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">
                      <strong>My Deals:</strong> Opportunities you own<br />
                      <strong>Team Deals:</strong> Your deals + deals owned by your direct and indirect reports (based on org hierarchy)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-3 flex-1 lg:flex-none lg:max-w-md">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} placeholder="Search deals..." onFilterClick={() => setShowFilter(true)} />
              </div>
              <div className="flex items-center gap-2">
                {/* View Toggle - Desktop Only */}
                <div className="hidden lg:flex items-center bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                    aria-label="List view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                </div>
                {userCanDelete && (
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-orange-500 hover:border-orange-200 transition-colors shadow-sm"
                    aria-label="Bulk select"
                  >
                    <CheckSquare className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team View Info Banner */}
          {hierarchyView === 'team' && subordinateIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Viewing deals from your team ({subordinateIds.length} {subordinateIds.length === 1 ? 'subordinate' : 'subordinates'} based on org hierarchy)
              </p>
            </div>
          )}
          
          {hierarchyView === 'team' && subordinateIds.length === 0 && !loadingSubordinates && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                No subordinates found in your hierarchy. Ask an admin to set up reporting relationships in the Org Chart.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stage Fast-Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        {['all', 'Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Won', 'Lost'].map(stage => (
          <button
            key={stage}
            onClick={() => setStageFilter(stage)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              stageFilter === stage
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {stage === 'all' ? 'All Stages' : stage}
          </button>
        ))}
      </div>

      {/* Results Count with Owner Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> {hierarchyView === 'mine' ? 'of your' : 'team'} deals
        </p>
        {hierarchyView === 'team' && filtered.length > 0 && (
          <p className="text-xs text-slate-400">
            Grouped by owner
          </p>
        )}
      </div>

      {/* Deals Grid/List */}
      <div className={viewMode === 'grid' && !selectionMode ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
        {filtered.map(opp => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            accountName={accounts.find(a => a.id === opp.accountId)?.name}
            ownerName={getOwnerName(opp.ownerId)}
            onClick={() => !selectionMode && setSelectedOpp(opp)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {hierarchyView === 'mine' ? 'No deals found' : 'No team deals found'}
          </h3>
          <p className="text-slate-500">
            {hierarchyView === 'mine' 
              ? 'Try adjusting your filters or search query' 
              : subordinateIds.length === 0 
                ? 'You have no subordinates in the org hierarchy yet'
                : 'Try adjusting your filters or search query'}
          </p>
        </div>
      )}

      {/* INVESTOR DETAIL MODAL */}
      <DetailModal 
        isOpen={!!selectedOpp} 
        onClose={handleCloseModal} 
        title={selectedOpp?.name || ''} 
        subtitle={linkedAccount?.name || 'Unlinked Account'} 
        entityId={selectedOpp?.id || ''}
        entityType="Opportunity"
        clickupLink={selectedOpp?.clickupLink}
        activities={activities}
        users={users}
        contacts={contacts}
        accounts={accounts}
        partners={partners}
        relationships={relationships}
      >
        {selectedOpp && (isEditing ? (
          <OpportunityForm opportunity={selectedOpp} onSave={handleSaveOpportunity} onCancel={() => setIsEditing(false)} />
        ) : (
          <div className="space-y-6 pb-20">
            {/* Owner Info Banner (for team deals not owned by current user) */}
            {selectedOpp.ownerId !== user?.id && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Owned by {getOwnerName(selectedOpp.ownerId)}
                  </p>
                  <p className="text-xs text-blue-600">
                    You're viewing this deal as their manager
                  </p>
                </div>
              </div>
            )}

            <Tabs defaultValue="underwriting" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1 rounded-2xl">
                <TabsTrigger value="underwriting" className="text-[10px] font-black uppercase flex gap-1"><ShieldCheck className="w-3 h-3" /> Risk</TabsTrigger>
                <TabsTrigger value="technical" className="text-[10px] font-black uppercase flex gap-1"><Zap className="w-3 h-3" /> Tech</TabsTrigger>
                <TabsTrigger value="financial" className="text-[10px] font-black uppercase flex gap-1"><PieChart className="w-3 h-3" /> Math</TabsTrigger>
              </TabsList>

              <TabsContent value="underwriting" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <QualityGate
                  currentStage={selectedOpp.stage}
                  completedItems={selectedOpp.completedMilestones || []}
                  onToggleItem={handleToggleMilestone}
                  lostReason={selectedOpp.lostReason}
                  onLostReasonChange={handleLostReasonChange}
                  onAdvanceStage={handleAdvanceStage}
                />
                <CreditRiskHub 
                  sector={selectedOpp.sector || 'Other Industrial'} 
                  accountName={linkedAccount?.name || 'this entity'} 
                  subIndustry={selectedOpp.subIndustry}
                />
              </TabsContent>

              <TabsContent value="technical" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <LoadAnalyzer 
                  initialDays={selectedOpp.operatingDays} 
                />
                <MediaVault />
              </TabsContent>

              <TabsContent value="financial" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">PPA Value</p>
                    <p className="text-xl font-black text-gray-900">{formatValue(selectedOpp.value)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Capacity</p>
                    <p className="text-xl font-black text-gray-900">{selectedOpp.targetCapacity || 0} MW</p>
                  </div>
                </div>
                <InvestmentModeler 
                  initialCapacity={selectedOpp.targetCapacity ? selectedOpp.targetCapacity * 1000 : 11300}
                />
              </TabsContent>
            </Tabs>

            {userCanEdit && (
              <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all">
                <Pencil className="w-4 h-4" /> Edit Deal Parameters
              </button>
            )}

            {selectedOpp.notes && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Internal Notes</p>
                <p className="text-sm text-amber-900 leading-relaxed">{selectedOpp.notes}</p>
              </div>
            )}
          </div>
        ))}
      </DetailModal>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>Terminating these deals is permanent. This action will be logged in the audit trail.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600">
              {isDeleting ? 'Processing...' : 'Confirm Termination'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FilterModal isOpen={showFilter} onClose={() => setShowFilter(false)} title="Pipeline Filters" filters={[{ name: 'Priority', options: [{ label: 'All', value: 'all' }, { label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }], selected: priorityFilter, onChange: setPriorityFilter }]} onReset={() => { setStageFilter('all'); setPriorityFilter('all'); }} />
    </div>
  );
};
