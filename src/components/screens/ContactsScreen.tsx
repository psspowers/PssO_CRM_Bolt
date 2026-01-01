import React, { useState, useMemo } from 'react';
import { SearchBar, ContactCard, DetailModal, ContactForm } from '../crm';
import { useAppContext } from '../../contexts/AppContext';
import { Contact } from '../../types/crm';
import { MapPin, Mail, Phone, Building2, Loader2, CheckSquare, Square, X, Trash2, Pencil } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export const ContactsScreen: React.FC = () => {
  const { contacts, accounts, partners, activities, relationships, users, loading, deleteContact, updateContact, canDelete, canEdit } = useAppContext();
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const userCanDelete = canDelete();
  const userCanEdit = selectedContact ? canEdit(selectedContact.ownerId) : false;

  const filtered = useMemo(() => contacts.filter(c => 
    c.fullName.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase())
  ), [contacts, search]);

  const deletableContacts = filtered.filter(c => canDelete());
  const allSelected = deletableContacts.length > 0 && deletableContacts.every(c => selectedIds.has(c.id));
  const getOrg = (c: Contact) => {
    // Use accountId/partnerId from the Contact type
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

  const handleCloseModal = () => { setSelectedContact(null); setIsEditing(false); };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="pb-24 space-y-4">
      {selectionMode ? (
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-200">
          <div className="flex items-center gap-3">
            <button onClick={exitSelectionMode} className="p-1.5 hover:bg-emerald-100 rounded-lg"><X className="w-5 h-5 text-gray-600" /></button>
            <span className="font-medium text-emerald-800">{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSelectAll} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 rounded-lg">{allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}{allSelected ? 'Deselect All' : 'Select All'}</button>
            <button onClick={() => setShowBulkDeleteDialog(true)} disabled={selectedIds.size === 0} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"><Trash2 className="w-4 h-4" />Delete ({selectedIds.size})</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search contacts..." showFilter={false} /></div>
          {userCanDelete && <button onClick={() => setSelectionMode(true)} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200" aria-label="Bulk select"><CheckSquare className="w-5 h-5" /></button>}
        </div>
      )}
      <p className="text-sm text-gray-500">{filtered.length} contacts</p>
      <div className="space-y-3">
        {filtered.map(contact => <ContactCard key={contact.id} contact={contact} organizationName={getOrg(contact)} onClick={() => !selectionMode && setSelectedContact(contact)} showCheckbox={selectionMode && canDelete(contact.ownerId)} isSelected={selectedIds.has(contact.id)} onSelect={handleSelect} />)}
        {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No contacts found</p>}
      </div>
      <DetailModal isOpen={!!selectedContact} onClose={handleCloseModal} title={selectedContact?.fullName || ''} subtitle={selectedContact?.role} entityId={selectedContact?.id || ''} entityType="Contact" clickupLink={selectedContact?.clickupLink} activities={activities} users={users} contacts={contacts} accounts={accounts} partners={partners} relationships={relationships}>
        {selectedContact && (isEditing ? (
          <ContactForm contact={selectedContact} onSave={handleSaveContact} onCancel={() => setIsEditing(false)} />
        ) : (
          <div className="space-y-4">
            {userCanEdit && <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"><Pencil className="w-4 h-4" />Edit Contact</button>}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3"><MapPin className="w-5 h-5 text-gray-600 mb-1" /><p className="text-xs text-gray-500">Location</p><p className="font-semibold text-sm">{selectedContact.city}, {selectedContact.country}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><Building2 className="w-5 h-5 text-gray-600 mb-1" /><p className="text-xs text-gray-500">Organization</p><p className="font-semibold text-sm">{getOrg(selectedContact)}</p></div>
            </div>
            <div className="space-y-2">
              <a href={`mailto:${selectedContact.email}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100"><Mail className="w-5 h-5 text-emerald-600" /><span className="text-sm">{selectedContact.email}</span></a>
              <a href={`tel:${selectedContact.phone}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100"><Phone className="w-5 h-5 text-emerald-600" /><span className="text-sm">{selectedContact.phone}</span></a>
            </div>
            {selectedContact.tags.length > 0 && <div className="flex flex-wrap gap-2">{selectedContact.tags.map(t => <span key={t} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">{t}</span>)}</div>}
          </div>
        ))}
      </DetailModal>
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedIds.size} Contacts</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">{isDeleting ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
