import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Copy, Check, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

interface NexusImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  onImport: () => void;
}

type Step = 'prompt' | 'input' | 'review';

interface ParsedLink {
  sourceEmail: string;
  targetEmail: string;
  type: string;
  strength: string;
  sourceId?: string;
  sourceType?: 'User' | 'Contact';
  sourceName?: string;
  targetId?: string;
  targetType?: 'User' | 'Contact';
  targetName?: string;
  status: 'valid' | 'error';
  error?: string;
}

export const NexusImportModal: React.FC<NexusImportModalProps> = ({
  isOpen,
  onClose,
  accountName,
  onImport
}) => {
  const [step, setStep] = useState<Step>('prompt');
  const [csvInput, setCsvInput] = useState('');
  const [parsedLinks, setParsedLinks] = useState<ParsedLink[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const aiPrompt = `Analyze interactions with ${accountName}. Identify the POLITICAL HIERARCHY.
Who reports to whom? Who influences whom?

Output a **Strict CSV Code Block** (No text).

Headers: Source Email,Target Email,Type,Strength

Valid Types: 'Reports To', 'Works With', 'Decision Maker', 'Influencer'
Valid Strength: 'Weak', 'Medium', 'Strong'

Example:
\`\`\`csv
junior@client.com,boss@client.com,Reports To,Strong
analyst@client.com,manager@client.com,Works With,Medium
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

  const findEntityByEmail = async (email: string): Promise<{
    id: string;
    type: 'User' | 'Contact';
    name: string;
  } | null> => {
    email = email.trim().toLowerCase();

    const { data: userData, error: userError } = await supabase
      .from('crm_users')
      .select('id, name, email')
      .ilike('email', email)
      .maybeSingle();

    if (userData) {
      return { id: userData.id, type: 'User', name: userData.name };
    }

    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, email')
      .ilike('email', email)
      .maybeSingle();

    if (contactData) {
      return { id: contactData.id, type: 'Contact', name: contactData.name };
    }

    return null;
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

      const parsed = Papa.parse<string[]>(cleanedCsv, {
        header: false,
        skipEmptyLines: true
      });

      if (parsed.errors.length > 0) {
        toast.error('CSV parsing failed');
        return;
      }

      const rows = parsed.data;
      if (rows.length < 2) {
        toast.error('No data rows found');
        return;
      }

      const dataRows = rows.slice(1);
      const links: ParsedLink[] = [];

      for (const row of dataRows) {
        if (row.length < 4) continue;

        const [sourceEmail, targetEmail, type, strength] = row.map(cell => cell.trim());

        const link: ParsedLink = {
          sourceEmail,
          targetEmail,
          type,
          strength,
          status: 'error',
          error: 'Not yet validated'
        };

        const sourceEntity = await findEntityByEmail(sourceEmail);
        const targetEntity = await findEntityByEmail(targetEmail);

        if (!sourceEntity) {
          link.error = `Source contact not found: ${sourceEmail}`;
        } else if (!targetEntity) {
          link.error = `Target contact not found: ${targetEmail}`;
        } else {
          link.sourceId = sourceEntity.id;
          link.sourceType = sourceEntity.type;
          link.sourceName = sourceEntity.name;
          link.targetId = targetEntity.id;
          link.targetType = targetEntity.type;
          link.targetName = targetEntity.name;
          link.status = 'valid';
          link.error = undefined;
        }

        links.push(link);
      }

      setParsedLinks(links);

      const validIndices = links
        .map((link, idx) => link.status === 'valid' ? idx : -1)
        .filter(idx => idx !== -1);
      setSelectedIndices(new Set(validIndices));

      setStep('review');
      toast.success(`Parsed ${links.length} relationships`);
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Failed to parse CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleLink = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleCreateLinks = async () => {
    const selectedLinks = parsedLinks.filter((_, idx) => selectedIndices.has(idx));

    if (selectedLinks.length === 0) {
      toast.error('No links selected');
      return;
    }

    setIsProcessing(true);

    try {
      const relationships = selectedLinks.map(link => ({
        from_entity_id: link.sourceId,
        from_entity_type: link.sourceType,
        to_entity_id: link.targetId,
        to_entity_type: link.targetType,
        type: link.type,
        strength: link.strength.toLowerCase(),
        notes: `AI-imported relationship`
      }));

      const { error } = await supabase
        .from('relationships')
        .insert(relationships);

      if (error) throw error;

      toast.success(`Created ${relationships.length} relationships`);
      onImport();
      handleClose();
    } catch (err) {
      console.error('Insert error:', err);
      toast.error('Failed to create relationships');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep('prompt');
    setCsvInput('');
    setParsedLinks([]);
    setSelectedIndices(new Set());
    setIsCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Nexus AI Mapper</h2>
            <p className="text-sm text-slate-400 mt-1">
              Import relationships using AI
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'prompt' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm">Step 1: Copy Prompt</h3>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all"
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
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900 p-3 rounded border border-slate-600">
                  {aiPrompt}
                </pre>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-bold text-blue-300 text-sm mb-2">Instructions:</h3>
                <ol className="text-xs text-blue-200 space-y-2 list-decimal list-inside">
                  <li>Copy the prompt above</li>
                  <li>Open Google Gemini or ChatGPT</li>
                  <li>Paste the prompt and let AI analyze your emails</li>
                  <li>Copy the CSV output (including code block markers)</li>
                  <li>Return here and paste it in the next step</li>
                </ol>
              </div>

              <button
                onClick={() => setStep('input')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all"
              >
                Next: Paste CSV
              </button>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Step 2: Paste CSV Output
                </label>
                <textarea
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  placeholder="Paste the CSV output from AI here..."
                  className="w-full h-64 bg-slate-800 text-slate-100 border border-slate-600 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('prompt')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleParse}
                  disabled={isProcessing || !csvInput.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Parse & Validate'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="font-bold text-white text-sm mb-3">
                  Step 3: Review & Confirm ({selectedIndices.size} selected)
                </h3>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {parsedLinks.map((link, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-all ${
                        link.status === 'valid'
                          ? 'bg-slate-900 border-slate-600 hover:border-slate-500'
                          : 'bg-red-900/20 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {link.status === 'valid' ? (
                          <input
                            type="checkbox"
                            checked={selectedIndices.has(index)}
                            onChange={() => handleToggleLink(index)}
                            className="mt-1 w-4 h-4 rounded border-slate-500 text-orange-500 focus:ring-orange-500"
                          />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          {link.status === 'valid' ? (
                            <div className="text-sm">
                              <span className="font-bold text-white">{link.sourceName}</span>
                              <span className="text-slate-400 mx-2">→</span>
                              <span className="font-bold text-white">{link.targetName}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-bold">
                                  {link.type}
                                </span>
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-bold">
                                  {link.strength}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {link.sourceEmail} → {link.targetEmail}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div className="text-red-300 font-bold">{link.error}</div>
                              <div className="text-xs text-red-400 mt-1">
                                {link.sourceEmail} → {link.targetEmail}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateLinks}
                  disabled={isProcessing || selectedIndices.size === 0}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create {selectedIndices.size} Link{selectedIndices.size !== 1 ? 's' : ''}
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
