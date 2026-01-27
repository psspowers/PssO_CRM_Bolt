import React, { useState, useEffect } from 'react';
import { Copy, X, UserSearch, Save, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const DUAL_VECTOR_PROMPT = `**MISSION: DEEP TARGET PROFILING**

You are an elite intelligence analyst tasked with creating a comprehensive strategic dossier.

**SUBJECT:** [NAME] at [COMPANY]

**YOUR MISSION:**
Use TWO intelligence vectors to build a complete profile:

**VECTOR 1: WEB INTELLIGENCE**
- Search: "[NAME] + [COMPANY]" + LinkedIn, press releases, conference talks
- Extract: Role, tenure, past companies, education, public statements
- Look for: Career trajectory, strategic priorities, public persona

**VECTOR 2: GMAIL INTELLIGENCE** (If user has authorized Gmail API)
- Analyze: Email communication patterns, meeting frequencies, response times
- Identify: Decision-making style, priorities, pain points mentioned
- Note: Stakeholder relationships, project involvement

**OUTPUT FORMAT:**

### EXECUTIVE SUMMARY
[2-3 sentence strategic overview]

### PROFESSIONAL PROFILE
- Current Role & Tenure:
- Career Background:
- Education:
- Key Achievements:

### PERSONALITY ASSESSMENT
Choose ONE: Visionary / Analytical / Skeptic / Driver / Supporter
[Justify the classification with specific evidence]

### STRATEGIC INTELLIGENCE
- Decision-Making Style:
- Known Pain Points:
- Strategic Priorities:
- Influence Network:

### ENGAGEMENT STRATEGY
- Best Approach:
- Topics of Interest:
- Red Flags to Avoid:
- Optimal Communication Channel:

### RELATIONSHIP MAP
- Reports To:
- Key Allies:
- Budget Authority: [Estimated]

**CRITICAL:** Base everything on verifiable data. Flag assumptions clearly.`;

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
  const [personalityType, setPersonalityType] = useState<string>(contact.personality_type || '');
  const [dossier, setDossier] = useState<string>(contact.intelligence_dossier || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPersonalityType(contact.personality_type || '');
      setDossier(contact.intelligence_dossier || '');
    }
  }, [isOpen, contact]);

  const handleCopyPrompt = () => {
    const customizedPrompt = DUAL_VECTOR_PROMPT
      .replace('[NAME]', contact.name)
      .replace('[COMPANY]', contact.company || 'Unknown Company');

    navigator.clipboard.writeText(customizedPrompt);
    toast.success('Intelligence prompt copied! Paste into Gemini or ChatGPT.', {
      description: 'Personal intelligence enabled? Review Gmail access.',
      duration: 5000
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserSearch className="w-6 h-6 text-orange-600" />
            Target Intelligence: {contact.name}
          </DialogTitle>
          {contact.company && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {contact.company}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  SECTION 1: THE TRIGGER
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Dual-Vector Intelligence Prompt (Web + Gmail)
                </p>
              </div>
              <Button
                onClick={handleCopyPrompt}
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Prompt
              </Button>
            </div>

            <Alert className="bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Instructions:</strong> Copy the prompt above, paste into Gemini or ChatGPT-4, and wait for comprehensive intelligence.
                If you've authorized Gmail API access, the AI will analyze email patterns for deeper insights.
              </AlertDescription>
            </Alert>

            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-300 dark:border-slate-600 max-h-48 overflow-y-auto">
              <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                {DUAL_VECTOR_PROMPT.replace('[NAME]', contact.name).replace('[COMPANY]', contact.company || 'Unknown Company')}
              </pre>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              SECTION 2: THE CAPTURE
            </h3>

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
                id="dossier"
                value={dossier}
                onChange={(e) => setDossier(e.target.value)}
                placeholder="Paste Gemini Intelligence Here...&#10;&#10;Include:&#10;- Executive Summary&#10;- Professional Profile&#10;- Strategic Intelligence&#10;- Engagement Strategy&#10;- Relationship Map"
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dossier.length} characters | Last updated: {contact.intelligence_dossier ? 'Previously saved' : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !dossier.trim() || !personalityType}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save to Nexus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
