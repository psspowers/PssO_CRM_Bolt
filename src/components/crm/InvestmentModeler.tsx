import React, { useState, useMemo } from 'react';
import { TrendingUp, Calculator, ArrowRightLeft, ShieldCheck, Zap, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

const DAYS = ["5 Days", "6 Days", "7 Days"];

interface InvestmentModelerProps {
  initialCapacity?: number;
  initialPpaTerm?: number;
  onModelUpdate?: (data: ModelOutput) => void;
}

interface ModelOutput {
  total30YrSavings: number;
  ppaPhaseTotal: number;
  postHandoverTotal: number;
  avgAnnualSavings: number;
  breakEvenYear: number | null;
}

interface YearData {
  year: string;
  yearNum: number;
  annualSavings: number;
  cumulative: number;
  phase: string;
  peakGen: number;
  offPeakGen: number;
}

export const InvestmentModeler: React.FC<InvestmentModelerProps> = ({ 
  initialCapacity = 11300, 
  initialPpaTerm = 15,
  onModelUpdate 
}) => {
  // --- INPUT STATES ---
  const [capacity, setCapacity] = useState(initialCapacity); // kWp
  const [ppaTerm, setPpaTerm] = useState(initialPpaTerm); // Years
  const [omBase, setOmBase] = useState(300000); // THB per year
  const [operatingDays, setOperatingDays] = useState("5 Days");
  
  // Grid Rates
  const [peakRate, setPeakRate] = useState(4.18);
  const [offPeakRate, setOffPeakRate] = useState(2.60);
  const [discount, setDiscount] = useState(18); // 18%

  // CUF States
  const [cufPeak, setCufPeak] = useState(99);
  const [cufOffPeak, setCufOffPeak] = useState(15);

  // UI States
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- HELPER: PROPOSE CUF LOGIC ---
  const proposeCUF = () => {
    if (operatingDays === "7 Days") { setCufPeak(99); setCufOffPeak(95); }
    else if (operatingDays === "6 Days") { setCufPeak(99); setCufOffPeak(45); }
    else { setCufPeak(99); setCufOffPeak(15); }
  };

  // --- THE CALCULATION ENGINE ---
  const modelData = useMemo(() => {
    let data: YearData[] = [];
    let cumulativeSavings = 0;
    let yearlyGen = capacity * 1592; // Baseline generation (kWh per kWp)
    let currentPeakTariff = peakRate;
    let currentOffPeakTariff = offPeakRate;
    let currentOM = omBase;

    for (let year = 1; year <= 30; year++) {
      // 1. Degradation
      if (year === 1) yearlyGen *= 0.975; // 2.5% Yr 1
      else yearlyGen *= 0.995; // 0.5% thereafter

      // 2. Generation Split (Spreadsheet logic)
      const peakGen = yearlyGen * 0.67 * (cufPeak / 100);
      const offPeakGen = yearlyGen * 0.33 * (cufOffPeak / 100);

      // 3. Tariff Escalation (1% per yr)
      if (year > 1) {
        currentPeakTariff *= 1.01;
        currentOffPeakTariff *= 1.01;
        currentOM *= 1.03; // O&M Escalation 3%
      }

      // 4. Financials (PPA vs Handover)
      let savings = 0;
      const isUnderPPA = year <= ppaTerm;

      if (isUnderPPA) {
        // Savings = The discount applied to utilized energy
        const peaCost = (peakGen * currentPeakTariff) + (offPeakGen * currentOffPeakTariff);
        savings = peaCost * (discount / 100);
      } else {
        // Savings = Full Value of energy - O&M - Major Maintenance
        const peaCost = (peakGen * currentPeakTariff) + (offPeakGen * currentOffPeakTariff);
        let maintenance = 0;
        if (year % 10 === 0) maintenance = 33900000; // Major overhaul every 10 years
        savings = peaCost - currentOM - maintenance;
      }

      cumulativeSavings += savings;

      data.push({
        year: `Yr ${year}`,
        yearNum: year,
        annualSavings: Math.round(savings),
        cumulative: Math.round(cumulativeSavings),
        phase: isUnderPPA ? 'PPA Phase' : 'Client Owned',
        peakGen: Math.round(peakGen),
        offPeakGen: Math.round(offPeakGen)
      });
    }
    return data;
  }, [capacity, ppaTerm, omBase, cufPeak, cufOffPeak, peakRate, offPeakRate, discount]);

  // --- SUMMARY CALCULATIONS ---
  const summaryStats = useMemo(() => {
    const total30YrSavings = modelData[29]?.cumulative || 0;
    const ppaPhaseTotal = modelData
      .filter(d => d.phase === 'PPA Phase')
      .reduce((sum, d) => sum + d.annualSavings, 0);
    const postHandoverTotal = modelData
      .filter(d => d.phase === 'Client Owned')
      .reduce((sum, d) => sum + d.annualSavings, 0);
    const avgAnnualSavings = total30YrSavings / 30;
    
    // Find break-even year (where cumulative becomes positive after any dips)
    let breakEvenYear: number | null = null;
    for (let i = 0; i < modelData.length; i++) {
      if (modelData[i].cumulative > 0 && breakEvenYear === null) {
        breakEvenYear = i + 1;
      }
    }

    return {
      total30YrSavings,
      ppaPhaseTotal,
      postHandoverTotal,
      avgAnnualSavings,
      breakEvenYear
    };
  }, [modelData]);

  // Format currency (THB)
  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) {
      return `฿${(val / 1000000).toFixed(2)}M`;
    }
    return `฿${(val / 1000).toFixed(0)}K`;
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
          <p className="font-bold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 mb-2">{data.phase}</p>
          <div className="space-y-1 text-sm">
            <p className="text-emerald-600">Annual: {formatCurrency(data.annualSavings)}</p>
            <p className="text-blue-600">Cumulative: {formatCurrency(data.cumulative)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-50 rounded-3xl p-6 border shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-orange-500 rounded-lg text-white">
          <Calculator className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">30-Year PPA Modeler</h2>
          <p className="text-sm text-slate-500 font-medium">Investor Build-Own-Transfer Model</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700">Investment Grade</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
          <p className="text-[10px] font-bold uppercase opacity-80">30-Year Total</p>
          <p className="text-2xl font-bold">{formatCurrency(summaryStats.total30YrSavings)}</p>
          <p className="text-[10px] opacity-70">Lifetime Savings</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <p className="text-[10px] font-bold uppercase opacity-80">PPA Phase</p>
          <p className="text-2xl font-bold">{formatCurrency(summaryStats.ppaPhaseTotal)}</p>
          <p className="text-[10px] opacity-70">Years 1-{ppaTerm}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
          <p className="text-[10px] font-bold uppercase opacity-80">Post-Handover</p>
          <p className="text-2xl font-bold">{formatCurrency(summaryStats.postHandoverTotal)}</p>
          <p className="text-[10px] opacity-70">Years {ppaTerm + 1}-30</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <p className="text-[10px] font-bold uppercase opacity-80">Avg Annual</p>
          <p className="text-2xl font-bold">{formatCurrency(summaryStats.avgAnnualSavings)}</p>
          <p className="text-[10px] opacity-70">Per Year</p>
        </div>
      </div>

      {/* PRIMARY INPUT GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Capacity (kWp)</label>
          <input 
            type="number" 
            value={capacity} 
            onChange={e => setCapacity(Number(e.target.value))} 
            className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">PPA Term (Years)</label>
          <input 
            type="number" 
            value={ppaTerm} 
            onChange={e => setPpaTerm(Number(e.target.value))} 
            min={1}
            max={25}
            className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">O&M Base (THB/yr)</label>
          <input 
            type="number" 
            value={omBase} 
            onChange={e => setOmBase(Number(e.target.value))} 
            className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Discount Rate (%)</label>
          <input 
            type="number" 
            value={discount} 
            onChange={e => setDiscount(Number(e.target.value))} 
            min={0}
            max={50}
            className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
          />
        </div>
      </div>

      {/* Operating Days Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase">Operating Schedule</label>
        <div className="flex gap-2">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => { setOperatingDays(day); }}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
                operatingDays === day 
                  ? 'bg-orange-500 text-white shadow-lg' 
                  : 'bg-white border text-slate-600 hover:bg-slate-50'
              }`}
            >
              {day}
            </button>
          ))}
          <button
            onClick={proposeCUF}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Auto CUF
          </button>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full flex items-center justify-between p-3 bg-white border rounded-xl hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-700">Advanced Parameters</span>
        {showAdvanced ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div className="bg-white border rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Peak Rate (THB/kWh)</label>
              <input 
                type="number" 
                value={peakRate} 
                onChange={e => setPeakRate(Number(e.target.value))} 
                step={0.01}
                className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Off-Peak Rate (THB/kWh)</label>
              <input 
                type="number" 
                value={offPeakRate} 
                onChange={e => setOffPeakRate(Number(e.target.value))} 
                step={0.01}
                className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Peak CUF (%)</label>
              <input 
                type="number" 
                value={cufPeak} 
                onChange={e => setCufPeak(Number(e.target.value))} 
                min={0}
                max={100}
                className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Off-Peak CUF (%)</label>
              <input 
                type="number" 
                value={cufOffPeak} 
                onChange={e => setCufOffPeak(Number(e.target.value))} 
                min={0}
                max={100}
                className="w-full p-2 border rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
          </div>
          
          {/* Info Box */}
          <div className="flex gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 leading-tight">
              <b>CUF (Capacity Utilization Factor):</b> Represents the percentage of generated energy actually consumed by the client. 
              Peak hours typically have higher utilization. Click "Auto CUF" to set recommended values based on operating schedule.
            </p>
          </div>
        </div>
      )}

      {/* CHART */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase">30-Year Savings Projection</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-slate-600">PPA Phase</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span className="text-slate-600">Client Owned</span>
            </div>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={modelData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={4}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val) => formatCurrency(val)}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                x={`Yr ${ppaTerm}`} 
                stroke="#f97316" 
                strokeDasharray="5 5" 
                label={{ value: 'Handover', position: 'top', fontSize: 10, fill: '#f97316' }}
              />
              <Area 
                type="monotone" 
                dataKey="annualSavings" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorSavings)" 
                name="Annual Savings"
              />
              <Area 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#8b5cf6" 
                fillOpacity={0.3} 
                fill="url(#colorCumulative)" 
                name="Cumulative"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phase Transition Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-emerald-800">Phase 1: PPA Term</h4>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed">
            During years 1-{ppaTerm}, the investor owns and operates the system. 
            Client pays a discounted rate ({discount}% below grid tariff) for consumed energy.
            Savings represent the discount on energy costs.
          </p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h4 className="font-bold text-purple-800">Phase 2: Post-Handover</h4>
          </div>
          <p className="text-xs text-purple-700 leading-relaxed">
            After year {ppaTerm}, ownership transfers to the client. 
            Savings = Full energy value minus O&M costs and periodic major maintenance.
            Significantly higher annual savings in this phase.
          </p>
        </div>
      </div>

      {/* Model Assumptions Footer */}
      <div className="text-[10px] text-slate-400 space-y-1 border-t pt-4">
        <p><b>Model Assumptions:</b></p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Year 1 degradation: 2.5%, thereafter: 0.5% annually</li>
          <li>Tariff escalation: 1% per year</li>
          <li>O&M escalation: 3% per year</li>
          <li>Major maintenance: ฿33.9M every 10 years (post-handover)</li>
          <li>Generation baseline: 1,592 kWh/kWp/year</li>
          <li>Peak/Off-Peak split: 67%/33%</li>
        </ul>
      </div>
    </div>
  );
};
