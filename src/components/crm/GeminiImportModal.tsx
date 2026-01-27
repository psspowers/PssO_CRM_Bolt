import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Copy, Check, Loader2, UserPlus, CheckCircle, Rocket } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface GeminiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  accountId?: string;
  accountName?: string;
}

type Step = 'prompt' | 'input' | 'review';

interface ParsedContact {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  company?: string;
  isDuplicate?: boolean;
}

export const GeminiImportModal: React.FC<GeminiImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  accountId,
  accountName
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('prompt');
  const [csvInput, setCsvInput] = useState('');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const aiPrompt = accountName
    ? `Analyze all contacts and people I've interacted with at ${accountName}.

Extract their contact information from LinkedIn, emails, and any other sources.

Output a **Strict CSV Code Block** (No text before or after).

Headers: Name,Email,Phone,Role

Example:
\`\`\`csv
Name,Email,Phone,Role
John Smith,john.smith@company.com,+1-555-0123,VP Sales
Sarah Johnson,sarah.j@company.com,,Senior Manager
\`\`\``
    : `Analyze all my recent professional contacts and extract their information.

Output a **Strict CSV Code Block** (No text before or after).

Headers: Name,Email,Phone,Role,Company

Example:
\`\`\`csv
Name,Email,Phone,Role,Company
John Smith,john.smith@company.com,+1-555-0123,VP Sales,Acme Corp
Sarah Johnson,sarah.j@company.com,,Senior Manager,Tech Inc
\`\`\``;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setIsCopied(true);
      toast.success('Prompt copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy prompt');
    }
  };

  const handleParse = async () => {
    if (!csvInput.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    setIsProcessing(true);

    try {
      let cleanedCsv = csvInput.trim();

      const codeBlockMatch = cleanedCsv.match(/```(?:csv)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanedCsv = codeBlockMatch[1].trim();
      }

      const parsed = Papa.parse<Record<string, string>>(cleanedCsv, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });

      if (parsed.errors.length > 0) {
        console.error('CSV parsing errors:', parsed.errors);
        toast.error('CSV parsing failed');
        setIsProcessing(false);
        return;
      }

      const rawRows = parsed.data;
      if (rawRows.length === 0) {
        toast.error('No data rows found');
        setIsProcessing(false);
        return;
      }

      const contacts: ParsedContact[] = [];

      for (const row of rawRows) {
        const name = (row.Name || row.name || '').trim();
        const email = (row.Email || row.email || '').trim().toLowerCase();
        const phone = (row.Phone || row.phone || '').trim();
        const role = (row.Role || row.role || '').trim();
        const company = (row.Company || row.company || '').trim();

        if (!email) continue;

        if (email === user?.email?.toLowerCase()) continue;

        if (name.toLowerCase().includes('full name') ||
            name.toLowerCase() === 'name' ||
            email.toLowerCase().includes('email')) {
          continue;
        }

        contacts.push({
          name,
          email,
          phone: phone || undefined,
          role: role || undefined,
          company: accountName || company || undefined,
          isDuplicate: false
        });
      }

      if (contacts.length === 0) {
        toast.error('No valid contacts found after filtering');
        setIsProcessing(false);
        return;
      }

      const extractedEmails = contacts.map(c => c.email);

      const { data: existingContacts, error: dbError } = await supabase
        .from('contacts')
        .select('email')
        .in('email', extractedEmails);

      if (dbError) {
        console.error('Database error checking duplicates:', dbError);
      }

      const existingEmailsSet = new Set(
        (existingContacts || []).map(c => c.email.toLowerCase())
      );

      contacts.forEach(contact => {
        if (existingEmailsSet.has(contact.email)) {
          contact.isDuplicate = true;
        }
      });

      setParsedContacts(contacts);

      const newContactIndices = contacts
        .map((contact, idx) => (!contact.isDuplicate ? idx : null))
        .filter((idx): idx is number => idx !== null);

      setSelectedIndices(new Set(newContactIndices));

      const duplicateCount = contacts.filter(c => c.isDuplicate).length;
      const newCount = contacts.length - duplicateCount;

      setStep('review');

      if (duplicateCount > 0) {
        toast.success(
          `Found ${newCount} new contact${newCount !== 1 ? 's' : ''} (${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} excluded)`
        );
      } else {
        toast.success(`Parsed ${contacts.length} contact${contacts.length !== 1 ? 's' : ''} (excluding yourself)`);
      }
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleContact = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleToggleAll = () => {
    if (selectedIndices.size === parsedContacts.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parsedContacts.map((_, idx) => idx)));
    }
  };

  const executeImport = async () => {
    const selectedContacts = parsedContacts.filter(
      (contact, idx) => selectedIndices.has(idx) && !contact.isDuplicate
    );

    if (selectedContacts.length === 0) {
      toast.error('No contacts selected');
      return;
    }

    setIsProcessing(true);

    try {
      const contactsToInsert = selectedContacts.map(contact => ({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        role: contact.role || null,
        company: contact.company || null,
        ...(accountId && { linked_account_id: accountId })
      }));

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsToInsert)
        .select();

      if (error) throw error;

      toast.success(`Imported ${data.length} contact${data.length !== 1 ? 's' : ''} successfully`);
      onImport();
      handleClose();
    } catch (err: any) {
      console.error('Insert error:', err);

      if (err.code === '23505') {
        toast.error('Some contacts already exist (duplicate emails)');
      } else {
        toast.error('Failed to import contacts');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('prompt');
    setCsvInput('');
    setParsedContacts([]);
    setSelectedIndices(new Set());
    setIsCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-orange-600" />
              Gemini Contact Importer
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {accountName ? `Import contacts for ${accountName}` : 'Bulk import contacts using AI'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Step 1: Copy Prompt</h3>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-600">
                  {aiPrompt}
                </pre>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-2">Instructions:</h3>
                <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                  <li>Copy the prompt above</li>
                  <li>Open Google Gemini (with Gmail access enabled)</li>
                  <li>Paste the prompt and let AI analyze your contacts</li>
                  <li>Copy the CSV output (including code block markers)</li>
                  <li>Return here and paste it in the next step</li>
                </ol>
              </div>

              <button
                onClick={() => setStep('input')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold transition-all"
              >
                Next: Paste CSV
              </button>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Step 2: Paste CSV Output
                </label>
                <textarea
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="Paste the CSV output from Gemini here...&#10;&#10;Example:&#10;```csv&#10;Name,Email,Phone,Role&#10;John Smith,john@company.com,555-0123,VP Sales&#10;```"
                  className="w-full h-64 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('prompt')}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleParse}
                  disabled={isProcessing || !csvInput.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    'Parse & Review'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Review Candidates ({selectedIndices.size} of {parsedContacts.length} selected)
                  </h3>
                  <button
                    onClick={handleToggleAll}
                    className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-bold"
                  >
                    {selectedIndices.size === parsedContacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {parsedContacts.map((contact, index) => (
                    <div
                      key={index}
                      onClick={() => handleToggleContact(index)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        contact.isDuplicate ? 'opacity-50' : ''
                      } ${
                        selectedIndices.has(index)
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-500/50'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(index)}
                          onChange={() => handleToggleContact(index)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-500 text-orange-600 focus:ring-orange-500"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {contact.name}
                            </span>
                            {contact.isDuplicate && (
                              <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded text-xs font-bold">
                                Existing
                              </span>
                            )}
                            {contact.role && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded text-xs font-bold">
                                {contact.role}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {contact.email}
                          </div>
                          {contact.phone && (
                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                              {contact.phone}
                            </div>
                          )}
                          {contact.company && (
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              {contact.company}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-lg p-3">
                <p className="text-xs text-orange-900 dark:text-orange-300">
                  <strong>Note:</strong> Your own email and existing contacts have been automatically excluded.
                  Contacts marked as "Existing" are already in your database and are unchecked by default.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all"
                >
                  Back
                </button>
                <button
                  onClick={executeImport}
                  disabled={isProcessing || selectedIndices.size === 0}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Import {selectedIndices.size} Contact{selectedIndices.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
