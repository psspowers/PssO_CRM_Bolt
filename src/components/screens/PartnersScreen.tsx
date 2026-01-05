import React, { useState, useMemo } from 'react';
import { SearchBar, PartnerCard, DetailModal, PartnerForm } from '../crm';
import { useAppContext } from '../../contexts/AppContext';
import { Partner } from '../../types/crm';
import { MapPin, Globe, Mail, Phone, Building2, Loader2, CheckSquare, Square, X, Trash2, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export const PartnersScreen: React.FC = () => {
  const { partners, accounts, contacts, activities, relationships, users, loading, deletePartner, updatePartner, canDelete, canEdit } = useAppContext();
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const userCanDelete = canDelete();
  const userCanEdit = selectedPartner ? canEdit(selectedPartner.ownerId) : false;
  const regions = [...new Set(partners.map(p => p.region))];

  const filtered = useMemo(() => partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.country.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = regionFilter === 'all' || p.region === regionFilter;
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      {selectionMode ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-emerald-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-emerald-200 gap-3">
          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={exitSelectionMode} className="p-2 hover:bg-emerald-100 rounded-lg transition-colors flex-shrink-0" aria-label="Exit selection mode">
              <X className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
            </button>
            <span className="font-bold text-sm lg:text-base text-emerald-800">{selectedIds.size} Selected</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-3 w-full sm:w-auto">
            <button onClick={handleSelectAll} className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-semibold text-emerald-700 hover:bg-emerald-100 rounded-lg lg:rounded-xl transition-colors flex-1 sm:flex-initial justify-center">
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
              <SearchBar value={search} onChange={setSearch} placeholder="Search partners..." showFilter={false} />
            </div>
            {userCanDelete && (
              <button
                onClick={() => setSelectionMode(true)}
                className="p-2.5 lg:p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-emerald-500 hover:border-emerald-200 transition-colors shadow-sm flex-shrink-0"
                aria-label="Bulk select"
              >
                <CheckSquare className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Region Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        {['all', ...regions].map(region => (
          <button
            key={region}
            onClick={() => setRegionFilter(region)}
            className={`px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs lg:text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              regionFilter === region
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {region === 'all' ? 'All Regions' : region}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> partners
        </p>
      </div>
      <div className="space-y-3">
        {filtered.map(partner => <PartnerCard key={partner.id} partner={partner} onClick={() => !selectionMode && setSelectedPartner(partner)} showCheckbox={selectionMode && canDelete(partner.ownerId)} isSelected={selectedIds.has(partner.id)} onSelect={handleSelect} />)}
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No partners found</p>}
      </div>
      <DetailModal isOpen={!!selectedPartner} onClose={handleCloseModal} title={selectedPartner?.name || ''} subtitle={`${selectedPartner?.region} • ${selectedPartner?.country}`} entityId={selectedPartner?.id || ''} entityType="Partner" clickupLink={selectedPartner?.clickupLink} activities={activities} users={users} contacts={contacts} accounts={accounts} partners={partners} relationships={relationships}>
        {selectedPartner && (isEditing ? (
          <PartnerForm partner={selectedPartner} onSave={handleSavePartner} onCancel={() => setIsEditing(false)} />
        ) : (
          <div className="space-y-4">
            {userCanEdit && <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"><Pencil className="w-4 h-4" />Edit Partner</button>}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3"><MapPin className="w-5 h-5 text-gray-600 mb-1" /><p className="text-xs text-gray-500">Country</p><p className="font-semibold text-sm">{selectedPartner.country}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><Globe className="w-5 h-5 text-gray-600 mb-1" /><p className="text-xs text-gray-500">Region</p><p className="font-semibold text-sm">{selectedPartner.region}</p></div>
            </div>
            <div className="space-y-2">
              <a href={`mailto:${selectedPartner.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100"><Mail className="w-5 h-5 text-emerald-600" /><span className="text-sm">{selectedPartner.email}</span></a>
              <a href={`tel:${selectedPartner.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100"><Phone className="w-5 h-5 text-emerald-600" /><span className="text-sm">{selectedPartner.phone}</span></a>
            </div>
            {linkedAccounts.length > 0 && (<div><h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Building2 className="w-4 h-4" /> Linked Accounts ({linkedAccounts.length})</h4><div className="space-y-2">{linkedAccounts.map(a => <div key={a.id} className="p-2 bg-gray-50 rounded-lg text-sm flex justify-between"><span>{a.name}</span><span className="text-gray-400">{a.country}</span></div>)}</div></div>)}
            {selectedPartner.notes && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700">{selectedPartner.notes}</p></div>}
          </div>
        ))}
      </DetailModal>
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedIds.size} Partners</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {selectedIds.size} partner{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">{isDeleting ? 'Deleting...' : `Delete`}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
