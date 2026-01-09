import React, { useState, useMemo, useEffect } from 'react';
import { SearchBar, PartnerCard, DetailModal, PartnerForm, FilterModal } from '../crm';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Partner } from '../../types/crm';
import { MapPin, Globe, Mail, Phone, Building2, Loader2, CheckSquare, Square, X, Trash2, Pencil, Users, LayoutGrid, List } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

interface PartnersScreenProps {
  forcedOpenId?: string | null;
}

export const PartnersScreen: React.FC<PartnersScreenProps> = ({ forcedOpenId }) => {
  const { partners, accounts, contacts, activities, relationships, users, loading, deletePartner, updatePartner, canDelete, canEdit } = useAppContext();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('South East Asia (SEA)');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    if (forcedOpenId && partners.length > 0) {
      const target = partners.find(p => p.id === forcedOpenId);
      if (target) {
        setSelectedPartner(target);
        setIsEditing(false);
      }
    }
  }, [forcedOpenId, partners]);

  const userCanDelete = canDelete();
  const userCanEdit = selectedPartner ? canEdit(selectedPartner.ownerId) : false;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const filtered = useMemo(() => partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.country.toLowerCase().includes(search.toLowerCase()) ||
                          p.region.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = p.region === regionFilter;
    return matchesSearch && matchesRegion;
  }), [partners, search, regionFilter]);

  const deletablePartners = filtered.filter(p => canDelete(p.ownerId));
  const allSelected = deletablePartners.length > 0 && deletablePartners.every(p => selectedIds.has(p.id));
  const linkedAccounts = selectedPartner ? accounts.filter(a => a.linkedPartnerIds.includes(selectedPartner.id)) : [];

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => { const next = new Set(prev); selected ? next.add(id) : next.delete(id); return next; });
  };
  const handleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(deletablePartners.map(p => p.id)));
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try { await Promise.all(Array.from(selectedIds).map(id => deletePartner(id))); exitSelectionMode(); setShowBulkDeleteDialog(false); }
    catch (e) { console.error('Bulk delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleSavePartner = async (updates: Partial<Partner>) => {
    if (selectedPartner) {
      await updatePartner(selectedPartner.id, updates);
      setSelectedPartner({ ...selectedPartner, ...updates });
      setIsEditing(false);
    }
  };

  const handleCloseModal = () => { setSelectedPartner(null); setIsEditing(false); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6">
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} placeholder="Search partners, regions, countries..." onFilterClick={() => setShowFilter(true)} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
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
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        <button
          onClick={() => setRegionFilter('South East Asia (SEA)')}
          className={`px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs lg:text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
            regionFilter === 'South East Asia (SEA)'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          South East Asia (SEA)
        </button>
        <button
          onClick={() => setRegionFilter('India')}
          className={`px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs lg:text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
            regionFilter === 'India'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          India
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> partners
        </p>
        {isAdmin && (
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

      <div className={viewMode === 'grid' && !selectionMode ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
        {filtered.map(partner => (
          <PartnerCard
            key={partner.id}
            partner={partner}
            onClick={() => !selectionMode && setSelectedPartner(partner)}
            showCheckbox={selectionMode && canDelete(partner.ownerId)}
            isSelected={selectedIds.has(partner.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No partners found</h3>
          <p className="text-slate-500">Try adjusting your filters or search query</p>
        </div>
      )}

      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Partners"
        filters={[
          {
            name: 'Region',
            options: [
              { label: 'All Regions', value: 'all' },
              ...availableRegions.map(r => ({ label: r, value: r }))
            ],
            selected: regionFilter,
            onChange: setRegionFilter
          }
        ]}
        onReset={() => setRegionFilter('all')}
      />

      <DetailModal isOpen={!!selectedPartner} onClose={handleCloseModal} title={selectedPartner?.name || ''} subtitle={`${selectedPartner?.region} • ${selectedPartner?.country}`} entityId={selectedPartner?.id || ''} entityType="Partner" clickupLink={selectedPartner?.clickupLink} activities={activities} users={users} contacts={contacts} accounts={accounts} partners={partners} relationships={relationships}>
        {selectedPartner && (isEditing ? (
          <PartnerForm partner={selectedPartner} onSave={handleSavePartner} onCancel={() => setIsEditing(false)} />
        ) : (
          <div className="space-y-4">
            {userCanEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold"
              >
                <Pencil className="w-4 h-4" />Edit Partner
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <MapPin className="w-5 h-5 text-gray-600 mb-1" />
                <p className="text-xs text-gray-500">Country</p>
                <p className="font-semibold text-sm">{selectedPartner.country}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <Globe className="w-5 h-5 text-gray-600 mb-1" />
                <p className="text-xs text-gray-500">Region</p>
                <p className="font-semibold text-sm">{selectedPartner.region}</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href={`mailto:${selectedPartner.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                <Mail className="w-5 h-5 text-orange-600" />
                <span className="text-sm">{selectedPartner.email}</span>
              </a>
              <a href={`tel:${selectedPartner.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                <Phone className="w-5 h-5 text-orange-600" />
                <span className="text-sm">{selectedPartner.phone}</span>
              </a>
            </div>
            {linkedAccounts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Linked Accounts ({linkedAccounts.length})
                </h4>
                <div className="space-y-2">
                  {linkedAccounts.map(a => (
                    <div key={a.id} className="p-2 bg-gray-50 rounded-lg text-sm flex justify-between">
                      <span>{a.name}</span>
                      <span className="text-gray-400">{a.country}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedPartner.notes && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{selectedPartner.notes}</p>
              </div>
            )}
          </div>
        ))}
      </DetailModal>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Partners</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} partner{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
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
