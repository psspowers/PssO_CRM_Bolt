import React, { useState, useMemo } from 'react';
import { ShieldAlert, Lock, Info, AlertTriangle, CheckCircle, TrendingUp, Building2, MapPin, DollarSign, Save, RefreshCw, Upload, FileSpreadsheet } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../contexts/AppContext';
import { Opportunity, CounterpartyRisk } from '../../types/crm';
import { FinancialDataImport } from './FinancialDataImport';

// --- SECTOR RISK NOTES FROM SPREADSHEET ---
const SECTOR_NOTES: Record<string, string> = {
  'Agriculture & Agribusiness': 'High risk NPL (~11.8%). Vulnerable to weather/commodities.',
  'Food & Beverage Manufacturing': 'Stable exports (~14%). Moderate NPL (~4.3%).',
  'Automotive': 'High daytime load. Risk: Structural shift to EV.',
  'ICT': 'Strategic growth sector. 24/7 load. High credit quality.',
  'Healthcare': 'Defensive sector. Essential service. 24/7 load.',
  'Real Estate': 'Cyclical. High leverage typical. Watch debt levels.',
  'Retail': 'Consumer discretionary. Margin pressure from e-commerce.',
  'Energy': 'Capital intensive. Long payback periods.',
  'Materials': 'Commodity exposure. Cyclical earnings.',
  'Industrials': 'Capex heavy. Export dependent.',
  'Consumer Products': 'Stable demand. Brand value matters.',
  'Transportation': 'Fuel cost exposure. Infrastructure dependent.',
  'Financial Services': 'Regulated. Interest rate sensitive.',
  'Public Sector': 'Sovereign risk. Budget dependent.',
  'Utilities': 'Regulated returns. Stable cash flows.',
  'Telecommunications': 'High capex. Technology obsolescence risk.',
  'Technology': 'High growth potential. Execution risk.',
  'Services': 'Labor intensive. Scalability challenges.'
};

// Corporate Type Scores
const CORP_TYPE_SCORES: Record<string, number> = {
  'Family Owned': 2,
  'Local Midcap': 3,
  'Local Bigcap': 4,
  'MNC': 4,
  'Big MNC': 5
};

// Sunset Risk Scores
const SUNSET_SCORES: Record<string, number> = {
  'Very High': 1,
  'High': 2,
  'Medium': 3,
  'Low': 4,
  'Core': 5
};

interface CounterpartyRiskHubProps {
  opportunity: Opportunity;
  onSave?: (riskProfile: CounterpartyRisk) => void;
}

