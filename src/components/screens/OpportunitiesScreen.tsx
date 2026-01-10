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
  Info,
  Search,
  ChevronDown,
  Clock,
  Flag
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface OpportunitiesScreenProps {
  forcedOpenId?: string | null;
  forcedStageFilter?: string | null;
}

export const OpportunitiesScreen: React.FC<OpportunitiesScreenProps> = ({ forcedOpenId, forcedStageFilter }) => {
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [stagnationFilter, setStagnationFilter] = useState<'all' | '30' | '60' | '90'>('all');
  
  // NEW: Hierarchy View Filter State
  // 'mine' = Only deals owned by the current user
  // 'team' = All deals visible to the user (includes subordinates' deals via RLS)
  const [hierarchyView, setHierarchyView] = useState<'mine' | 'team'>('mine');

  // Track subordinate IDs for the team view
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  // Team member drill-down filter
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

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

  // Reset member filter when switching back to "Mine"
  useEffect(() => {
    if (hierarchyView === 'mine') setSelectedMemberId('all');
  }, [hierarchyView]);

  // Calculate team members list for dropdown
  const teamMembers = useMemo(() => {
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      // Admins see all Internal/Admin users
      return users.filter(u => ['internal', 'admin', 'super_admin'].includes(u.role));
    } else {
      // Managers see themselves + subordinates
      return users.filter(u => subordinateIds.includes(u.id) || u.id === user?.id);
    }
  }, [users, subordinateIds, profile, user]);

  // --- DEEP LINKING LOGIC ---
  // This hook "watches" for an ID coming from a notification click
  useEffect(() => {
    if (forcedOpenId && opportunities.length > 0) {
      const target = opportunities.find(o => o.id === forcedOpenId);
      if (target) {
        setSelectedOpp(target);
        setIsEditing(false);
      }
    }
  }, [forcedOpenId, opportunities]);

  // Handle forced stage filter from Velocity Dashboard
  useEffect(() => {
    if (forcedStageFilter) {
      setStageFilter(forcedStageFilter);
    }
  }, [forcedStageFilter]);

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
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (hierarchyView === 'mine') {
      if (o.ownerId !== user?.id) return false;
    } else {
      const isMyDeal = o.ownerId === user?.id;
      const isSubordinateDeal = subordinateIds.includes(o.ownerId);

      if (!isAdmin && !isMyDeal && !isSubordinateDeal) return false;
    }

    // Team Member Filter (drill-down within team view)
    if (selectedMemberId !== 'all' && o.ownerId !== selectedMemberId) return false;

    // 2. SEARCH FILTER - Match against deal name or account name
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
                          accounts.find(a => a.id === o.accountId)?.name.toLowerCase().includes(search.toLowerCase());

    // 3. STAGE FILTER
    const matchesStage = stageFilter === 'all' || o.stage === stageFilter;

    // 4. PRIORITY FILTER
    const matchesPriority = priorityFilter === 'all' || o.priority === priorityFilter;

    // 5. STAGNATION FILTER - Check days since last update
    if (stagnationFilter !== 'all') {
      const daysSinceUpdate = (new Date().getTime() - new Date(o.updatedAt).getTime()) / (1000 * 3600 * 24);
      if (stagnationFilter === '30' && daysSinceUpdate < 30) return false;
      if (stagnationFilter === '60' && daysSinceUpdate < 60) return false;
      if (stagnationFilter === '90' && daysSinceUpdate < 90) return false;
    }

    return matchesSearch && matchesStage && matchesPriority;
  });
  }, [opportunities, accounts, search, stageFilter, priorityFilter, hierarchyView, user?.id, subordinateIds, selectedMemberId, profile, stagnationFilter]);

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

  // Calculate stagnation stats for "My Deals" only
  const stagnationStats = useMemo(() => {
    const myDeals = opportunities.filter(o => o.ownerId === user?.id && !['Won', 'Lost'].includes(o.stage));
    const now = new Date().getTime();
    return {
      warning: myDeals.filter(o => (now - new Date(o.updatedAt).getTime()) / 86400000 > 30).length,
      danger: myDeals.filter(o => (now - new Date(o.updatedAt).getTime()) / 86400000 > 60).length,
      critical: myDeals.filter(o => (now - new Date(o.updatedAt).getTime()) / 86400000 > 90).length
    };
  }, [opportunities, user?.id]);

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

  const handlePriorityChange = async (opportunityId: string, newPriority: 'Low' | 'Medium' | 'High') => {
    await updateOpportunity(opportunityId, { priority: newPriority });
    if (selectedOpp && selectedOpp.id === opportunityId) {
      setSelectedOpp({ ...selectedOpp, priority: newPriority });
    }
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

  // Format short name for compact display (e.g., "Sam Y.")
  const formatShortName = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-2 pb-24 lg:pb-32">
      {/* Header & Selection Toolbar */}
      {selectionMode ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-orange-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-orange-200 gap-3">
          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={exitSelectionMode} className="p-2 hover:bg-orange-100 rounded-lg transition-colors flex-shrink-0">
              <X className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
            </button>
            <span className="font-bold text-sm lg:text-base text-orange-800">{selectedIds.size} Selected</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 w-full sm:w-auto">
            <button onClick={handleSelectAll} className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-semibold text-orange-700 hover:bg-orange-100 rounded-lg lg:rounded-xl transition-colors flex-1 sm:flex-initial justify-center">
              {allSelected ? <CheckSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <Square className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
              <span className="hidden sm:inline">{allSelected ? 'Deselect All' : 'Select All'}</span>
              <span className="sm:hidden">{allSelected ? 'Deselect' : 'Select All'}</span>
            </button>
            <button
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={selectedIds.size === 0}
              className="px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold text-white bg-red-500 rounded-lg lg:rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 lg:gap-2 flex-1 sm:flex-initial justify-center"
            >
              <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
              <span className="sm:hidden">Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Title with Search Icon */}
          <div className="flex items-center justify-between mb-1">
            {isSearchOpen ? (
              <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-10 duration-200">
                <SearchBar value={search} onChange={setSearch} placeholder="Search deals..." showFilter={false} />
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearch('');
                  }}
                  className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">
                          <strong>Mine:</strong> Your opportunities<br />
                          <strong>Team:</strong> Your deals + subordinates' deals
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
                </div>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                  aria-label="Search deals"
                >
                  <Search className="w-5 h-5 text-slate-600" />
                </button>
              </>
            )}
          </div>

          {/* Hierarchy View Toggle - My Deals vs Team Deals */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setHierarchyView('mine')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  hierarchyView === 'mine'
                    ? 'bg-white shadow-sm text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mine</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  hierarchyView === 'mine' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {myDealsCount}
                </span>
              </button>
              <button
                onClick={() => setHierarchyView('team')}
                disabled={loadingSubordinates}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  hierarchyView === 'team'
                    ? 'bg-white shadow-sm text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                } ${loadingSubordinates ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Team</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  hierarchyView === 'team' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  {loadingSubordinates ? '...' : teamDealsCount}
                </span>
              </button>
            </div>

            {/* Team Member Drill-Down Filter */}
            {hierarchyView === 'team' && (
              <div className="relative flex-shrink-0 animate-in fade-in slide-in-from-left-2">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-700 text-xs font-bold pl-2 pr-6 py-1 rounded-full border-none focus:ring-2 focus:ring-orange-500 cursor-pointer outline-none w-auto max-w-[100px] truncate"
                >
                  <option value="all">All ({teamDealsCount})</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{formatShortName(m.name)}</option>
                  ))}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Color-Coded Stage Filters - 2 Rows */}
      <div className="w-full flex flex-col gap-1.5">
        {/* Row 1 */}
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'Prospect', 'Qualified', 'Proposal'].map(stage => {
            const getStageColor = (s: string) => {
              if (s === 'all') return 'bg-slate-800 text-white';
              if (['Prospect', 'Qualified'].includes(s)) return 'bg-blue-100 text-blue-700';
              if (['Proposal', 'Negotiation'].includes(s)) return 'bg-amber-100 text-amber-700';
              if (['Term Sheet', 'Won'].includes(s)) return 'bg-emerald-100 text-emerald-700';
              return 'bg-slate-100 text-slate-600';
            };

            return (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                  stageFilter === stage
                    ? `ring-2 ring-slate-900 ${getStageColor(stage)}`
                    : `${getStageColor(stage)} opacity-60`
                }`}
              >
                {stage === 'all' ? 'All' : stage}
              </button>
            );
          })}
        </div>
        {/* Row 2 */}
        <div className="flex gap-1.5 flex-wrap">
          {['Negotiation', 'Term Sheet', 'Won'].map(stage => {
            const getStageColor = (s: string) => {
              if (s === 'all') return 'bg-slate-800 text-white';
              if (['Prospect', 'Qualified'].includes(s)) return 'bg-blue-100 text-blue-700';
              if (['Proposal', 'Negotiation'].includes(s)) return 'bg-amber-100 text-amber-700';
              if (['Term Sheet', 'Won'].includes(s)) return 'bg-emerald-100 text-emerald-700';
              return 'bg-slate-100 text-slate-600';
            };

            return (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                  stageFilter === stage
                    ? `ring-2 ring-slate-900 ${getStageColor(stage)}`
                    : `${getStageColor(stage)} opacity-60`
                }`}
              >
                {stage}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count with Stagnation Filter */}
      <div className="flex items-center justify-between mb-2 px-1">
        {/* LEFT: Result Count */}
        <p className="text-xs lg:text-sm text-slate-500 font-medium">
          Showing <span className="text-slate-900 font-bold">{filtered.length}</span> {hierarchyView === 'mine' ? 'deals' : 'team deals'}
        </p>

        {/* RIGHT: Stagnation Controls (Moved Here) */}
        <div className="flex items-center gap-2">
          {/* TEAM VIEW: Dropdown */}
          {hierarchyView === 'team' && (
            <div className="relative">
              <select
                value={stagnationFilter}
                onChange={(e) => setStagnationFilter(e.target.value as 'all' | '30' | '60' | '90')}
                className="appearance-none bg-white border border-slate-200 text-xs font-bold pl-2 pr-6 py-1 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="all">Any Time</option>
                <option value="30">&gt; 30 Days</option>
                <option value="60">&gt; 60 Days</option>
                <option value="90">&gt; 90 Days</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          )}

          {/* MINE VIEW: Badges */}
          {hierarchyView === 'mine' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setStagnationFilter(stagnationFilter === '30' ? 'all' : '30')} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${stagnationFilter === '30' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                <Flag className="w-3 h-3 inline mr-1" />{stagnationStats.warning}
              </button>
              <button onClick={() => setStagnationFilter(stagnationFilter === '60' ? 'all' : '60')} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${stagnationFilter === '60' ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                <Flag className="w-3 h-3 inline mr-1" />{stagnationStats.danger}
              </button>
              <button onClick={() => setStagnationFilter(stagnationFilter === '90' ? 'all' : '90')} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${stagnationFilter === '90' ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                <Flag className="w-3 h-3 inline mr-1" />{stagnationStats.critical}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Deals Grid/List */}
      <div className={`w-full max-w-full overflow-hidden ${viewMode === 'grid' && !selectionMode ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'flex flex-col gap-3'}`}>
        {filtered.map(opp => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            accountName={accounts.find(a => a.id === opp.accountId)?.name}
            ownerName={getOwnerName(opp.ownerId)}
            onClick={() => !selectionMode && setSelectedOpp(opp)}
            onPriorityChange={handlePriorityChange}
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
        velocityContent={
          selectedOpp && !isEditing ? (
            <div className="space-y-6 pb-20">
              {/* Owner Info Banner (for team deals not owned by current user) */}
              {selectedOpp.ownerId !== user?.id && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 lg:p-4 flex items-start lg:items-center gap-2 lg:gap-3">
                  <User className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 flex-shrink-0 mt-0.5 lg:mt-0" />
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-blue-800">
                      Owned by {getOwnerName(selectedOpp.ownerId)}
                    </p>
                    <p className="text-[10px] lg:text-xs text-blue-600">
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
            </div>
          ) : undefined
        }
      >
        {selectedOpp && (isEditing ? (
          <OpportunityForm opportunity={selectedOpp} onSave={handleSaveOpportunity} onCancel={() => setIsEditing(false)} />
        ) : (
          <div className="space-y-4 pb-20">
            {/* Basic Info Grid - Read Only */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Deal Name</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedOpp.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Account</p>
                  <p className="text-sm font-semibold text-slate-900">{linkedAccount?.name || 'Unlinked'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">PPA Value</p>
                  <p className="text-sm font-semibold text-slate-900">{formatValue(selectedOpp.value)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Target Capacity</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedOpp.targetCapacity || 0} MW</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Max Capacity</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedOpp.maxCapacity || 0} MW</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Probability</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedOpp.manualProbability || 0}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">PPA Term</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedOpp.ppaTermYears || 0} years</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">EPC Cost</p>
                  <p className="text-sm font-semibold text-slate-900">{formatValue(selectedOpp.epcCost || 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Owner</p>
                  <p className="text-sm font-semibold text-slate-900">{getOwnerName(selectedOpp.ownerId)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedOpp.priority}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Stage</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedOpp.stage}</p>
                </div>
              </div>
            </div>

            {userCanEdit && (
              <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                <Pencil className="w-4 h-4" /> Edit Deal
              </button>
            )}

            {selectedOpp.notes && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
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
