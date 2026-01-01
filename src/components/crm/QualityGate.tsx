import React from 'react';
import { ShieldCheck, CheckCircle2, Circle, Lock, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { Progress } from '../ui/progress';
import { OpportunityStage } from '../../types/crm';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

// Stage progression map
const STAGE_PROGRESSION: Record<string, string | null> = {
  'Discovery': 'Pre-Dev',
  'Pre-Dev': 'Development',
  'Development': 'Contract',
  'Contract': 'Won',
  'Won': null,
  'Lost': null
};

// INVESTOR-FOCUSED QUALITY GATES - PPA Underwriting Terminology
const STAGE_GATES: Record<string, { id: string; label: string }[]> = {
  'Discovery': [
    { id: 'origination', label: 'Origination / Initial Contact' },
    { id: 'indicative_offer', label: 'Indicative Offer (Initial Proposal)' },
    { id: 'decision_unit', label: 'Stakeholders / Decision Unit Identified' },
    { id: 'prelim_yield', label: 'Site Preliminary Yield Estimate' }
  ],
  'Pre-Dev': [
    { id: 'commercial_workshop', label: 'Commercial Workshop (1st Presentation)' },
    { id: 'pre_ic_filter', label: 'Pre-IC Filter (Go-No-Go Approval)' },
    { id: 'data_room', label: 'Data Room: 12mo Bills & Load Profile' }
  ],
  'Development': [
    { id: 'investment_case', label: 'Final Investment Case Presentation' },
    { id: 'tdd_signoff', label: 'Technical Due Diligence (TDD) Sign-off' },
    { id: 'economic_audit', label: 'Unit Economic Audit (Financial Model)' }
  ],
  'Contract': [
    { id: 'bidding', label: 'Competitive Bidding / Positioning' },
    { id: 'term_sheet', label: 'Term Sheet Executed' },
    { id: 'legal_dd', label: 'Legal DD / PPA Redlining' },
    { id: 'credit_approval', label: 'Counterparty Credit Approval' }
  ],
  'Won': [
    { id: 'ppa_execution', label: 'PPA Execution (Signed)' },
    { id: 'deposit_received', label: 'Security Deposit / CP Satisfaction' }
  ]
};

interface QualityGateProps {
  currentStage: OpportunityStage;
  completedItems: string[];
  onToggleItem: (id: string) => void;
  lostReason?: string;
  onLostReasonChange?: (reason: string) => void;
  onAdvanceStage?: () => void;
}

export const QualityGate: React.FC<QualityGateProps> = ({
  currentStage,
  completedItems,
  onToggleItem,
  lostReason,
  onLostReasonChange,
  onAdvanceStage
}) => {
  // Handle Lost stage with reason input
  if (currentStage === 'Lost') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-red-700">
          <Trash2 className="w-5 h-5" />
          <span className="font-bold text-sm uppercase tracking-wider">Deal Terminated</span>
        </div>
        <p className="text-xs text-red-600">Provide a reason for post-investment review:</p>
        <Textarea 
          placeholder="Why was this deal lost? (e.g., Credit failure, Competitor PPA rate, Technical constraints, Counterparty withdrew...)"
          value={lostReason || ''}
          onChange={(e) => onLostReasonChange?.(e.target.value)}
          className="bg-white border-red-200 focus:ring-red-500 min-h-[80px]"
        />
        {lostReason && (
          <div className="flex items-start gap-2 p-3 bg-red-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-800 leading-tight">
              <b>Recorded:</b> This reason will be used for portfolio analytics and future deal screening.
            </p>
          </div>
        )}
      </div>
    );
  }

  const gates = STAGE_GATES[currentStage] || [];
  const completedCount = gates.filter(g => completedItems.includes(g.id)).length;
  const progress = gates.length > 0 ? (completedCount / gates.length) * 100 : 0;
  const isLocked = progress < 100 && currentStage !== 'Won';
  const isFullyComplete = progress === 100;
  const nextStage = STAGE_PROGRESSION[currentStage];

  return (
    <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
      {/* Header with dark background */}
      <div className="bg-slate-900 p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold uppercase tracking-wider">PPA Quality Gate</span>
          </div>
          <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">
            Stage: {currentStage}
          </span>
        </div>
        <Progress 
          value={progress} 
          className="h-1.5 bg-white/20" 
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-slate-400">
            {completedCount} of {gates.length} Investment Milestones
          </p>
          {isFullyComplete && (
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Gate Cleared
            </span>
          )}
        </div>
      </div>

      {/* Checklist items */}
      <div className="p-4 space-y-2">
        {gates.map((item) => {
          const isDone = completedItems.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggleItem(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                isDone 
                  ? 'bg-emerald-50 border border-emerald-100' 
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 group-hover:text-orange-400 shrink-0" />
              )}
              <span className={`text-sm font-medium ${
                isDone ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Gate locked warning */}
        {isLocked && (
          <div className="mt-4 flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-tight">
              <b>Gate Locked:</b> Complete all investment milestones above before advancing this deal to the next underwriting stage.
            </p>
          </div>
        )}

        {/* Gate cleared - Advance to next stage button */}
        {isFullyComplete && nextStage && onAdvanceStage && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-800 leading-tight">
                <b>Gate Cleared:</b> All milestones complete. This deal is ready to advance to the next investment stage.
              </p>
            </div>
            <Button
              onClick={onAdvanceStage}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Advance to {nextStage} Stage
            </Button>
          </div>
        )}

        {/* Gate cleared message for Won stage (no advancement) */}
        {isFullyComplete && !nextStage && currentStage === 'Won' && (
          <div className="mt-4 flex gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-800 leading-tight">
              <b>Deal Won:</b> All post-signature requirements complete. Deal ready for project handoff.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
