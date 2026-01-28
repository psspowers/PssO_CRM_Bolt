import React, { useState, useMemo, useEffect } from 'react';
import { AccountCard, FilterModal, DetailModal, AccountForm, SearchBar } from '../crm';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Account } from '../../types/crm';
import { MapPin, Star, Target, Users, Loader2, CheckSquare, Square, X, Trash2, Pencil, Building2, TrendingUp, Search, Filter, Handshake, User, ChevronDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { getSectors, SECTOR_ICONS, getTaxonomyInfo, getScoreColor, getPointsColor } from '../../data/thaiTaxonomy';
import { Input } from '../ui/input';
import { SegmentedControl } from '../ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { supabase } from '../../lib/supabase';

interface AccountsScreenProps {
  forcedOpenId?: string | null;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ forcedOpenId }) => {
  const { accounts, opportunities, partners, contacts, activities, relationships, users, loading, deleteAccount, updateAccount, canDelete, canEdit } = useAppContext();
  const { profile, user } = useAuth();
  const [viewMode, setViewMode] = useState<'customers' | 'partners'>('customers');
  const [search, setSearch] = useState('');
  const [importanceFilter, setImportanceFilter] = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hierarchy and team view
  const [hierarchyView, setHierarchyView] = useState<'mine' | 'team'>('mine');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const [loadingSubordinates, setLoadingSubordinates] = useState(false);

  // Velocity filters based on active deals
  const [filterEarlyStage, setFilterEarlyStage] = useState<string>('all');
  const [filterLateStage, setFilterLateStage] = useState<string>('all');
  const [filterSales, setFilterSales] = useState<string>('all');
  const [filterPartner, setFilterPartner] = useState<string>('all');
  const [showPartnerView, setShowPartnerView] = useState(false);

  useEffect(() => {
    if (forcedOpenId && accounts.length > 0) {
      const target = accounts.find(a => a.id === forcedOpenId);
      if (target) {
        setSelectedAccount(target);
        setIsEditing(false);
      }
    }
  }, [forcedOpenId, accounts]);

  // Fetch subordinates for hierarchy view
  useEffect(() => {
    if (!user?.id) return;

    const fetchSubordinates = async () => {
      setLoadingSubordinates(true);
      try {
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
      return users.filter(u => ['internal', 'admin', 'super_admin'].includes(u.role));
    } else {
      return users.filter(u => subordinateIds.includes(u.id) || u.id === user?.id);
    }
  }, [users, subordinateIds, profile, user]);

  const formatShortName = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length === 1) return fullName;
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const userCanDelete = canDelete();
  const userCanEdit = selectedAccount ? canEdit(selectedAccount.ownerId) : false;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  // Calculate counts for sales and partner filters
  const salesCounts = useMemo(() => {
    const counts = new Map<string, number>();
    accounts.forEach(account => {
      const accountOpps = opportunities.filter(o => o.accountId === account.id);
      accountOpps.forEach(opp => {
        if (opp.ownerId) {
          counts.set(opp.ownerId, (counts.get(opp.ownerId) || 0) + 1);
        }
      });
    });
    return counts;
  }, [accounts, opportunities]);

  const partnerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    accounts.forEach(account => {
      const accountOpps = opportunities.filter(o => o.accountId === account.id);
      accountOpps.forEach(opp => {
        if (opp.primaryPartnerId) {
          counts.set(opp.primaryPartnerId, (counts.get(opp.primaryPartnerId) || 0) + 1);
        }
      });
    });
    return counts;
  }, [accounts, opportunities]);

  const filtered = useMemo(() => accounts.filter(a => {
    const matchesType = viewMode === 'partners'
      ? a.type === 'Partner'
      : a.type !== 'Partner';
    const query = (search || '').toLowerCase();
    const matchesSearch = a.name.toLowerCase().includes(query) ||
                          a.country.toLowerCase().includes(query) ||
                          (a.industry || '').toLowerCase().includes(query) ||
                          (a.subIndustry || '').toLowerCase().includes(query);
    const matchesImportance = importanceFilter === 'all' || a.strategicImportance === importanceFilter;

    // Hierarchy Filter - Filter based on ownership/team view
    const isSearching = search.trim().length > 0;
    if (!isSearching && hierarchyView === 'mine') {
      if (a.ownerId !== user?.id) return false;
    } else if (hierarchyView === 'team' || isSearching) {
      const isMyAccount = a.ownerId === user?.id;
      const isSubordinateAccount = subordinateIds.includes(a.ownerId);
      if (!isAdmin && !isMyAccount && !isSubordinateAccount) return false;
    }

    // Team Member Filter (drill-down within team view)
    if (selectedMemberId !== 'all' && a.ownerId !== selectedMemberId) return false;

    // Get opportunities for this account
    const accountOpps = opportunities.filter(o => o.accountId === a.id);

    // Early stage filter (mutual exclusive with late stage)
    if (filterEarlyStage !== 'all') {
      const hasEarlyStage = accountOpps.some(o => o.stage === filterEarlyStage);
      if (!hasEarlyStage) return false;
    }

    // Late stage filter (mutual exclusive with early stage)
    if (filterLateStage !== 'all') {
      const hasLateStage = accountOpps.some(o => o.stage === filterLateStage);
      if (!hasLateStage) return false;
    }

    // Sales owner filter
    if (filterSales !== 'all') {
      const hasSalesOwner = accountOpps.some(o => o.ownerId === filterSales);
      if (!hasSalesOwner) return false;
    }

    // Partner filter
    if (filterPartner !== 'all') {
      const hasPartner = accountOpps.some(o => o.primaryPartnerId === filterPartner);
      if (!hasPartner) return false;
    }

    // Partner view toggle
    if (showPartnerView) {
      const hasPartnerProjects = accountOpps.some(o => o.primaryPartnerId !== null);
      if (!hasPartnerProjects) return false;
    }

    return matchesType && matchesSearch && matchesImportance;
  }), [accounts, viewMode, search, importanceFilter, filterEarlyStage, filterLateStage, filterSales, filterPartner, showPartnerView, opportunities, hierarchyView, selectedMemberId, subordinateIds, isAdmin, user]);

  // Calculate counts for Mine vs Team
  const myAccountsCount = useMemo(() => {
    return accounts.filter(a => {
      const matchesType = viewMode === 'partners' ? a.type === 'Partner' : a.type !== 'Partner';
      return matchesType && a.ownerId === user?.id;
    }).length;
  }, [accounts, viewMode, user]);

  const teamAccountsCount = useMemo(() => {
    return accounts.filter(a => {
      const matchesType = viewMode === 'partners' ? a.type === 'Partner' : a.type !== 'Partner';
      if (!matchesType) return false;
      const isMyAccount = a.ownerId === user?.id;
      const isSubordinateAccount = subordinateIds.includes(a.ownerId);
      return isAdmin || isMyAccount || isSubordinateAccount;
    }).length;
  }, [accounts, viewMode, subordinateIds, isAdmin, user]);

  const deletableAccounts = filtered.filter(a => canDelete(a.ownerId));
  const allSelected = deletableAccounts.length > 0 && deletableAccounts.every(a => selectedIds.has(a.id));

  const getOppCount = (accountId: string) => opportunities.filter(o => o.accountId === accountId).length;
  const linkedPartners = selectedAccount ? partners.filter(p => selectedAccount.linkedPartnerIds.includes(p.id)) : [];
  const linkedOpps = selectedAccount ? opportunities.filter(o => o.accountId === selectedAccount.id) : [];

  const selectedTaxonomyInfo = selectedAccount?.subIndustry ? getTaxonomyInfo(selectedAccount.subIndustry) : null;

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => { const next = new Set(prev); selected ? next.add(id) : next.delete(id); return next; });
  };
  const handleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(deletableAccounts.map(a => a.id)));
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try { await Promise.all(Array.from(selectedIds).map(id => deleteAccount(id))); exitSelectionMode(); setShowBulkDeleteDialog(false); }
    catch (e) { console.error('Bulk delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleSaveAccount = async (updates: Partial<Account>) => {
    if (selectedAccount) {
      await updateAccount(selectedAccount.id, updates);
      setSelectedAccount({ ...selectedAccount, ...updates });
      setIsEditing(false);
    }
  };

  const handleCloseModal = () => { setSelectedAccount(null); setIsEditing(false); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header: Mine/Team Toggle + Partner Toggle */}
      <div className="flex items-center justify-between gap-3">
        {/* Mine/Team Toggle */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setHierarchyView('mine')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                hierarchyView === 'mine'
                  ? 'bg-white shadow-sm text-orange-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Mine</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                hierarchyView === 'mine' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {myAccountsCount}
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
              <span>Team</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                hierarchyView === 'team' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {loadingSubordinates ? '...' : teamAccountsCount}
              </span>
            </button>
          </div>

          {/* Team Member Dropdown */}
          {hierarchyView === 'team' && (
            <div className="relative animate-in fade-in slide-in-from-left-2">
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

        {/* Partner Toggle Button */}
        <button
          onClick={() => setViewMode(viewMode === 'partners' ? 'customers' : 'partners')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            viewMode === 'partners'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>{viewMode === 'partners' ? 'Partners' : 'Customers'}</span>
        </button>
      </div>

      {selectionMode ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-orange-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-orange-200 gap-3">
          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={exitSelectionMode} className="p-2 hover:bg-orange-100 rounded-lg transition-colors flex-shrink-0" aria-label="Exit selection mode">
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
              className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold text-white bg-red-500 rounded-lg lg:rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors flex-1 sm:flex-initial justify-center"
            >
              <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
              <span className="sm:hidden">Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={viewMode === 'partners' ? 'Search partners...' : 'Search accounts, industries...'}
          onFilterClick={() => setShowFilter(true)}
        />
      )}

      {/* Tactical Filter Bar - Velocity Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Early Stage Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Early Stage</Label>
            <Select
              value={filterEarlyStage}
              onValueChange={(value) => {
                setFilterEarlyStage(value);
                if (value !== 'all') setFilterLateStage('all');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="Prospect">Prospect</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Proposal">Proposal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Late Stage Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Late Stage</Label>
            <Select
              value={filterLateStage}
              onValueChange={(value) => {
                setFilterLateStage(value);
                if (value !== 'all') setFilterEarlyStage('all');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="Negotiation">Negotiation</SelectItem>
                <SelectItem value="Term Sheet">Term Sheet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sales Owner Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Sales Owner</Label>
            <Select value={filterSales} onValueChange={setFilterSales}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales</SelectItem>
                {users
                  .filter(u => salesCounts.has(u.id))
                  .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({salesCounts.get(user.id) || 0})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partner Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Partner</Label>
            <Select value={filterPartner} onValueChange={setFilterPartner}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                {partners
                  .filter(p => partnerCounts.has(p.id))
                  .map(partner => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name} ({partnerCounts.get(partner.id) || 0})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Partner View Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Label htmlFor="partner-view" className="text-sm font-semibold text-slate-700">
            Show Partner Projects Only
          </Label>
          <Switch
            id="partner-view"
            checked={showPartnerView}
            onCheckedChange={setShowPartnerView}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> {viewMode === 'partners' ? 'partners' : 'accounts'}
        </p>
        {isAdmin && !selectionMode && (
          <button
            onClick={() => setSelectionMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-orange-600 hover:border-orange-300 transition-colors"
            aria-label="Bulk select"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Bulk Select</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 lg:gap-3">
        {filtered.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            onClick={() => !selectionMode && setSelectedAccount(account)}
            opportunityCount={getOppCount(account.id)}
            showCheckbox={selectionMode && canDelete(account.ownerId)}
            isSelected={selectedIds.has(account.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {viewMode === 'partners' ? (
              <Handshake className="w-8 h-8 text-slate-400" />
            ) : (
              <Building2 className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No {viewMode === 'partners' ? 'partners' : 'accounts'} found
          </h3>
          <p className="text-slate-500">Try adjusting your filters or search query</p>
        </div>
      )}

      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Accounts"
        filters={[
          {
            name: 'Importance',
            options: [
              { label: 'All', value: 'all' },
              { label: 'High', value: 'High' },
              { label: 'Medium', value: 'Medium' },
              { label: 'Low', value: 'Low' }
            ],
            selected: importanceFilter,
            onChange: setImportanceFilter
          }
        ]}
        onReset={() => {
          setImportanceFilter('all');
          setFilterEarlyStage('all');
          setFilterLateStage('all');
          setFilterSales('all');
          setFilterPartner('all');
          setShowPartnerView(false);
        }}
      />

      <DetailModal
        isOpen={!!selectedAccount}
        onClose={handleCloseModal}
        title={selectedAccount?.name || ''}
        subtitle={selectedAccount?.sector || 'Unclassified'}
        entityId={selectedAccount?.id || ''}
        entityType="Account"
        clickupLink={selectedAccount?.clickupLink}
        accountId={selectedAccount?.id}
        activities={activities}
        users={users}
        contacts={contacts}
        accounts={accounts}
        partners={partners}
        relationships={relationships}
      >
        {selectedAccount && (isEditing ? (
          <AccountForm account={selectedAccount} onSave={handleSaveAccount} onCancel={() => setIsEditing(false)} />
        ) : (
          <div className="space-y-4">
            {userCanEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold"
              >
                <Pencil className="w-4 h-4" />Edit Account
              </button>
            )}

            {selectedAccount.sector && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-700">Industry Classification</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{SECTOR_ICONS[selectedAccount.sector] || '📁'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{selectedAccount.sector}</p>
                      {selectedAccount.industry && (
                        <p className="text-sm text-gray-500">
                          {selectedAccount.industry}
                          {selectedAccount.subIndustry && ` › ${selectedAccount.subIndustry}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedTaxonomyInfo && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                      <div className={`flex-1 rounded-lg p-2 ${getScoreColor(selectedTaxonomyInfo.score)}`}>
                        <p className="text-[10px] font-bold uppercase opacity-70">Credit Score</p>
                        <p className="text-xl font-bold">{selectedTaxonomyInfo.score}</p>
                      </div>
                      <div className={`flex-1 rounded-lg p-2 ${getPointsColor(selectedTaxonomyInfo.points)}`}>
                        <p className="text-[10px] font-bold uppercase opacity-70">Priority</p>
                        <p className="text-xl font-bold">{selectedTaxonomyInfo.points}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <MapPin className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Country</p>
                <p className="font-semibold text-sm">{selectedAccount.country}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Importance</p>
                <p className="font-semibold text-sm">{selectedAccount.strategicImportance}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Target className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Opps</p>
                <p className="font-semibold text-sm">{linkedOpps.length}</p>
              </div>
            </div>

            {linkedPartners.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Linked Partners
                </h4>
                <div className="space-y-2">
                  {linkedPartners.map(p => (
                    <div key={p.id} className="p-2 bg-gray-50 rounded-lg text-sm">{p.name}</div>
                  ))}
                </div>
              </div>
            )}

            {selectedAccount.notes && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{selectedAccount.notes}</p>
              </div>
            )}
          </div>
        ))}
      </DetailModal>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Accounts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} account{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
