import React, { useState, useMemo } from 'react';
import { Plus, User, Loader2, Trash2, Smartphone, Sparkles, Copy, Check } from 'lucide-react';
import { Contact } from '../../types/crm';
import { useAppContext } from '../../contexts/AppContext';
import { ContactForm } from './ContactForm';
import { ContactCard } from './ContactCard';
import { isContactPickerSupported, openNativeContactPicker, mapNativeToCRM } from '../../lib/device/contacts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import Papa from 'papaparse';

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
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiStep, setGeminiStep] = useState<1 | 2>(1);
  const [csvInput, setCsvInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

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

  const geminiPrompt = `Search my emails for contacts from "${accountName}". Extract all unique contacts and return them in CSV format with these columns: Full Name, Email, Phone, Role. Include the header row. Example format:
Full Name,Email,Phone,Role
John Doe,john@example.com,+1234567890,CEO
Jane Smith,jane@example.com,+1234567891,CTO`;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(geminiPrompt);
      setPromptCopied(true);
      toast.success('Prompt copied to clipboard');
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy prompt');
    }
  };

  const handleProcessCSV = async () => {
    if (!csvInput.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    setIsProcessing(true);

    try {
      const parsed = Papa.parse<string[]>(csvInput.trim(), {
        header: false,
        skipEmptyLines: true,
      });

      if (!parsed.data || parsed.data.length < 2) {
        toast.error('Invalid CSV format');
        setIsProcessing(false);
        return;
      }

      const rows = parsed.data.slice(1);
      let created = 0;
      let skipped = 0;

      for (const row of rows) {
        const [fullName, email, phone, role] = row;

        if (!fullName || !email) {
          skipped++;
          continue;
        }

        const existingContact = contacts.find(
          c => c.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingContact) {
          skipped++;
          continue;
        }

        await createContact({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone?.trim() || '',
          role: role?.trim() || '',
          accountId: accountId,
          country: 'Thailand',
          city: '',
          tags: [],
        });

        created++;
      }

      toast.success(`Imported ${created} contact(s). Skipped ${skipped} duplicate(s).`);
      setShowGeminiModal(false);
      setGeminiStep(1);
      setCsvInput('');
    } catch (err) {
      console.error('CSV processing error:', err);
      toast.error('Failed to process CSV data');
    } finally {
      setIsProcessing(false);
    }
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
          <button
            onClick={() => setShowGeminiModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Gemini</span>
          </button>
          {isContactApiSupported && (
            <button
              onClick={handleImportFromPhone}
              className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
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
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setShowGeminiModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <Sparkles className="w-4 h-4" />
              Gemini Import
            </button>
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

      <Dialog open={showGeminiModal} onOpenChange={(open) => {
        setShowGeminiModal(open);
        if (!open) {
          setGeminiStep(1);
          setCsvInput('');
          setPromptCopied(false);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Gemini Import - Step {geminiStep}
            </DialogTitle>
          </DialogHeader>

          {geminiStep === 1 ? (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Step 1: Copy Prompt</h3>
                <p className="text-sm text-purple-700 mb-4">
                  Copy this prompt and paste it into Gemini to extract contacts from your emails.
                </p>
                <div className="bg-white border border-purple-200 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap mb-4">
                  {geminiPrompt}
                </div>
                <Button
                  onClick={handleCopyPrompt}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={promptCopied}
                >
                  {promptCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Prompt to Clipboard
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-slate-600">
                  After Gemini generates the CSV, click Next to paste it.
                </p>
                <Button
                  onClick={() => setGeminiStep(2)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Next: Paste CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Step 2: Paste CSV Results</h3>
                <p className="text-sm text-purple-700 mb-4">
                  Paste the CSV data from Gemini below. We'll automatically check for duplicates.
                </p>
                <Textarea
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="Full Name,Email,Phone,Role
John Doe,john@example.com,+1234567890,CEO
Jane Smith,jane@example.com,+1234567891,CTO"
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setGeminiStep(1)}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleProcessCSV}
                  disabled={isProcessing || !csvInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Contacts'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
