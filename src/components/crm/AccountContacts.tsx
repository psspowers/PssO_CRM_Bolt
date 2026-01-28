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
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface AccountContactsProps {
  accountId: string;
  accountName: string;
  opportunityName?: string;
}

interface ParsedCandidate {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export const AccountContacts: React.FC<AccountContactsProps> = ({ accountId, accountName, opportunityName }) => {
  const { contacts, createContact, deleteContact, canDelete } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState<Partial<Contact> | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiStep, setGeminiStep] = useState<1 | 2 | 3>(1);
  const [csvInput, setCsvInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [parsedCandidates, setParsedCandidates] = useState<ParsedCandidate[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

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

  const handleDeleteSelectedContact = async () => {
    if (selectedContact) {
      await deleteContact(selectedContact.id);
      setSelectedContact(null);
      toast.success('Contact deleted successfully');
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

  const geminiPrompt = opportunityName
    ? `Search my Emails and **Calendar Invites** regarding:
1. The Deal: "${opportunityName}"
2. The Company: "${accountName}"
3. Related keywords: "Meeting", "Kickoff", "Discussion", "Proposal" linked to the above.

**MISSION:**
Identify ALL stakeholders, especially:
- External Partners (e.g., Huawei, EPCs, Consultants).
- **Meeting Attendees** from calendar invites.
- People CC'd on high-level threads.

**OUTPUT FORMAT:**
Strict **CSV Code Block** only. No conversation.
Headers: Full Name,Email,Phone,Role

**RULES:**
- Put EACH contact on a NEW LINE.
- If Role is unknown, infer it from their signature or email domain (e.g., "@huawei.com" -> "Huawei Representative").
- Do NOT truncate lists.

Example:
\`\`\`csv
John Doe,john@huawei.com,+66 123 456 789,Huawei Manager
Jane Smith,jane@supplier.com,,Technical Lead
\`\`\``
    : `Search my Emails and **Calendar Invites** regarding:
1. The Company: "${accountName}"
2. Related keywords: "Meeting", "Discussion", "Proposal", "Partnership" linked to the above.

**MISSION:**
Identify ALL stakeholders, especially:
- External Partners and Suppliers.
- **Meeting Attendees** from calendar invites.
- People CC'd on important threads.

**OUTPUT FORMAT:**
Strict **CSV Code Block** only. No conversation.
Headers: Full Name,Email,Phone,Role

**RULES:**
- Put EACH contact on a NEW LINE.
- If Role is unknown, infer it from their signature or email domain.
- Do NOT truncate lists.

Example:
\`\`\`csv
John Doe,john@company.com,+66 123 456 789,Sales Manager
Jane Smith,jane@supplier.com,,Technical Lead
\`\`\``;

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
      let cleanedInput = csvInput.trim();

      cleanedInput = cleanedInput.replace(/```csv\n?/g, '').replace(/```\n?/g, '');

      const lines = cleanedInput.split('\n').filter(line => line.trim().length > 0);

      if (lines.length === 0) {
        toast.error('No valid data found');
        setIsProcessing(false);
        return;
      }

      let dataLines = [...lines];

      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes('full name') || firstLine.includes('email') || firstLine.includes('phone') || firstLine.includes('role')) {
        dataLines = lines.slice(1);
      }

      if (dataLines.length === 0) {
        toast.error('No contact data found after header');
        setIsProcessing(false);
        return;
      }

      const candidates: ParsedCandidate[] = [];

      for (const line of dataLines) {
        const parsed = Papa.parse<string[]>(line, {
          header: false,
          skipEmptyLines: true,
        });

        if (!parsed.data || parsed.data.length === 0) {
          continue;
        }

        const row = parsed.data[0];
        const name = row[0]?.trim() || '';
        const email = row[1]?.trim() || '';
        const phone = row[2]?.trim() || '';
        const role = row[3]?.trim() || '';

        if (!name || !email) {
          continue;
        }

        candidates.push({ name, email, phone, role });
      }

      if (candidates.length === 0) {
        toast.error('No valid contacts found in CSV data');
        setIsProcessing(false);
        return;
      }

      setParsedCandidates(candidates);
      const allIndices = new Set(candidates.map((_, index) => index));
      setSelectedIndices(allIndices);
      setGeminiStep(3);
      toast.success(`Parsed ${candidates.length} contact(s). Review and select which to import.`);
    } catch (err) {
      console.error('CSV processing error:', err);
      toast.error('Failed to process CSV data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (selectedIndices.size === 0) {
      toast.error('Please select at least one contact to import');
      return;
    }

    setIsProcessing(true);

    try {
      const selectedCandidates = parsedCandidates.filter((_, index) =>
        selectedIndices.has(index)
      );

      let created = 0;
      let skipped = 0;

      for (const candidate of selectedCandidates) {
        const existingContact = contacts.find(
          c => c.email?.toLowerCase() === candidate.email.toLowerCase()
        );

        if (existingContact) {
          skipped++;
          continue;
        }

        await createContact({
          fullName: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          role: candidate.role,
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
      setParsedCandidates([]);
      setSelectedIndices(new Set());
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Failed to import contacts');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === parsedCandidates.length) {
      setSelectedIndices(new Set());
    } else {
      const allIndices = new Set(parsedCandidates.map((_, index) => index));
      setSelectedIndices(allIndices);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
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
          onDelete={canDelete() ? handleDeleteSelectedContact : undefined}
        />
      </div>
    );
  }

  if (!accountId) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-amber-800 text-sm font-semibold">
          Please link an Account to this Opportunity before importing contacts.
        </p>
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
          setParsedCandidates([]);
          setSelectedIndices(new Set());
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
                  {opportunityName
                    ? 'Copy this prompt and paste it into Gemini to extract stakeholders from your emails related to this deal.'
                    : 'Copy this prompt and paste it into Gemini to extract contacts from your emails.'}
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
          ) : geminiStep === 2 ? (
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
                    'Parse & Review'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Step 3: Review & Select Contacts</h3>
                <p className="text-sm text-purple-700 mb-2">
                  Select which contacts you want to import. Duplicates will be automatically skipped.
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-purple-800 font-semibold">
                    {selectedIndices.size} of {parsedCandidates.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-purple-700 border-purple-300 hover:bg-purple-100"
                  >
                    {selectedIndices.size === parsedCandidates.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] rounded-lg border border-slate-200">
                <div className="space-y-2 p-4">
                  {parsedCandidates.map((candidate, index) => {
                    const isSelected = selectedIndices.has(index);
                    const isDuplicate = contacts.some(
                      c => c.email?.toLowerCase() === candidate.email.toLowerCase()
                    );

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                          isSelected && !isDuplicate
                            ? 'bg-purple-50 border-purple-200'
                            : isDuplicate
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(index)}
                          disabled={isDuplicate}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900 truncate">
                              {candidate.name}
                            </span>
                            {isDuplicate && (
                              <Badge variant="secondary" className="text-xs">
                                Duplicate
                              </Badge>
                            )}
                            {candidate.role && !isDuplicate && (
                              <Badge variant="outline" className="text-xs">
                                {candidate.role}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 truncate">{candidate.email}</div>
                          {candidate.phone && (
                            <div className="text-xs text-slate-500 mt-1">{candidate.phone}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setGeminiStep(2)}
                  disabled={isProcessing}
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={handleExecuteImport}
                  disabled={isProcessing || selectedIndices.size === 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import Selected (${selectedIndices.size})`
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