export const CounterpartyRiskHub: React.FC<CounterpartyRiskHubProps> = ({ opportunity, onSave }) => {
  const { currentUser, updateOpportunity } = useAppContext();
  
  // Access control - internal only
  if (currentUser?.role === 'external') {
    return (
      <div className="p-10 text-center">
        <Lock className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-400">Access Denied: Internal Teams Only</p>
      </div>
    );
  }

  // Initialize from existing risk profile or defaults
  const existingProfile = opportunity.riskProfile;
  
  const [data, setData] = useState({
    // Pillar 1: WHO
    sector: opportunity.sector || 'Materials',
    corpType: existingProfile?.corporationType || 'Local Midcap',
    years: existingProfile?.yearsOfExistence || 10,
    sunset: existingProfile?.sunsetRisk || 'Medium',
    
    // Pillar 2: WHERE
    land: existingProfile?.landOwnership || 'Leased',
    leaseTerm: existingProfile?.landLeaseTerm || '16<yr<20',
    integrity: existingProfile?.industryIntegrity || 1000,
    
    // Pillar 3: HOW MUCH
    netWorth: existingProfile?.netWorth || 1200,
    revenue: existingProfile?.revenue || 900,
    de: existingProfile?.debtEquityRatio || 0.75,
    cagr: existingProfile?.revenueCAGR || 0.05,
    debtEbitda: existingProfile?.debtEbitdaRatio || 2.0,
    margin: existingProfile?.ebitdaMargin || 0.10,
    coverage: existingProfile?.interestCoverage === 'No Interest Expense' ? 99 : (existingProfile?.interestCoverage || 3),
    payable: existingProfile?.payableDays || 60,
    roce: existingProfile?.roce || 0.06,
    ratio: existingProfile?.currentRatio || 1.0,
    savings: existingProfile?.projectSavings || 0.06
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // --- CALCULATION ENGINE (From Excel Matrix) ---
  const results = useMemo(() => {
    // ========== PILLAR 1: WHO (Max Raw: 20, Weighted: 35%) ==========
    let whoRaw = 0;
    
    // Sector Score (0-5)
    const strategicSectors = ['ICT', 'Public Sector', 'Healthcare', 'Utilities', 'Financial Services'];
    if (strategicSectors.includes(data.sector)) whoRaw += 5;
    else if (['Food & Beverage Manufacturing', 'Consumer Products', 'Technology'].includes(data.sector)) whoRaw += 4;
    else whoRaw += 3;
    
    // Years of Existence (0-5)
    if (data.years >= 25) whoRaw += 5;
    else if (data.years >= 20) whoRaw += 4;
    else if (data.years >= 10) whoRaw += 3;
    else if (data.years >= 5) whoRaw += 2;
    else whoRaw += 1;
    
    // Corporate Type (0-5)
    whoRaw += CORP_TYPE_SCORES[data.corpType] || 3;
    
    // Sunset Risk (0-5)
    whoRaw += SUNSET_SCORES[data.sunset] || 3;
    
    const whoMax = 20;
    const whoWeighted = (whoRaw / whoMax) * 35;

    // ========== PILLAR 2: WHERE (Max Raw: 20, Weighted: 20%) ==========
    let whereRaw = 0;
    
    // Land Ownership (0-5)
    if (data.land === 'Owned') {
      whereRaw += 5;
    } else {
      // Leased - score based on term
      if (data.leaseTerm === 'more than 20yr') whereRaw += 4;
      else if (data.leaseTerm === '16<yr<20') whereRaw += 3;
      else if (data.leaseTerm === '10<yr<15') whereRaw += 2;
      else whereRaw += 1;
    }
    
    // Industry Integrity / Installed Capacity (0-10)
    if (data.integrity >= 2000) whereRaw += 10;
    else if (data.integrity >= 1500) whereRaw += 8;
    else if (data.integrity >= 1000) whereRaw += 6;
    else if (data.integrity >= 500) whereRaw += 4;
    else whereRaw += 2;
    
    // Location Premium (implicit in sector)
    whereRaw += 5; // Base location score
    
    const whereMax = 20;
    const whereWeighted = (whereRaw / whereMax) * 20;

    // ========== PILLAR 3: HOW MUCH (Max Raw: 56, Weighted: 45%) ==========
    let howMuchRaw = 0;
    
    // Net Worth (0-4)
    if (data.netWorth >= 2500) howMuchRaw += 4;
    else if (data.netWorth >= 1900) howMuchRaw += 3;
    else if (data.netWorth >= 1200) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // Revenue (0-5)
    if (data.revenue >= 2000) howMuchRaw += 5;
    else if (data.revenue >= 1200) howMuchRaw += 4;
    else if (data.revenue >= 600) howMuchRaw += 3;
    else howMuchRaw += 2;
    
    // Debt/Equity Ratio (0-8) - Lower is better
    if (data.de <= 0.3) howMuchRaw += 8;
    else if (data.de <= 0.5) howMuchRaw += 6;
    else if (data.de <= 1.0) howMuchRaw += 4;
    else if (data.de <= 1.5) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // Revenue CAGR (0-5)
    if (data.cagr >= 0.15) howMuchRaw += 5;
    else if (data.cagr >= 0.10) howMuchRaw += 4;
    else if (data.cagr >= 0.05) howMuchRaw += 3;
    else if (data.cagr >= 0) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // Debt/EBITDA (0-5) - Lower is better
    if (data.debtEbitda <= 1.5) howMuchRaw += 5;
    else if (data.debtEbitda <= 2.5) howMuchRaw += 4;
    else if (data.debtEbitda <= 3.5) howMuchRaw += 3;
    else if (data.debtEbitda <= 5.0) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // EBITDA Margin (0-5)
    if (data.margin >= 0.20) howMuchRaw += 5;
    else if (data.margin >= 0.15) howMuchRaw += 4;
    else if (data.margin >= 0.10) howMuchRaw += 3;
    else if (data.margin >= 0.05) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // Interest Coverage (0-5)
    if (data.coverage >= 10 || data.coverage === 99) howMuchRaw += 5;
    else if (data.coverage >= 5) howMuchRaw += 4;
    else if (data.coverage >= 3) howMuchRaw += 3;
    else if (data.coverage >= 2) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // Payable Days (0-4) - Lower is better
    if (data.payable <= 30) howMuchRaw += 4;
    else if (data.payable <= 60) howMuchRaw += 3;
    else if (data.payable <= 90) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // ROCE (0-5)
    if (data.roce >= 0.15) howMuchRaw += 5;
    else if (data.roce >= 0.10) howMuchRaw += 4;
    else if (data.roce >= 0.06) howMuchRaw += 3;
    else if (data.roce >= 0.03) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // Current Ratio (0-5)
    if (data.ratio >= 2.0) howMuchRaw += 5;
    else if (data.ratio >= 1.5) howMuchRaw += 4;
    else if (data.ratio >= 1.2) howMuchRaw += 3;
    else if (data.ratio >= 1.0) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    // Project Savings % (0-5)
    if (data.savings >= 0.15) howMuchRaw += 5;
    else if (data.savings >= 0.10) howMuchRaw += 4;
    else if (data.savings >= 0.06) howMuchRaw += 3;
    else if (data.savings >= 0.03) howMuchRaw += 2;
    else howMuchRaw += 1;
    
    const howMuchMax = 56;
    const howMuchWeighted = (howMuchRaw / howMuchMax) * 45;

    // ========== FINAL SCORE ==========
    const finalScore = whoWeighted + whereWeighted + howMuchWeighted;
    
    // Rating Assignment
    let rating = 'BB';
    let ratingColor = 'text-yellow-500';
    let ratingBg = 'bg-yellow-500/10';
    
    if (finalScore >= 90) { rating = 'AAA'; ratingColor = 'text-emerald-400'; ratingBg = 'bg-emerald-500/10'; }
    else if (finalScore >= 80) { rating = 'AA'; ratingColor = 'text-emerald-400'; ratingBg = 'bg-emerald-500/10'; }
    else if (finalScore >= 70) { rating = 'A'; ratingColor = 'text-blue-400'; ratingBg = 'bg-blue-500/10'; }
    else if (finalScore >= 60) { rating = 'BBB'; ratingColor = 'text-blue-400'; ratingBg = 'bg-blue-500/10'; }
    else if (finalScore >= 50) { rating = 'BB'; ratingColor = 'text-yellow-500'; ratingBg = 'bg-yellow-500/10'; }
    else { rating = 'B'; ratingColor = 'text-red-400'; ratingBg = 'bg-red-500/10'; }

    // Escalation Triggers
    const escalations: string[] = [];
    if (data.de > 1.5) escalations.push('High Leverage: D/E > 1.5x');
    if (data.debtEbitda > 4.0) escalations.push('Debt Stress: Debt/EBITDA > 4.0x');
    if (data.coverage < 2 && data.coverage !== 99) escalations.push('Interest Coverage < 2x');
    if (data.ratio < 1.0) escalations.push('Liquidity Risk: Current Ratio < 1.0');
    if (data.sunset === 'Very High' || data.sunset === 'High') escalations.push('Sunset Risk: Industry Decline');
    if (data.land === 'Leased' && (data.leaseTerm === 'less than 10 yr' || data.leaseTerm === '10<yr<15')) {
      escalations.push('Short Lease Term: < 15 years');
    }
    if (data.payable > 90) escalations.push('Payment Risk: Payable Days > 90');
    if (data.margin < 0.05) escalations.push('Margin Pressure: EBITDA Margin < 5%');

    // Radar Chart Data
    const radarData = [
      { metric: 'Corporate Profile', value: (whoRaw / whoMax) * 100, fullMark: 100 },
      { metric: 'Asset Security', value: (whereRaw / whereMax) * 100, fullMark: 100 },
      { metric: 'Financial Strength', value: (howMuchRaw / howMuchMax) * 100, fullMark: 100 },
      { metric: 'Leverage', value: Math.max(0, 100 - (data.de * 50)), fullMark: 100 },
      { metric: 'Liquidity', value: Math.min(100, data.ratio * 50), fullMark: 100 },
      { metric: 'Profitability', value: Math.min(100, data.margin * 500), fullMark: 100 },
    ];

    return {
      finalScore,
      rating,
      ratingColor,
      ratingBg,
      whoWeighted,
      whereWeighted,
      howMuchWeighted,
      whoRaw,
      whereRaw,
      howMuchRaw,
      escalations,
      radarData
    };
  }, [data]);

  // Handle input changes
  const handleChange = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Handle imported data from CSV/Excel
  const handleImportData = (importedData: Record<string, any>) => {
    setData(prev => ({
      ...prev,
      ...importedData
    }));
    setShowImportModal(false);
  };

  // Save risk profile
  const handleSave = async () => {
    setIsSaving(true);
    
    const riskProfile: CounterpartyRisk = {
      corporationType: data.corpType as CounterpartyRisk['corporationType'],
      yearsOfExistence: data.years,
      sunsetRisk: data.sunset as CounterpartyRisk['sunsetRisk'],
      landOwnership: data.land as CounterpartyRisk['landOwnership'],
      landLeaseTerm: data.leaseTerm as CounterpartyRisk['landLeaseTerm'],
      industryIntegrity: data.integrity,
      netWorth: data.netWorth,
      revenue: data.revenue,
      debtEquityRatio: data.de,
      revenueCAGR: data.cagr,
      debtEbitdaRatio: data.debtEbitda,
      ebitdaMargin: data.margin,
      interestCoverage: data.coverage === 99 ? 'No Interest Expense' : data.coverage,
      payableDays: data.payable,
      roce: data.roce,
      currentRatio: data.ratio,
      projectSavings: data.savings,
      finalScore: results.finalScore,
      rating: results.rating,
      whoScore: results.whoWeighted,
      whereScore: results.whereWeighted,
      howMuchScore: results.howMuchWeighted
    };

    try {
      await updateOpportunity(opportunity.id, { riskProfile });
      if (onSave) onSave(riskProfile);
    } catch (error) {
      console.error('Failed to save risk profile:', error);
    }
    
    setIsSaving(false);
  };

  return (
    <>
      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Counterparty Risk Assessment</h2>
                <p className="text-sm text-slate-400">Credit Committee Matrix • 3-Pillar Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Import Data
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Assessment
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Score Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Final Score Card */}
            <div className={`${results.ratingBg} rounded-xl p-6 border border-slate-700`}>
              <div className="text-center">
                <div className={`text-5xl font-bold ${results.ratingColor}`}>{results.rating}</div>
                <div className="text-2xl font-semibold text-white mt-2">{results.finalScore.toFixed(1)}%</div>
                <div className="text-sm text-slate-400 mt-1">Final Credit Score</div>
              </div>
            </div>

            {/* Pillar Scores */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">WHO (35%)</span>
              </div>
              <div className="text-2xl font-bold text-white">{results.whoWeighted.toFixed(1)}</div>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all" 
                  style={{ width: `${(results.whoWeighted / 35) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-slate-300">WHERE (20%)</span>
              </div>
              <div className="text-2xl font-bold text-white">{results.whereWeighted.toFixed(1)}</div>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all" 
                  style={{ width: `${(results.whereWeighted / 20) * 100}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium text-slate-300">HOW MUCH (45%)</span>
              </div>
              <div className="text-2xl font-bold text-white">{results.howMuchWeighted.toFixed(1)}</div>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all" 
                  style={{ width: `${(results.howMuchWeighted / 45) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Escalation Alerts */}
          {results.escalations.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="font-semibold text-red-400">Escalation Triggers ({results.escalations.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.escalations.map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-red-300">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sector Note */}
          {SECTOR_NOTES[data.sector] && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <span className="font-medium text-blue-400">Sector Intelligence: </span>
                  <span className="text-blue-200">{SECTOR_NOTES[data.sector]}</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input Form */}
            <div className="space-y-6">
              {/* Pillar 1: WHO */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Pillar 1: WHO (Counterparty Profile)</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Corporate Type</label>
                    <select
                      value={data.corpType}
                      onChange={(e) => handleChange('corpType', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="Family Owned">Family Owned</option>
                      <option value="Local Midcap">Local Midcap</option>
                      <option value="Local Bigcap">Local Bigcap</option>
                      <option value="MNC">MNC</option>
                      <option value="Big MNC">Big MNC</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Years in Business</label>
                    <input
                      type="number"
                      value={data.years}
                      onChange={(e) => handleChange('years', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Sunset Risk (Industry Outlook)</label>
                    <select
                      value={data.sunset}
                      onChange={(e) => handleChange('sunset', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="Core">Core (Essential Industry)</option>
                      <option value="Low">Low (Stable Growth)</option>
                      <option value="Medium">Medium (Moderate Risk)</option>
                      <option value="High">High (Declining)</option>
                      <option value="Very High">Very High (Sunset Industry)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pillar 2: WHERE */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">Pillar 2: WHERE (Asset Security)</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Land Ownership</label>
                    <select
                      value={data.land}
                      onChange={(e) => handleChange('land', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="Owned">Owned</option>
                      <option value="Leased">Leased</option>
                    </select>
                  </div>
                  
                  {data.land === 'Leased' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Lease Term</label>
                      <select
                        value={data.leaseTerm}
                        onChange={(e) => handleChange('leaseTerm', e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        <option value="less than 10 yr">Less than 10 years</option>
                        <option value="10<yr<15">10-15 years</option>
                        <option value="16<yr<20">16-20 years</option>
                        <option value="more than 20yr">More than 20 years</option>
                      </select>
                    </div>
                  )}
                  
                  <div className={data.land === 'Owned' ? 'col-span-2' : ''}>
                    <label className="block text-xs text-slate-400 mb-1">Industry Integrity (MW Installed)</label>
                    <input
                      type="number"
                      value={data.integrity}
                      onChange={(e) => handleChange('integrity', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="e.g., 1000"
                    />
                  </div>
                </div>
              </div>

              {/* Pillar 3: HOW MUCH */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-white">Pillar 3: HOW MUCH (Financial Metrics)</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Net Worth (M THB)</label>
                    <input
                      type="number"
                      value={data.netWorth}
                      onChange={(e) => handleChange('netWorth', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Revenue (M THB)</label>
                    <input
                      type="number"
                      value={data.revenue}
                      onChange={(e) => handleChange('revenue', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">D/E Ratio</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.de}
                      onChange={(e) => handleChange('de', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Revenue CAGR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.cagr}
                      onChange={(e) => handleChange('cagr', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="0.05 = 5%"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Debt/EBITDA</label>
                    <input
                      type="number"
                      step="0.1"
                      value={data.debtEbitda}
                      onChange={(e) => handleChange('debtEbitda', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">EBITDA Margin</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.margin}
                      onChange={(e) => handleChange('margin', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="0.10 = 10%"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Interest Coverage</label>
                    <input
                      type="number"
                      step="0.1"
                      value={data.coverage === 99 ? '' : data.coverage}
                      onChange={(e) => handleChange('coverage', e.target.value === '' ? 99 : parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="Leave empty if no debt"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Payable Days</label>
                    <input
                      type="number"
                      value={data.payable}
                      onChange={(e) => handleChange('payable', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">ROCE</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.roce}
                      onChange={(e) => handleChange('roce', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="0.06 = 6%"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Current Ratio</label>
                    <input
                      type="number"
                      step="0.1"
                      value={data.ratio}
                      onChange={(e) => handleChange('ratio', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Project Savings %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.savings}
                      onChange={(e) => handleChange('savings', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                      placeholder="0.06 = 6%"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Radar Chart & Analysis */}
            <div className="space-y-6">
              {/* Radar Chart */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <h3 className="font-semibold text-white mb-4">Risk Profile Spider Chart</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={results.radarData}>
                      <PolarGrid stroke="#475569" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Credit Guidance */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <h3 className="font-semibold text-white mb-4">Credit Committee Guidance</h3>
                
                <div className="space-y-3">
                  {results.finalScore >= 80 && (
                    <div className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-emerald-400">Prime Credit Quality</div>
                        <div className="text-sm text-slate-400">
                          Recommend standard terms. Eligible for extended payment periods and higher exposure limits.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {results.finalScore >= 60 && results.finalScore < 80 && (
                    <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-400">Investment Grade</div>
                        <div className="text-sm text-slate-400">
                          Acceptable risk profile. Standard credit terms apply. Monitor financial covenants quarterly.
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {results.finalScore >= 50 && results.finalScore < 60 && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-yellow-400">Speculative Grade</div>
                        <div className="text-sm text-slate-400">
                          Elevated risk. Require additional security (bank guarantee, parent guarantee, or advance payment).
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {results.finalScore < 50 && (
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg">
                      <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <div className="font-medium text-red-400">High Risk</div>
                        <div className="text-sm text-slate-400">
                          Requires Credit Committee approval. Consider cash-in-advance terms or decline engagement.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Score Breakdown */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-sm font-medium text-slate-300 mb-3">Score Breakdown</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">WHO (Corporate Profile)</span>
                        <span className="text-white">{results.whoWeighted.toFixed(1)} / 35</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">WHERE (Asset Security)</span>
                        <span className="text-white">{results.whereWeighted.toFixed(1)} / 20</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">HOW MUCH (Financials)</span>
                        <span className="text-white">{results.howMuchWeighted.toFixed(1)} / 45</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700 font-semibold">
                        <span className="text-slate-300">Total Score</span>
                        <span className={results.ratingColor}>{results.finalScore.toFixed(1)} / 100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <FinancialDataImport
          onImport={handleImportData}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </>
  );
};

export default CounterpartyRiskHub;
