import React, { useState, useMemo, useEffect } from 'react';
import {
  OpportunityCard,
  FilterModal,
  DetailModal,
  OpportunityForm,
  LoadAnalyzer,
  MediaVault,
  QualityGate,
  InvestmentModeler,
  CreditRiskHub,
  ProjectCard
} from '../crm';
import { VelocityHeatmap } from '../crm/VelocityHeatmap';
import { useAppContext } from '../../contexts/AppContext';
import { Opportunity, Project } from '../../types/crm';
import { fetchProjects } from '@/lib/api/projects';
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
  Filter,
  ChevronDown,
  Clock,
  Flag,
  Calendar,
  ExternalLink,
  FolderKanban
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
  const [stagnationFilter, setStagnationFilter] = useState<'all' | '15' | '30' | '60'>('all');

  // Pipeline mode toggle state
  const [pipelineMode, setPipelineMode] = useState<'deals' | 'projects'>('deals');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);


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

  // Fetch projects when switching to projects view
  useEffect(() => {
    const loadProjects = async () => {
      if (pipelineMode === 'projects' && projects.length === 0) {
        setLoadingProjects(true);
        try {
          const data = await fetchProjects();
          setProjects(data);
        } catch (error) {
          console.error('Failed to fetch projects:', error);
        } finally {
          setLoadingProjects(false);
        }
      }
    };
    loadProjects();
  }, [pipelineMode, projects.length]);

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
    // 0. OPPORTUNITY STAGE FILTER - Only show pre-win opportunities by default
    // Pre-win stages: Prospect, Qualified, Proposal, Negotiation, Term Sheet, Lost
    // Exclude Won and project stages (Engineering, Permit/EPC, Construction, Commissioning, Operational)
    // UNLESS user explicitly selects a stage (e.g., clicks "Won" pill)
    const preWinStages = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Term Sheet', 'Lost'];
    if (stageFilter === 'all' && !preWinStages.includes(o.stage)) return false;

    // 1. HIERARCHY FILTER - Filter based on ownership/team view
    // SMART SEARCH OVERRIDE: If user is searching, bypass "Mine" filter to show matching team deals
    const isSearching = search.trim().length > 0;
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isSearching && hierarchyView === 'mine') {
      if (o.ownerId !== user?.id) return false;
    } else if (hierarchyView === 'team' || isSearching) {
      const isMyDeal = o.ownerId === user?.id;
      const isSubordinateDeal = subordinateIds.includes(o.ownerId);

      if (!isAdmin && !isMyDeal && !isSubordinateDeal) return false;
    }

    // Team Member Filter (drill-down within team view)
    if (selectedMemberId !== 'all' && o.ownerId !== selectedMemberId) return false;

    // 2. SEARCH FILTER - Match against deal name or account name
    const matchesSearch = o.name.toLowerCase().includes((search || '').toLowerCase()) ||
                          accounts.find(a => a.id === o.accountId)?.name.toLowerCase().includes((search || '').toLowerCase());

    // 3. STAGE FILTER
    const matchesStage = stageFilter === 'all' || o.stage === stageFilter;

    // 4. PRIORITY FILTER
    const matchesPriority = priorityFilter === 'all' || o.priority === priorityFilter;

    // 5. STAGNATION FILTER - Check days since last update
    if (stagnationFilter !== 'all') {
      const daysSinceUpdate = (new Date().getTime() - new Date(o.updatedAt).getTime()) / (1000 * 3600 * 24);
      if (stagnationFilter === '15' && daysSinceUpdate < 15) return false;
      if (stagnationFilter === '30' && daysSinceUpdate < 30) return false;
      if (stagnationFilter === '60' && daysSinceUpdate < 60) return false;
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
      warning: myDeals.filter(o => (now - new Date(o.updatedAt).getTime()) / 86400000 > 15).length,
      danger: myDeals.filter(o => (now - new Date(o.updatedAt).getTime()) / 86400000 > 30).length,
      critical: myDeals.filter(o => (now - new Date(o.updatedAt).getTime()) / 86400000 > 60).length
    };
  }, [opportunities, user?.id]);

  // Calculate summary stats for filtered opportunities
  const filteredStats = useMemo(() => {
    const totalMW = filtered.reduce((sum, o) => sum + (o.targetCapacity || 0), 0);
    const totalValue = filtered.reduce((sum, o) => sum + (o.value || 0), 0);
    const avgEPC = filtered.length > 0
      ? filtered.reduce((sum, o) => sum + (o.epcCost || 0), 0) / filtered.length
      : 0;
    return { totalMW, totalValue, avgEPC };
  }, [filtered]);

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

  const handleUpdateOpportunity = async (id: string, updates: Partial<Opportunity>) => {
    await updateOpportunity(id, updates);
    if (selectedOpp && selectedOpp.id === id) {
      setSelectedOpp({ ...selectedOpp, ...updates });
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
    <div className="w-full max-w-full overflow-x-hidden space-y-2 pb-24 lg:pb-32 min-w-0">
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
          {/* Title Row with Search & Filter */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* Search & Filter - Moved to Header Row */}
            <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search deals, accounts..."
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilter(true)}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors flex-shrink-0"
              >
                <Filter className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Hierarchy View Toggle & Pipeline Switcher */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Hierarchy View Toggle - My Deals vs Team Deals */}
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
                    className="appearance-none bg-slate-100 text-slate-700 text-xs font-bold pl-2 pr-6 py-1.5 rounded-full border-none focus:ring-2 focus:ring-orange-500 cursor-pointer outline-none w-28 truncate"
                  >
                    <option value="all">All Team</option>
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

            {/* Right: Pipeline Switcher */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
              <button
                onClick={() => setPipelineMode('deals')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  pipelineMode === 'deals'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Deals
              </button>
              <button
                onClick={() => setPipelineMode('projects')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  pipelineMode === 'projects'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Projects
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Pills Grid - Only for Deals */}
      {pipelineMode === 'deals' && (
        <div className="flex gap-2 mb-3">
          {/* All Button - Larger, Spans 2 Rows */}
          <button
            onClick={() => setStageFilter('all')}
            className={`flex flex-col items-center justify-center w-14 h-[76px] rounded-xl text-xs font-bold transition-all ${
              stageFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid className="w-5 h-5 mb-1" />
            <span>All</span>
          </button>

          {/* Stage Pills Grid - 2 rows x 3 columns */}
          <div className="grid grid-cols-3 gap-2 flex-1">
            <button
              onClick={() => setStageFilter('Prospect')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                stageFilter === 'Prospect'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Prospect
            </button>
            <button
              onClick={() => setStageFilter('Qualified')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                stageFilter === 'Qualified'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Qualified
            </button>
            <button
              onClick={() => setStageFilter('Proposal')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                stageFilter === 'Proposal'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Proposal
            </button>
            <button
              onClick={() => setStageFilter('Negotiation')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                stageFilter === 'Negotiation'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Negotiat...
            </button>
            <button
              onClick={() => setStageFilter('Term Sheet')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                stageFilter === 'Term Sheet'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Term Sheet
            </button>
            <button
              onClick={() => setStageFilter('Won')}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                stageFilter === 'Won'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              Won
            </button>
          </div>
        </div>
      )}

      {/* Results Count with Stats */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <p className="text-sm text-slate-500 font-medium">
          Showing <span className="text-slate-900 font-bold">
            {pipelineMode === 'deals' ? filtered.length : projects.length}
          </span> {pipelineMode === 'deals' ? 'deals' : 'projects'}
        </p>
        {pipelineMode === 'deals' && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{filtered.filter(o => o.completedMilestones && o.completedMilestones.length > 0).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">💬</span>
              <span>0</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">📎</span>
              <span>0</span>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Velocity Widget - Only for Deals */}
      {!selectionMode && pipelineMode === 'deals' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-900">Pipeline Velocity</h3>
            </div>
            <p className="text-xs text-slate-500">
              <span className="font-bold text-emerald-600">{stagnationStats.warning > 0 ? filtered.length - stagnationStats.warning : filtered.length} Healthy</span>
              {' / '}
              <span className="font-bold text-slate-900">{filtered.length} Total</span>
            </p>
          </div>

          {/* Velocity Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4 flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${filtered.length > 0 ? ((filtered.length - stagnationStats.warning) / filtered.length) * 100 : 0}%` }}></div>
            <div className="bg-yellow-400 h-full" style={{ width: `${filtered.length > 0 ? ((stagnationStats.warning - stagnationStats.danger) / filtered.length) * 100 : 0}%` }}></div>
            <div className="bg-orange-500 h-full" style={{ width: `${filtered.length > 0 ? ((stagnationStats.danger - stagnationStats.critical) / filtered.length) * 100 : 0}%` }}></div>
            <div className="bg-red-500 h-full" style={{ width: `${filtered.length > 0 ? (stagnationStats.critical / filtered.length) * 100 : 0}%` }}></div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setStagnationFilter('all')}
              className={`bg-emerald-50 border border-emerald-200 rounded-xl p-3 transition-all ${
                stagnationFilter === 'all' ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-emerald-600" />
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Active</p>
              </div>
              <p className="text-2xl font-black text-emerald-700">{filtered.length - stagnationStats.warning}</p>
            </button>

            <button
              onClick={() => setStagnationFilter('15')}
              className={`bg-yellow-50 border border-yellow-200 rounded-xl p-3 transition-all ${
                stagnationFilter === '15' ? 'ring-2 ring-yellow-500' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-yellow-600" />
                <p className="text-[10px] font-bold text-yellow-600 uppercase">&gt;15 Days</p>
              </div>
              <p className="text-2xl font-black text-yellow-700">{stagnationStats.warning - stagnationStats.danger}</p>
            </button>

            <button
              onClick={() => setStagnationFilter('30')}
              className={`bg-orange-50 border border-orange-200 rounded-xl p-3 transition-all ${
                stagnationFilter === '30' ? 'ring-2 ring-orange-500' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Flag className="w-3 h-3 text-orange-600" />
                <p className="text-[10px] font-bold text-orange-600 uppercase">&gt;30 Days</p>
              </div>
              <p className="text-2xl font-black text-orange-700">{stagnationStats.danger - stagnationStats.critical}</p>
            </button>

            <button
              onClick={() => setStagnationFilter('60')}
              className={`bg-red-50 border border-red-200 rounded-xl p-3 transition-all ${
                stagnationFilter === '60' ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Flag className="w-3 h-3 text-red-600" />
                <p className="text-[10px] font-bold text-red-600 uppercase">&gt;60 Days</p>
              </div>
              <p className="text-2xl font-black text-red-700">{stagnationStats.critical}</p>
            </button>
          </div>
        </div>
      )}

      {/* Conditional Rendering: Deals or Projects */}
      {pipelineMode === 'deals' ? (
        <>
          {/* Deals Grid/List */}
          <div className={`w-full max-w-full overflow-hidden ${viewMode === 'grid' && !selectionMode ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'flex flex-col gap-3'}`}>
            {filtered.map(opp => {
              const isSearching = search.trim().length > 0;
              const isTeamDeal = opp.ownerId !== user?.id && isSearching && hierarchyView === 'mine';
              return (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  accountName={accounts.find(a => a.id === opp.accountId)?.name}
                  ownerName={getOwnerName(opp.ownerId)}
                  onClick={() => !selectionMode && setSelectedOpp(opp)}
                  onPriorityChange={handlePriorityChange}
                  showTeamBadge={isTeamDeal}
                />
              );
            })}
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
        </>
      ) : (
        <>
          {/* Projects Grid/List */}
          {loadingProjects ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <div className="w-full max-w-full overflow-hidden flex flex-col gap-3">
                {projects.map(project => {
                  const partnerCount = project.linkedPartnerIds?.length || 0;
                  const accountName = accounts.find(a => a.id === project.linkedAccountId)?.name;
                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      accountName={accountName}
                      partnerCount={partnerCount}
                      onClick={() => {}}
                    />
                  );
                })}
              </div>

              {projects.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FolderKanban className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects found</h3>
                  <p className="text-slate-500">Projects will appear here once deals are won</p>
                </div>
              )}
            </>
          )}
        </>
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
        accountId={selectedOpp?.accountId}
        activities={activities}
        users={users}
        contacts={contacts}
        accounts={accounts}
        partners={partners}
        relationships={relationships}
        opportunity={selectedOpp || undefined}
        onUpdateOpportunity={handleUpdateOpportunity}
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
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-emerald-50/50 p-2 rounded-2xl ring-2 ring-orange-500 ring-inset">
                  <TabsTrigger value="underwriting" className="text-[10px] font-black uppercase flex gap-1 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700"><ShieldCheck className="w-3 h-3" /> Risk</TabsTrigger>
                  <TabsTrigger value="technical" className="text-[10px] font-black uppercase flex gap-1 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700"><Zap className="w-3 h-3" /> Tech</TabsTrigger>
                  <TabsTrigger value="financial" className="text-[10px] font-black uppercase flex gap-1 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700"><PieChart className="w-3 h-3" /> Math</TabsTrigger>
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
                      <p className="text-xl font-black text-gray-900">{(selectedOpp.targetCapacity || 0).toFixed(3)} MW</p>
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
          (() => {
            const primaryPartnerName = partners.find(p => p.id === selectedOpp.primaryPartnerId)?.name || 'Direct';
            const ownerName = users.find(u => u.id === selectedOpp.ownerId)?.name || 'Unknown';
            const creditRating = 'A-';

            return (
              <div className="space-y-4 pb-20">
                {/* MAIN DATA GRID (2 Columns) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                  {/* Row 1: Name & Account */}
                  <div className="grid grid-cols-2 border-b border-slate-100">
                    <div className="p-4 border-r border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Deal Name</p>
                      <p className="text-sm font-bold text-slate-900 truncate" title={selectedOpp.name}>{selectedOpp.name}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Account</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{linkedAccount?.name || 'Unlinked'}</p>
                    </div>
                  </div>

                  {/* Row 2: Capacity & Partner */}
                  <div className="grid grid-cols-2 border-b border-slate-100">
                    <div className="p-4 border-r border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target Capacity</p>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
                        {selectedOpp.targetCapacity} MW
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Partner</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-purple-700">{primaryPartnerName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: IRR & Term */}
                  <div className="grid grid-cols-2 border-b border-slate-100">
                    <div className="p-4 border-r border-slate-100 bg-emerald-50/30">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Project IRR</p>
                      <p className="text-lg font-black text-emerald-700">
                        {selectedOpp.projectIRR ? `${selectedOpp.projectIRR}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">PPA Term</p>
                      <p className="text-sm font-bold text-slate-900">{selectedOpp.ppaTermYears || '-'} Years</p>
                    </div>
                  </div>

                  {/* Row 4: EPC & Probability */}
                  <div className="grid grid-cols-2">
                    <div className="p-4 border-r border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">EPC Cost</p>
                      <p className="text-sm font-bold text-slate-900">
                        {selectedOpp.epcCost ? `฿${(selectedOpp.epcCost / 1000000).toFixed(1)}M` : '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50">
                      <p className="text-[10px] font-bold text-yellow-700 uppercase mb-1">Probability</p>
                      <p className="text-xl font-black text-yellow-800">{selectedOpp.manualProbability || 0}%</p>
                    </div>
                  </div>
                </div>

                {/* STATUS FOOTER (3 Columns) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase">Owner</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        {ownerName[0]}
                      </div>
                      <p className="text-xs font-bold text-slate-700 truncate">{ownerName.split(' ')[0]}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase">Stage</p>
                    <p className="text-xs font-bold text-slate-700 mt-1">{selectedOpp.stage}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-400 uppercase">Priority</p>
                    <p className={`text-xs font-bold mt-1 ${selectedOpp.priority === 'High' ? 'text-red-600' : 'text-slate-700'}`}>
                      {selectedOpp.priority}
                    </p>
                  </div>
                </div>

                {/* CONTEXT STRIP (Risk & Dates) */}
                <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase">Risk Rating</p>
                      <p className="text-xs font-bold text-slate-700">{creditRating}</p>
                    </div>
                  </div>
                  <div className="w-px bg-slate-200 h-8" />
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase">Target Decision</p>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedOpp.targetDecisionDate ? new Date(selectedOpp.targetDecisionDate).toLocaleDateString() : 'Not Set'}
                      </p>
                    </div>
                  </div>
                  {selectedOpp.googleDriveLink && (
                    <>
                      <div className="w-px bg-slate-200 h-8" />
                      <a
                        href={selectedOpp.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 hover:bg-slate-100 px-3 py-1 rounded-lg transition-colors"
                        aria-label="Open Google Drive"
                      >
                        <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8.5 3.5L3 13.5h5l5.5-10H8.5z" fill="#0066DA"/>
                          <path d="M13.5 3.5l5.5 10h-5l-5.5-10h5z" fill="#00AC47"/>
                          <path d="M8.5 13.5L3 13.5l2.75 5 2.75 5 5.5-10H8.5z" fill="#EA4335"/>
                          <path d="M14 13.5h5l-2.75 5-2.25 4L8.5 13.5H14z" fill="#FFBA00"/>
                        </svg>
                        <div className="flex flex-col justify-center">
                          <p className="text-[9px] text-slate-400 uppercase leading-tight">Drive</p>
                          <p className="text-xs font-bold text-slate-700 leading-tight">Open</p>
                        </div>
                      </a>
                    </>
                  )}
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
            );
          })()
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
