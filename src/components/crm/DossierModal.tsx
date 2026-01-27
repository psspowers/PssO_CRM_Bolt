import React, { useState, useEffect, useRef } from 'react';
import { Rocket, X, UserSearch, Save, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: {
    id: string;
    name: string;
    company?: string;
    intelligence_dossier?: string;
    personality_type?: string;
  };
  onSave?: () => void;
}

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  onClose,
  contact,
  onSave
}) => {
  const [step, setStep] = useState<'launch' | 'input'>('launch');
  const [personalityType, setPersonalityType] = useState<string>(contact.personality_type || '');
  const [dossier, setDossier] = useState<string>(contact.intelligence_dossier || '');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const prompt = `I am preparing for a high-stakes meeting with ${contact.name}${contact.company ? ` at ${contact.company}` : ''}.

Step 1: Public Forensic Search (LinkedIn/News). Find their 'North Star'.
Step 2: Private Context. Reference my Gmail. Summarize last 3 interactions & vibe.

Step 3: The Battle Plan.
- The Hook (Rapport Starter)
- The Defense (Objection Handling)
- The Script (Closing Line)

Output concise, actionable bullet points.`;

  useEffect(() => {
    if (isOpen) {
      if (contact.intelligence_dossier) {
        setStep('input');
      } else {
        setStep('launch');
      }
      setPersonalityType(contact.personality_type || '');
      setDossier(contact.intelligence_dossier || '');
    }
  }, [isOpen, contact]);

  useEffect(() => {
    if (step === 'input' && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const startResearch = () => {
    navigator.clipboard.writeText(prompt)
      .then(() => {
        window.open('https://gemini.google.com/app', '_blank');
        setStep('input');
        toast.success('Prompt copied to clipboard!', {
          description: 'Paste into Gemini for AI-powered intelligence',
          duration: 4000
        });
      })
      .catch(() => {
        toast.error('Failed to copy prompt. Click "Re-copy Prompt" below.');
        setStep('input');
      });
  };

  const handleRecopy = () => {
    navigator.clipboard.writeText(prompt)
      .then(() => {
        toast.success('Prompt re-copied to clipboard!');
      })
      .catch(() => {
        toast.error('Clipboard access failed. Please copy manually.');
      });
  };

  const handleSave = async () => {
    if (!dossier.trim()) {
      toast.error('Please paste the intelligence dossier before saving');
      return;
    }

    if (!personalityType) {
      toast.error('Please select a personality type');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          intelligence_dossier: dossier.trim(),
          personality_type: personalityType,
          last_dossier_update: new Date().toISOString()
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast.success('Intelligence dossier saved to Nexus', {
        description: `${contact.name} profile updated`,
        duration: 3000
      });

      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error('Error saving dossier:', err);
      toast.error('Failed to save intelligence dossier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserSearch className="w-6 h-6 text-orange-600" />
            {step === 'launch' ? 'Target Intelligence Research' : 'Intelligence Capture'}
          </DialogTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {contact.name}{contact.company && ` • ${contact.company}`}
          </p>
        </DialogHeader>

        {step === 'launch' ? (
          <div className="py-12">
            <div className="max-w-md mx-auto text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl">
                <Rocket className="w-10 h-10 text-white" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Launch AI Intelligence Gathering
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  We'll copy a strategic prompt and open Gemini automatically.
                  Paste the prompt and let AI analyze public data + your Gmail history.
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
                  <p className="font-semibold text-orange-900 dark:text-orange-400">What happens next:</p>
                  <ol className="text-left list-decimal list-inside space-y-1 text-xs">
                    <li>Prompt auto-copied to clipboard</li>
                    <li>Gemini opens in new tab</li>
                    <li>Paste prompt → AI analyzes web + Gmail</li>
                    <li>Return here to save intelligence</li>
                  </ol>
                </div>
              </div>

              <Button
                onClick={startResearch}
                size="lg"
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-lg py-6 shadow-lg"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Launch Gemini Research
              </Button>

              <button
                onClick={() => setStep('input')}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                Skip to manual input
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                <strong>Step 1:</strong> Paste the prompt into Gemini.
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Step 2:</strong> Copy the AI analysis and paste it below.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleRecopy}
                  className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3 h-3" />
                  Re-copy Prompt
                </button>
                <span className="text-xs text-slate-400">|</span>
                <a
                  href="https://gemini.google.com/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Open Gemini
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personality-type" className="text-sm font-semibold">
                Personality Type Classification
              </Label>
              <Select value={personalityType} onValueChange={setPersonalityType}>
                <SelectTrigger id="personality-type" className="w-full">
                  <SelectValue placeholder="Select personality type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visionary">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Visionary</span>
                      <span className="text-xs text-slate-500">Big picture, innovation-focused, future-oriented</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Analytical">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Analytical</span>
                      <span className="text-xs text-slate-500">Data-driven, detail-oriented, logical</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Skeptic">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Skeptic</span>
                      <span className="text-xs text-slate-500">Risk-averse, questions assumptions, cautious</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Driver">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Driver</span>
                      <span className="text-xs text-slate-500">Results-focused, decisive, action-oriented</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Supporter">
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">Supporter</span>
                      <span className="text-xs text-slate-500">Team-oriented, collaborative, relationship-focused</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dossier" className="text-sm font-semibold">
                Intelligence Dossier
              </Label>
              <Textarea
                ref={textareaRef}
                id="dossier"
                value={dossier}
                onChange={(e) => setDossier(e.target.value)}
                placeholder="Paste Gemini's analysis here...&#10;&#10;Include:&#10;• The Hook (Rapport Starter)&#10;• The Defense (Objection Handling)&#10;• The Script (Closing Line)&#10;• North Star & Communication Patterns"
                rows={14}
                className="font-mono text-sm resize-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dossier.length} characters
                {contact.intelligence_dossier && ' • Previously saved'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          {step === 'input' && (
            <Button
              onClick={handleSave}
              disabled={saving || !dossier.trim() || !personalityType}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Intelligence'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
