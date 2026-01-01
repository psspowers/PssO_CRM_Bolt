import React, { useState, useMemo } from 'react';
import { ShieldAlert, Landmark, FileCheck, Lock, AlertCircle, Info, Gauge, Building2, Calendar, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { THAI_SECTOR_TAXONOMY } from '../../data/thaiTaxonomy';

interface CreditRiskHubProps {
  sector: string;
  industry?: string;
  subIndustry?: string;
  accountName: string;
}

export const CreditRiskHub: React.FC<CreditRiskHubProps> = ({ 
  sector, 
  industry, 
  subIndustry, 
  accountName 
}) => {
  const { currentUser } = useAppContext();

  // --- SECURITY ROLE GATE ---
  // Ensure only internal staff can see this underwriting data.
  // Partners (external) will see nothing.
  if (currentUser?.role === 'external') return null;

  // --- UNDERWRITING STATES ---
  const [yearsInBusiness, setYearsInBusiness] = useState(10);
  const [financialsAvailable, setFinancialsAvailable] = useState(false);
  const [debtLevel, setDebtLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [estateType, setEstateType] = useState('Tier-1 Estate (Amata/WHA)');
  const [ownership, setOwnership] = useState('Private Thai Co');
  const [paymentHistory, setPaymentHistory] = useState<'Excellent' | 'Good' | 'Fair' | 'Poor'>('Good');

  // --- THE SCORING ENGINE ---
  const scrutinyScore = useMemo(() => {
    // 1. Get Base Score from Thai Taxonomy
    const taxonomyMatch = THAI_SECTOR_TAXONOMY.find(t => t.subIndustry === subIndustry) ||
                          THAI_SECTOR_TAXONOMY.find(t => t.industry === industry) ||
                          THAI_SECTOR_TAXONOMY.find(t => t.sector === sector);
    
    // Logic: taxonomy.points (1-5) where 5 is best.
    // We convert points to a 50-point base score.
    let score = taxonomyMatch ? (taxonomyMatch.points * 10) : 30; 

    // 2. Longevity Bonus (Max 10 points)
    if (yearsInBusiness > 20) score += 10;
    else if (yearsInBusiness > 10) score += 7;
    else if (yearsInBusiness > 5) score += 5;
    else if (yearsInBusiness < 2) score -= 5;

    // 3. Ownership / Structure Bonus (Max 15 points)
    if (ownership === 'MNC / Listed') score += 15;
    else if (ownership === 'JV with MNC') score += 10;
    else if (ownership === 'Private Thai Co') score += 5;
    else if (ownership === 'Startup / SME') score -= 5;

    // 4. Industrial Estate Security (Max 15 points)
    if (estateType === 'Tier-1 Estate (Amata/WHA)') score += 15;
    else if (estateType === 'Tier-2 Estate') score += 10;
    else if (estateType === 'Industrial Zone') score += 5;
    else if (estateType === 'Standalone Site') score += 0;

    // 5. Financial Overlay (Max 10 points)
    if (financialsAvailable) score += 5;
    if (debtLevel === 'Low') score += 5;
    else if (debtLevel === 'High') score -= 15; // Penalty for over-leverage

    // 6. Payment History (Max 10 points)
    if (paymentHistory === 'Excellent') score += 10;
    else if (paymentHistory === 'Good') score += 5;
    else if (paymentHistory === 'Fair') score += 0;
    else if (paymentHistory === 'Poor') score -= 10;

    return Math.min(Math.max(score, 0), 100);
  }, [sector, industry, subIndustry, yearsInBusiness, financialsAvailable, debtLevel, estateType, ownership, paymentHistory]);

  // --- INVESTOR VERDICT LOGIC ---
  const getVerdict = (score: number) => {
    if (score >= 85) return { label: 'AAA / AA - PRIME', sub: 'Standard PPA. No Deposit Required.', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 };
    if (score >= 65) return { label: 'A / BBB - BANKABLE', sub: 'Require 3-month Security Deposit.', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: TrendingUp };
    if (score >= 45) return { label: 'BB - SPECULATIVE', sub: '6-month Deposit + Parent Co. Guarantee.', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertCircle };
    return { label: 'C - HIGH RISK', sub: 'Reject or 12-month Bank Guarantee Required.', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: TrendingDown };
  };

  const verdict = getVerdict(scrutinyScore);
  const VerdictIcon = verdict.icon;

  // Get taxonomy info for display
  const taxonomyMatch = THAI_SECTOR_TAXONOMY.find(t => t.subIndustry === subIndustry) ||
                        THAI_SECTOR_TAXONOMY.find(t => t.industry === industry) ||
                        THAI_SECTOR_TAXONOMY.find(t => t.sector === sector);

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-md">
      {/* Internal Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Credit Scrutiny Hub</span>
        </div>
        <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded text-[9px] text-red-200 font-bold border border-red-500/30">
          <Lock className="w-3 h-3" /> INTERNAL ONLY
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Sector Classification Display */}
        {taxonomyMatch && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Thai Sector Classification</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Sector</span>
                <span className="text-xs font-bold text-slate-800">{sector}</span>
              </div>
              {industry && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Industry</span>
                  <span className="text-xs font-bold text-slate-800">{industry}</span>
                </div>
              )}
              {subIndustry && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Sub-Industry</span>
                  <span className="text-xs font-bold text-slate-800">{subIndustry}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">Base Credit Score</span>
                <span className="text-xs font-black text-orange-600">{taxonomyMatch.score}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Priority Points</span>
                <span className="text-xs font-black text-blue-600">{taxonomyMatch.points}/5</span>
              </div>
            </div>
          </div>
        )}

        {/* THE VERDICT BOX */}
        <div className={`p-4 rounded-2xl border-2 ${verdict.bg} ${verdict.border} flex justify-between items-center transition-all`}>
          <div className="space-y-1">
            <p className={`text-[10px] font-bold uppercase opacity-70 ${verdict.color}`}>Investor Verdict</p>
            <div className="flex items-center gap-2">
              <VerdictIcon className={`w-5 h-5 ${verdict.color}`} />
              <p className={`text-lg font-black ${verdict.color}`}>{verdict.label}</p>
            </div>
            <p className={`text-[10px] font-bold ${verdict.color}`}>{verdict.sub}</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-black ${verdict.color}`}>{scrutinyScore}%</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase">Bankability</p>
          </div>
        </div>

        {/* INPUTS FOR UNDERWRITERS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Risk Assessment Inputs</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Years in Business */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Years Active
              </label>
              <input 
                type="number" 
                value={yearsInBusiness}
                onChange={(e) => setYearsInBusiness(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min={0}
                max={100}
              />
            </div>

            {/* Ownership Type */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Ownership
              </label>
              <select 
                value={ownership}
                onChange={(e) => setOwnership(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="MNC / Listed">MNC / Listed</option>
                <option value="JV with MNC">JV with MNC</option>
                <option value="Private Thai Co">Private Thai Co</option>
                <option value="Startup / SME">Startup / SME</option>
              </select>
            </div>

            {/* Industrial Estate */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Landmark className="w-3 h-3" /> Estate Type
              </label>
              <select 
                value={estateType}
                onChange={(e) => setEstateType(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="Tier-1 Estate (Amata/WHA)">Tier-1 Estate (Amata/WHA)</option>
                <option value="Tier-2 Estate">Tier-2 Estate</option>
                <option value="Industrial Zone">Industrial Zone</option>
                <option value="Standalone Site">Standalone Site</option>
              </select>
            </div>

            {/* Debt Level */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Debt Level
              </label>
              <select 
                value={debtLevel}
                onChange={(e) => setDebtLevel(e.target.value as 'Low' | 'Medium' | 'High')}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="Low">Low (D/E &lt; 1)</option>
                <option value="Medium">Medium (D/E 1-2)</option>
                <option value="High">High (D/E &gt; 2)</option>
              </select>
            </div>

            {/* Payment History */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <FileCheck className="w-3 h-3" /> Payment History
              </label>
              <select 
                value={paymentHistory}
                onChange={(e) => setPaymentHistory(e.target.value as 'Excellent' | 'Good' | 'Fair' | 'Poor')}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>

            {/* Financials Available Toggle */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Audited Financials</label>
              <button
                onClick={() => setFinancialsAvailable(!financialsAvailable)}
                className={`w-full px-3 py-2 text-sm font-bold rounded-xl border transition-all ${
                  financialsAvailable 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                {financialsAvailable ? 'Available ✓' : 'Not Available'}
              </button>
            </div>
          </div>
        </div>

        {/* SCORE BREAKDOWN */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Score Breakdown</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Sector Base Score</span>
              <span className="font-bold">{taxonomyMatch ? taxonomyMatch.points * 10 : 30} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Longevity Bonus</span>
              <span className="font-bold text-emerald-600">
                +{yearsInBusiness > 20 ? 10 : yearsInBusiness > 10 ? 7 : yearsInBusiness > 5 ? 5 : yearsInBusiness < 2 ? -5 : 0} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ownership Bonus</span>
              <span className="font-bold text-emerald-600">
                +{ownership === 'MNC / Listed' ? 15 : ownership === 'JV with MNC' ? 10 : ownership === 'Private Thai Co' ? 5 : -5} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estate Security</span>
              <span className="font-bold text-emerald-600">
                +{estateType === 'Tier-1 Estate (Amata/WHA)' ? 15 : estateType === 'Tier-2 Estate' ? 10 : estateType === 'Industrial Zone' ? 5 : 0} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Financial Overlay</span>
              <span className={`font-bold ${debtLevel === 'High' ? 'text-red-600' : 'text-emerald-600'}`}>
                {financialsAvailable ? '+5' : '0'}{debtLevel === 'Low' ? ' +5' : debtLevel === 'High' ? ' -15' : ''} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment History</span>
              <span className={`font-bold ${paymentHistory === 'Poor' ? 'text-red-600' : 'text-emerald-600'}`}>
                +{paymentHistory === 'Excellent' ? 10 : paymentHistory === 'Good' ? 5 : paymentHistory === 'Fair' ? 0 : -10} pts
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-300">
              <span className="font-bold text-slate-700">Total Bankability</span>
              <span className={`font-black ${verdict.color}`}>{scrutinyScore}%</span>
            </div>
          </div>
        </div>

        {/* UNDERWRITING GUIDANCE */}
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Underwriting Guidance</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                {scrutinyScore >= 85 && "This offtaker presents minimal credit risk. Standard PPA terms apply. Consider for priority pipeline."}
                {scrutinyScore >= 65 && scrutinyScore < 85 && "Acceptable credit profile. Recommend 3-month security deposit and standard payment terms (Net 30)."}
                {scrutinyScore >= 45 && scrutinyScore < 65 && "Elevated risk profile. Require 6-month deposit, parent company guarantee, and consider shorter PPA term."}
                {scrutinyScore < 45 && "High credit risk. Either decline or require 12-month bank guarantee, advance payments, and enhanced monitoring."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
