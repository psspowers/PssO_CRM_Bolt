import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Progress } from '../ui/progress';

interface LoadAnalyzerProps {
  initialDays?: string[];
  initialDaytimeLoad?: number;
  onUpdate?: (data: any) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const LoadAnalyzer: React.FC<LoadAnalyzerProps> = ({ initialDays = DAYS.slice(0,5), initialDaytimeLoad = 100, onUpdate }) => {
  const [selectedDays, setSelectedDays] = useState<string[]>(initialDays);
  const [daytimeLoad, setDaytimeLoad] = useState(initialDaytimeLoad);

  // LOGIC: PPA Investor Math
  // 1. Total Weekly Solar Opportunity = 7 days * 4.5 hours = 31.5 units
  // 2. Used Units = Operating Days * 4.5 hours
  // 3. Curtailment = (Total Opportunity - Used Units) / Total Opportunity
  
  const totalSolarWindow = 7 * 4.5;
  const utilizedWindow = selectedDays.length * 4.5;
  const curtailmentPercent = ((totalSolarWindow - utilizedWindow) / totalSolarWindow) * 100;
  const bankabilityScore = 100 - curtailmentPercent;

  const getGrade = (score: number) => {
    if (score > 90) return { label: 'A - High Yield', color: 'text-green-600', bg: 'bg-green-50' };
    if (score > 70) return { label: 'B - Medium Yield', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'C - High Risk', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const grade = getGrade(bankabilityScore);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="bg-white border rounded-2xl p-5 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500 fill-current" />
          <h3 className="font-bold text-gray-900">Load & Curtailment Analysis</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${grade.bg} ${grade.color}`}>
          {grade.label}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Operating Days</label>
        <div className="flex justify-between gap-1">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedDays.includes(day) 
                ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              {day[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Utilized Gen</p>
          <p className="text-xl font-black text-gray-900">{bankabilityScore.toFixed(0)}%</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Curtailment</p>
          <p className="text-xl font-black text-red-500">{curtailmentPercent.toFixed(0)}%</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-xs font-bold text-gray-600">Bankability Score</span>
          <span className="text-xs font-bold text-gray-400">{bankabilityScore.toFixed(0)}/100</span>
        </div>
        <Progress value={bankabilityScore} className="h-2" />
      </div>

      {curtailmentPercent > 10 && (
        <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 leading-tight">
            <b>Warning:</b> Investor yield is reduced because the facility is closed on weekends. Consider a smaller system or adding BESS to capture the extra <b>{curtailmentPercent.toFixed(0)}%</b> production.
          </p>
        </div>
      )}
    </div>
  );
};
