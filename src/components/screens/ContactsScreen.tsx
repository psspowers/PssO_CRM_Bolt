import React, { useState, useMemo, useEffect } from 'react';
import { ContactCard, DetailModal, ContactForm, FilterModal, SearchBar, SimpleModal } from '../crm';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Contact } from '../../types/crm';
import { MapPin, Mail, Phone, Building2, Loader2, CheckSquare, Square, X, Trash2, Pencil, UserCircle, Search, Filter, Smartphone, LayoutGrid, ChevronDown, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Input } from '../ui/input';
import { isContactPickerSupported, openNativeContactPicker, mapNativeToCRM } from '../../lib/device/contacts';
import { toast } from 'sonner';

interface ContactsScreenProps {
  forcedOpenId?: string | null;
}

export const ContactsScreen: React.FC<ContactsScreenProps> = ({ forcedOpenId }) => {
  const { contacts, accounts, partners, activities, relationships, users, loading, deleteContact, updateContact, createContact, canDelete, canEdit } = useAppContext();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<Partial<Contact> | null>(null);

  // Deal-based filters
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showPartnerView, setShowPartnerView] = useState(false);

  useEffect(() => {
    if (forcedOpenId && contacts.length > 0) {
      const target = contacts.find(c => c.id === forcedOpenId);
      if (target) {
        setSelectedContact(target);
        setIsEditing(false);
      }
    }
  }, [forcedOpenId, contacts]);

  const userCanDelete = canDelete();
  const userCanEdit = selectedContact ? canEdit(selectedContact.ownerId) : false;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const filtered = useMemo(() => contacts.filter(c => {
    const query = (search || '').toLowerCase();
    const matchesSearch = c.fullName.toLowerCase().includes(query) ||
                          c.role.toLowerCase().includes(query) ||
                          c.email.toLowerCase().includes(query);

    // Partner view filter - Only show contacts from Partner accounts
    if (showPartnerView) {
      if (c.account?.type !== 'Partner') return false;
    }

    // Stage filter - Check if any opportunity in the contact's account matches the selected stage
    if (stageFilter !== 'all' && c.account?.opportunities) {
      const hasStage = c.account.opportunities.some(o => o.stage === stageFilter);
      if (!hasStage) return false;
    }

    return matchesSearch;
  }), [contacts, search, stageFilter, showPartnerView]);

  const deletableContacts = filtered.filter(c => canDelete());
  const allSelected = deletableContacts.length > 0 && deletableContacts.every(c => selectedIds.has(c.id));
  const getOrg = (c: Contact) => {
    if (c.accountId) return accounts.find(a => a.id === c.accountId)?.name;
    if (c.partnerId) return partners.find(p => p.id === c.partnerId)?.name;
    return undefined;
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => { const next = new Set(prev); selected ? next.add(id) : next.delete(id); return next; });
  };
  const handleSelectAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(deletableContacts.map(c => c.id)));
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };
  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try { await Promise.all(Array.from(selectedIds).map(id => deleteContact(id))); exitSelectionMode(); setShowBulkDeleteDialog(false); }
    catch (e) { console.error('Bulk delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const handleSaveContact = async (updates: Partial<Contact>) => {
    if (selectedContact) {
      await updateContact(selectedContact.id, updates);
      setSelectedContact({ ...selectedContact, ...updates });
      setIsEditing(false);
    }
  };

  const handleDeleteContact = async () => {
    if (selectedContact) {
      await deleteContact(selectedContact.id);
      setSelectedContact(null);
      setIsEditing(false);
      toast.success('Contact deleted successfully');
    }
  };

  const handleImportFromPhone = async () => {
    if (!isContactPickerSupported()) {
      toast.error('Contact Picker API not available', {
        description: 'This feature requires Chrome on Android with HTTPS, or a compatible browser.',
      });
      return;
    }

    try {
      const selected = await openNativeContactPicker();
      if (selected && selected.length > 0) {
        const mappedData = mapNativeToCRM(selected[0]);
        setImportedData(mappedData);
        setShowImportModal(true);
      }
    } catch (err) {
      console.error('Phone import error:', err);
      toast.error('Failed to import contact from phone');
    }
  };

  const handleSaveImportedContact = async (data: Partial<Contact>) => {
    await createContact(data);
    setShowImportModal(false);
    setImportedData(null);
    toast.success('Contact imported successfully');
  };

  const handleCloseModal = () => { setSelectedContact(null); setIsEditing(false); };

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
        <div className="space-y-3">
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
                      <strong>Filter contacts</strong> by the deal stages of their company
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts, roles, emails..."
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

          {/* Partner View Toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showPartnerView}
                onChange={(e) => setShowPartnerView(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-slate-700">Partner Contacts Only</span>
            </label>
          </div>
        </div>
      )}

      {/* Stage Pills Grid */}
      {!selectionMode && (
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{filtered.length}</span> contacts
        </p>
        <div className="flex items-center gap-2">
          {!selectionMode && (
            <button
              onClick={handleImportFromPhone}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
              aria-label="Import from phone"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          )}
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
      </div>

      <div className="flex flex-col gap-2 lg:gap-3">
        {filtered.map(contact => (
          <ContactCard
            key={contact.id}
            contact={contact}
            organizationName={getOrg(contact)}
            onClick={() => !selectionMode && setSelectedContact(contact)}
            showCheckbox={selectionMode && canDelete(contact.ownerId)}
            isSelected={selectedIds.has(contact.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No contacts found</h3>
          <p className="text-slate-500">Try adjusting your filters or search query</p>
        </div>
      )}

      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Contacts"
        filters={[
          {
            name: 'Deal Stage',
            options: [
              { label: 'All Stages', value: 'all' },
              { label: 'Prospect', value: 'Prospect' },
              { label: 'Qualified', value: 'Qualified' },
              { label: 'Proposal', value: 'Proposal' },
              { label: 'Negotiation', value: 'Negotiation' },
              { label: 'Term Sheet', value: 'Term Sheet' },
              { label: 'Won', value: 'Won' }
            ],
            selected: stageFilter,
            onChange: setStageFilter
          }
        ]}
        onReset={() => setStageFilter('all')}
      />

      <DetailModal isOpen={!!selectedContact} onClose={handleCloseModal} title={selectedContact?.fullName || ''} subtitle={selectedContact?.role} entityId={selectedContact?.id || ''} entityType="Contact" clickupLink={selectedContact?.clickupLink} activities={activities} users={users} contacts={contacts} accounts={accounts} partners={partners} relationships={relationships}>
        {selectedContact && (isEditing ? (
          <ContactForm contact={selectedContact} onSave={handleSaveContact} onCancel={() => setIsEditing(false)} onDelete={userCanEdit && userCanDelete ? handleDeleteContact : undefined} />
        ) : (
          <div className="space-y-4">
            {userCanEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold"
              >
                <Pencil className="w-4 h-4" />Edit Contact
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <MapPin className="w-5 h-5 text-gray-600 mb-1" />
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-semibold text-sm">{selectedContact.city}, {selectedContact.country}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <Building2 className="w-5 h-5 text-gray-600 mb-1" />
                <p className="text-xs text-gray-500">Organization</p>
                <p className="font-semibold text-sm">{getOrg(selectedContact)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href={`mailto:${selectedContact.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                <Mail className="w-5 h-5 text-orange-600" />
                <span className="text-sm">{selectedContact.email}</span>
              </a>
              <a href={`tel:${selectedContact.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
                <Phone className="w-5 h-5 text-orange-600" />
                <span className="text-sm">{selectedContact.phone}</span>
              </a>
            </div>
            {selectedContact.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedContact.tags.map(t => (
                  <span key={t} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </DetailModal>

      <SimpleModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportedData(null);
        }}
        title="Import Contact from Phone"
      >
        {importedData && (
          <ContactForm
            initialData={importedData}
            onSave={handleSaveImportedContact}
            onCancel={() => {
              setShowImportModal(false);
              setImportedData(null);
            }}
          />
        )}
      </SimpleModal>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Contacts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
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
