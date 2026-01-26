import React, { useState, useMemo } from 'react';
import { Plus, User, Loader2, Trash2, Smartphone } from 'lucide-react';
import { Contact } from '../../types/crm';
import { useAppContext } from '../../contexts/AppContext';
import { ContactForm } from './ContactForm';
import { ContactCard } from './ContactCard';
import { isContactPickerSupported, openNativeContactPicker, mapNativeToCRM } from '../../lib/device/contacts';
import { toast } from 'sonner';

interface AccountContactsProps {
  accountId: string;
  accountName: string;
}

export const AccountContacts: React.FC<AccountContactsProps> = ({ accountId, accountName }) => {
  const { contacts, createContact, deleteContact, canDelete } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState<Partial<Contact> | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const isContactApiSupported = typeof navigator !== 'undefined' && 'contacts' in navigator && navigator.contacts && 'select' in navigator.contacts;

  const accountContacts = useMemo(() => {
    return contacts.filter(c => c.accountId === accountId);
  }, [contacts, accountId]);

  const handleSaveContact = async (data: Partial<Contact>) => {
    await createContact({
      fullName: data.fullName || '',
      role: data.role || '',
      accountId: accountId,
      email: data.email || '',
      phone: data.phone || '',
      country: data.country || 'Thailand',
      city: data.city || '',
      tags: data.tags || [],
      clickupLink: data.clickupLink,
      relationshipNotes: data.relationshipNotes,
    });
    setIsAdding(false);
  };

  const handleUpdateContact = async (data: Partial<Contact>) => {
    if (selectedContact) {
      await createContact({
        fullName: data.fullName || selectedContact.fullName,
        role: data.role || selectedContact.role,
        accountId: accountId,
        email: data.email || selectedContact.email,
        phone: data.phone || selectedContact.phone,
        country: data.country || selectedContact.country,
        city: data.city || selectedContact.city,
        tags: data.tags || selectedContact.tags,
        clickupLink: data.clickupLink || selectedContact.clickupLink,
        relationshipNotes: data.relationshipNotes || selectedContact.relationshipNotes,
      });
      setSelectedContact(null);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (canDelete() && confirm('Delete this contact?')) {
      await deleteContact(contactId);
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
        const mappedData = mapNativeToCRM(selected[0], accountName);
        setImportedData(mappedData);
        setIsImporting(true);
      }
    } catch (err) {
      console.error('Phone import error:', err);
      toast.error('Failed to import contact from phone');
    }
  };

  const handleSaveImportedContact = async (data: Partial<Contact>) => {
    await createContact({
      ...data,
      accountId: accountId,
    });
    setIsImporting(false);
    setImportedData(null);
    toast.success('Contact imported successfully');
  };

  if (isAdding) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Add Contact to {accountName}</h3>
        </div>
        <ContactForm
          defaultAccountId={accountId}
          onSave={handleSaveContact}
          onCancel={() => setIsAdding(false)}
        />
      </div>
    );
  }

  if (isImporting && importedData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Import Contact to {accountName}</h3>
        </div>
        <ContactForm
          initialData={importedData}
          defaultAccountId={accountId}
          onSave={handleSaveImportedContact}
          onCancel={() => {
            setIsImporting(false);
            setImportedData(null);
          }}
        />
      </div>
    );
  }

  if (selectedContact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Edit Contact</h3>
        </div>
        <ContactForm
          contact={selectedContact}
          defaultAccountId={accountId}
          onSave={handleUpdateContact}
          onCancel={() => setSelectedContact(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Contacts ({accountContacts.length})
        </h3>
        <div className="flex items-center gap-2">
          {isContactApiSupported && (
            <button
              onClick={handleImportFromPhone}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
            >
              <Smartphone className="w-4 h-4" />
              Import
            </button>
          )}
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {accountContacts.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <h4 className="text-lg font-semibold text-slate-900 mb-2">No contacts yet</h4>
          <p className="text-slate-500 text-sm mb-4">Add contacts to track key people at {accountName}</p>
          <div className="flex items-center justify-center gap-2">
            {isContactApiSupported && (
              <button
                onClick={handleImportFromPhone}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
              >
                <Smartphone className="w-4 h-4" />
                Import from Phone
              </button>
            )}
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add First Contact
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {accountContacts.map(contact => (
            <div key={contact.id} className="relative group">
              <ContactCard
                contact={contact}
                onClick={() => setSelectedContact(contact)}
              />
              {canDelete() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteContact(contact.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
