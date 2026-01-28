import React, { useState, useMemo, useEffect } from 'react';
import { AccountCard, FilterModal, DetailModal, AccountForm, SearchBar } from '../crm';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Account } from '../../types/crm';
import { MapPin, Star, Target, Users, Loader2, CheckSquare, Square, X, Trash2, Pencil, Building2, TrendingUp, Search, Filter, Handshake, Zap } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { getSectors, SECTOR_ICONS, getTaxonomyInfo, getScoreColor, getPointsColor } from '../../data/thaiTaxonomy';
import { Input } from '../ui/input';
import { SegmentedControl } from '../ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';

interface AccountsScreenProps {
  forcedOpenId?: string | null;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ forcedOpenId }) => {
  const { accounts, opportunities, partners, contacts, activities, relationships, users, loading, deleteAccount, updateAccount, canDelete, canEdit } = useAppContext();
  const { profile } = useAuth();
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
  }), [accounts, viewMode, search, importanceFilter, filterEarlyStage, filterLateStage, filterSales, filterPartner, showPartnerView, opportunities]);

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
      <div className="flex items-center justify-center">
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'customers', label: 'Customers', icon: Building2 },
            { value: 'partners', label: 'Partners', icon: Handshake },
          ]}
          size="md"
        />
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

      {/* Tactical Filter Bar - Horizontal Toolbar */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide items-center -mx-4 px-4 lg:mx-0 lg:px-0">
        {/* Early Stage Filter */}
        <Select
          value={filterEarlyStage}
          onValueChange={(value) => {
            setFilterEarlyStage(value);
            if (value !== 'all') setFilterLateStage('all');
          }}
        >
          <SelectTrigger className="min-w-[140px] flex-shrink-0">
            <SelectValue placeholder="Early Stage">
              {filterEarlyStage === 'all' ? 'Early Stage' : filterEarlyStage}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="Prospect">Prospect</SelectItem>
            <SelectItem value="Qualified">Qualified</SelectItem>
            <SelectItem value="Proposal">Proposal</SelectItem>
          </SelectContent>
        </Select>

        {/* Late Stage Filter */}
        <Select
          value={filterLateStage}
          onValueChange={(value) => {
            setFilterLateStage(value);
            if (value !== 'all') setFilterEarlyStage('all');
          }}
        >
          <SelectTrigger className="min-w-[140px] flex-shrink-0">
            <SelectValue placeholder="Late Stage">
              {filterLateStage === 'all' ? 'Late Stage' : filterLateStage}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="Negotiation">Negotiation</SelectItem>
            <SelectItem value="Term Sheet">Term Sheet</SelectItem>
          </SelectContent>
        </Select>

        {/* Sales Owner Filter */}
        <Select value={filterSales} onValueChange={setFilterSales}>
          <SelectTrigger className="min-w-[140px] flex-shrink-0">
            <SelectValue placeholder="Sales Owner">
              {filterSales === 'all'
                ? 'All Sales'
                : `${users.find(u => u.id === filterSales)?.name || 'Sales'} (${salesCounts.get(filterSales) || 0})`
              }
            </SelectValue>
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

        {/* Partner Filter */}
        <Select value={filterPartner} onValueChange={setFilterPartner}>
          <SelectTrigger className="min-w-[140px] flex-shrink-0">
            <SelectValue placeholder="Partner">
              {filterPartner === 'all'
                ? 'All Partners'
                : `${partners.find(p => p.id === filterPartner)?.name || 'Partner'} (${partnerCounts.get(filterPartner) || 0})`
              }
            </SelectValue>
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

        {/* Partner View Toggle Button */}
        <button
          onClick={() => setShowPartnerView(!showPartnerView)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-xs lg:text-sm whitespace-nowrap transition-all flex-shrink-0 border ${
            showPartnerView
              ? 'bg-orange-100 text-orange-700 border-orange-200'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Handshake className="w-4 h-4" />
          Partner Projects
        </button>
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
