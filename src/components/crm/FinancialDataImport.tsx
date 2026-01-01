import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, X, Check, AlertTriangle, ArrowRight, 
  ChevronLeft, ChevronRight, RefreshCw, Download, Info, Trash2,
  FileText, Table, CheckCircle, XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Field definitions for mapping
const COUNTERPARTY_FIELDS = [
  // Pillar 1: WHO
  { key: 'corporationType', label: 'Corporate Type', pillar: 'WHO', type: 'select', options: ['Family Owned', 'Local Midcap', 'Local Bigcap', 'MNC', 'Big MNC'] },
  { key: 'yearsOfExistence', label: 'Years in Business', pillar: 'WHO', type: 'number' },
  { key: 'sunsetRisk', label: 'Sunset Risk', pillar: 'WHO', type: 'select', options: ['Very High', 'High', 'Medium', 'Low', 'Core'] },
  
  // Pillar 2: WHERE
  { key: 'landOwnership', label: 'Land Ownership', pillar: 'WHERE', type: 'select', options: ['Leased', 'Owned'] },
  { key: 'landLeaseTerm', label: 'Lease Term', pillar: 'WHERE', type: 'select', options: ['less than 10 yr', '10<yr<15', '16<yr<20', 'more than 20yr'] },
  { key: 'industryIntegrity', label: 'Industry Integrity (MW)', pillar: 'WHERE', type: 'number' },
  
  // Pillar 3: HOW MUCH
  { key: 'netWorth', label: 'Net Worth (M THB)', pillar: 'HOW MUCH', type: 'currency' },
  { key: 'revenue', label: 'Revenue (M THB)', pillar: 'HOW MUCH', type: 'currency' },
  { key: 'debtEquityRatio', label: 'D/E Ratio', pillar: 'HOW MUCH', type: 'ratio' },
  { key: 'revenueCAGR', label: 'Revenue CAGR', pillar: 'HOW MUCH', type: 'percentage' },
  { key: 'debtEbitdaRatio', label: 'Debt/EBITDA', pillar: 'HOW MUCH', type: 'ratio' },
  { key: 'ebitdaMargin', label: 'EBITDA Margin', pillar: 'HOW MUCH', type: 'percentage' },
  { key: 'interestCoverage', label: 'Interest Coverage', pillar: 'HOW MUCH', type: 'number' },
  { key: 'payableDays', label: 'Payable Days', pillar: 'HOW MUCH', type: 'number' },
  { key: 'roce', label: 'ROCE', pillar: 'HOW MUCH', type: 'percentage' },
  { key: 'currentRatio', label: 'Current Ratio', pillar: 'HOW MUCH', type: 'ratio' },
  { key: 'projectSavings', label: 'Project Savings %', pillar: 'HOW MUCH', type: 'percentage' },
];

// Common column name aliases for auto-mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  corporationType: ['corporate type', 'corp type', 'company type', 'entity type', 'organization type'],
  yearsOfExistence: ['years', 'years in business', 'age', 'company age', 'years of operation', 'established'],
  sunsetRisk: ['sunset risk', 'industry risk', 'sunset', 'industry outlook'],
  landOwnership: ['land ownership', 'land', 'property ownership', 'land status'],
  landLeaseTerm: ['lease term', 'lease years', 'lease duration', 'land lease'],
  industryIntegrity: ['industry integrity', 'installed capacity', 'mw installed', 'capacity mw'],
  netWorth: ['net worth', 'networth', 'equity', 'shareholders equity', 'total equity', 'ส่วนของผู้ถือหุ้น'],
  revenue: ['revenue', 'sales', 'total revenue', 'annual revenue', 'รายได้', 'ยอดขาย'],
  debtEquityRatio: ['d/e ratio', 'de ratio', 'debt equity', 'debt/equity', 'leverage ratio', 'อัตราส่วนหนี้สินต่อทุน'],
  revenueCAGR: ['cagr', 'revenue cagr', 'growth rate', 'revenue growth', 'อัตราการเติบโต'],
  debtEbitdaRatio: ['debt/ebitda', 'debt ebitda', 'net debt/ebitda', 'leverage'],
  ebitdaMargin: ['ebitda margin', 'ebitda %', 'operating margin', 'margin', 'อัตรากำไร'],
  interestCoverage: ['interest coverage', 'icr', 'interest cover', 'times interest earned'],
  payableDays: ['payable days', 'dpo', 'days payable', 'payment days', 'ap days'],
  roce: ['roce', 'return on capital', 'roic', 'return on invested capital'],
  currentRatio: ['current ratio', 'liquidity ratio', 'working capital ratio', 'อัตราส่วนสภาพคล่อง'],
  projectSavings: ['project savings', 'savings', 'cost savings', 'savings %'],
};

interface ParsedRow {
  [key: string]: string | number;
}

interface ValidationResult {
  isValid: boolean;
  value: number | string;
  error?: string;
}

interface FinancialDataImportProps {
  onImport: (data: Record<string, any>) => void;
  onClose: () => void;
}

export const FinancialDataImport: React.FC<FinancialDataImportProps> = ({ onImport, onClose }) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Thai Baht currency format
  const parseThaiCurrency = (value: string | number): ValidationResult => {
    if (typeof value === 'number') return { isValid: true, value };
    
    let cleanValue = String(value).trim();
    
    // Remove Thai Baht symbol and common formats
    cleanValue = cleanValue
      .replace(/฿/g, '')
      .replace(/THB/gi, '')
      .replace(/บาท/g, '')
      .replace(/ล้าน/g, '') // Million in Thai
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .trim();
    
    // Handle million/billion suffixes
    let multiplier = 1;
    if (/M$/i.test(cleanValue)) {
      multiplier = 1;
      cleanValue = cleanValue.replace(/M$/i, '');
    } else if (/B$/i.test(cleanValue)) {
      multiplier = 1000;
      cleanValue = cleanValue.replace(/B$/i, '');
    }
    
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      return { isValid: false, value: 0, error: 'Invalid currency format. Expected: 1,200 or ฿1,200 or 1200 THB' };
    }
    
    return { isValid: true, value: num * multiplier };
  };

  // Parse percentage format
  const parsePercentage = (value: string | number): ValidationResult => {
    if (typeof value === 'number') {
      // If already a decimal (0.1) or percentage (10)
      return { isValid: true, value: value > 1 ? value / 100 : value };
    }
    
    let cleanValue = String(value).trim();
    
    // Check if it's a percentage format (e.g., "10%", "10 %")
    const isPercentageFormat = cleanValue.includes('%');
    cleanValue = cleanValue.replace(/%/g, '').replace(/\s/g, '').trim();
    
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      return { isValid: false, value: 0, error: 'Invalid percentage. Expected: 10% or 0.10' };
    }
    
    // Convert to decimal if it was in percentage format or > 1
    const finalValue = isPercentageFormat || num > 1 ? num / 100 : num;
    return { isValid: true, value: finalValue };
  };

  // Parse ratio format
  const parseRatio = (value: string | number): ValidationResult => {
    if (typeof value === 'number') return { isValid: true, value };
    
    let cleanValue = String(value).trim();
    
    // Handle "X:1" format (e.g., "0.75:1")
    if (cleanValue.includes(':')) {
      const parts = cleanValue.split(':');
      const num = parseFloat(parts[0]);
      if (isNaN(num)) {
        return { isValid: false, value: 0, error: 'Invalid ratio format. Expected: 0.75 or 0.75:1' };
      }
      return { isValid: true, value: num };
    }
    
    // Handle "Xx" format (e.g., "2.5x")
    cleanValue = cleanValue.replace(/x$/i, '').trim();
    
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      return { isValid: false, value: 0, error: 'Invalid ratio format. Expected: 0.75 or 2.5x' };
    }
    
    return { isValid: true, value: num };
  };

  // Parse number
  const parseNumber = (value: string | number): ValidationResult => {
    if (typeof value === 'number') return { isValid: true, value };
    
    const cleanValue = String(value).replace(/,/g, '').trim();
    const num = parseFloat(cleanValue);
    
    if (isNaN(num)) {
      return { isValid: false, value: 0, error: 'Invalid number format' };
    }
    
    return { isValid: true, value: num };
  };

  // Auto-map columns based on header names
  const autoMapColumns = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [fieldKey, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some(alias => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
          mapping[fieldKey] = header;
          break;
        }
      }
    });
    
    return mapping;
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setIsProcessing(true);
    setFile(uploadedFile);
    
    try {
      const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();
      let data: ParsedRow[] = [];
      let headers: string[] = [];
      
      if (fileExtension === 'csv') {
        // Parse CSV
        const text = await uploadedFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length > 0) {
          headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: ParsedRow = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            data.push(row);
          }
        }
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(firstSheet, { header: 1 });
        
        if (jsonData.length > 0) {
          headers = (jsonData[0] as any[]).map(h => String(h || '').trim());
          
          for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i] as any[];
            if (!rowData || rowData.every(cell => !cell)) continue;
            
            const row: ParsedRow = {};
            headers.forEach((header, idx) => {
              row[header] = rowData[idx] !== undefined ? rowData[idx] : '';
            });
            data.push(row);
          }
        }
      }
      
      setHeaders(headers);
      setParsedData(data);
      setColumnMapping(autoMapColumns(headers));
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please ensure it is a valid CSV or Excel file.');
    }
    
    setIsProcessing(false);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  }, [handleFileUpload]);

  // Validate and transform data
  const validateAndTransform = useCallback(() => {
    if (parsedData.length === 0) return null;
    
    const row = parsedData[selectedRow];
    const errors: Record<string, string> = {};
    const transformedData: Record<string, any> = {};
    
    COUNTERPARTY_FIELDS.forEach(field => {
      const sourceColumn = columnMapping[field.key];
      if (!sourceColumn || !row[sourceColumn]) return;
      
      const rawValue = row[sourceColumn];
      let result: ValidationResult;
      
      switch (field.type) {
        case 'currency':
          result = parseThaiCurrency(rawValue);
          break;
        case 'percentage':
          result = parsePercentage(rawValue);
          break;
        case 'ratio':
          result = parseRatio(rawValue);
          break;
        case 'number':
          result = parseNumber(rawValue);
          break;
        case 'select':
          // For select fields, try to match the value
          const normalizedValue = String(rawValue).trim();
          const matchedOption = field.options?.find(
            opt => opt.toLowerCase() === normalizedValue.toLowerCase()
          );
          result = matchedOption 
            ? { isValid: true, value: matchedOption }
            : { isValid: false, value: rawValue, error: `Invalid option. Expected: ${field.options?.join(', ')}` };
          break;
        default:
          result = { isValid: true, value: rawValue };
      }
      
      if (!result.isValid && result.error) {
        errors[field.key] = result.error;
      }
      transformedData[field.key] = result.value;
    });
    
    setValidationErrors(errors);
    return transformedData;
  }, [parsedData, selectedRow, columnMapping]);

  // Handle import
  const handleImport = () => {
    const transformedData = validateAndTransform();
    if (!transformedData) return;
    
    if (Object.keys(validationErrors).length > 0) {
      if (!confirm('There are validation warnings. Do you want to proceed anyway?')) {
        return;
      }
    }
    
    // Map to the expected format for CounterpartyRiskHub
    const importData = {
      corpType: transformedData.corporationType || undefined,
      years: transformedData.yearsOfExistence || undefined,
      sunset: transformedData.sunsetRisk || undefined,
      land: transformedData.landOwnership || undefined,
      leaseTerm: transformedData.landLeaseTerm || undefined,
      integrity: transformedData.industryIntegrity || undefined,
      netWorth: transformedData.netWorth || undefined,
      revenue: transformedData.revenue || undefined,
      de: transformedData.debtEquityRatio || undefined,
      cagr: transformedData.revenueCAGR || undefined,
      debtEbitda: transformedData.debtEbitdaRatio || undefined,
      margin: transformedData.ebitdaMargin || undefined,
      coverage: transformedData.interestCoverage || undefined,
      payable: transformedData.payableDays || undefined,
      roce: transformedData.roce || undefined,
      ratio: transformedData.currentRatio || undefined,
      savings: transformedData.projectSavings || undefined,
    };
    
    // Remove undefined values
    Object.keys(importData).forEach(key => {
      if (importData[key as keyof typeof importData] === undefined) {
        delete importData[key as keyof typeof importData];
      }
    });
    
    onImport(importData);
    setStep('complete');
  };

  // Download template
  const downloadTemplate = () => {
    const templateData = [
      COUNTERPARTY_FIELDS.map(f => f.label),
      ['Local Midcap', '15', 'Medium', 'Leased', '16<yr<20', '1000', '1,200', '900', '0.75', '5%', '2.0', '10%', '3', '60', '6%', '1.2', '6%']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Data');
    XLSX.writeFile(wb, 'counterparty_financial_template.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import Financial Data</h2>
              <p className="text-sm text-slate-400">Upload CSV or Excel file with counterparty financials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {['Upload', 'Map Columns', 'Preview', 'Complete'].map((label, idx) => {
              const stepKeys = ['upload', 'mapping', 'preview', 'complete'];
              const currentIdx = stepKeys.indexOf(step);
              const isActive = idx === currentIdx;
              const isComplete = idx < currentIdx;
              
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isComplete ? 'bg-emerald-500 text-white' :
                      isActive ? 'bg-blue-500 text-white' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className={`flex-1 h-0.5 mx-4 ${idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-12 h-12 text-blue-400 animate-spin" />
                    <p className="text-slate-300">Processing file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-slate-800 rounded-full">
                      <Upload className="w-12 h-12 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-lg text-white font-medium">Drop your file here</p>
                      <p className="text-slate-400 mt-1">or click to browse</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" /> CSV
                      </span>
                      <span className="flex items-center gap-1">
                        <Table className="w-4 h-4" /> Excel (.xlsx, .xls)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Download */}
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Info className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-2">Need a template?</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Download our Excel template with all the required fields pre-configured. 
                      Supports Thai Baht formatting (฿1,200 or 1,200 THB) and percentage formats (10% or 0.10).
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* Supported Formats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="font-medium text-white mb-2">Currency Formats</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• ฿1,200,000</li>
                    <li>• 1,200,000 THB</li>
                    <li>• 1200000</li>
                    <li>• 1,200M (millions)</li>
                  </ul>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="font-medium text-white mb-2">Percentage Formats</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• 10%</li>
                    <li>• 0.10</li>
                    <li>• 10 (auto-converted)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-blue-400">Auto-mapping applied. </span>
                    <span className="text-blue-200">Review and adjust the column mappings below.</span>
                  </div>
                </div>
              </div>

              {/* File Info */}
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">{file?.name}</span>
                </div>
                <span className="text-sm text-slate-400">{parsedData.length} rows found</span>
              </div>

              {/* Mapping Grid */}
              <div className="space-y-4">
                {['WHO', 'WHERE', 'HOW MUCH'].map(pillar => (
                  <div key={pillar} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <h3 className="font-semibold text-white mb-4">
                      Pillar: {pillar}
                      <span className="text-slate-400 font-normal text-sm ml-2">
                        ({pillar === 'WHO' ? '35%' : pillar === 'WHERE' ? '20%' : '45%'} weight)
                      </span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {COUNTERPARTY_FIELDS.filter(f => f.pillar === pillar).map(field => (
                        <div key={field.key} className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">{field.label}</label>
                            <select
                              value={columnMapping[field.key] || ''}
                              onChange={(e) => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            >
                              <option value="">-- Not Mapped --</option>
                              {headers.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                          </div>
                          {columnMapping[field.key] && (
                            <div className="pt-5">
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Row Selector */}
              {parsedData.length > 1 && (
                <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <span className="text-slate-400 text-sm">Select row to import:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRow(Math.max(0, selectedRow - 1))}
                      disabled={selectedRow === 0}
                      className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <span className="text-white px-3">Row {selectedRow + 1} of {parsedData.length}</span>
                    <button
                      onClick={() => setSelectedRow(Math.min(parsedData.length - 1, selectedRow + 1))}
                      disabled={selectedRow === parsedData.length - 1}
                      className="p-1 hover:bg-slate-700 rounded disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {Object.keys(validationErrors).length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="font-semibold text-amber-400">Validation Warnings</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <div key={field} className="flex items-start gap-2 text-sm">
                        <XCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                        <span className="text-amber-200">
                          <strong>{COUNTERPARTY_FIELDS.find(f => f.key === field)?.label}:</strong> {error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview */}
              <div className="space-y-4">
                {['WHO', 'WHERE', 'HOW MUCH'].map(pillar => {
                  const fields = COUNTERPARTY_FIELDS.filter(f => f.pillar === pillar);
                  const mappedFields = fields.filter(f => columnMapping[f.key]);
                  
                  if (mappedFields.length === 0) return null;
                  
                  return (
                    <div key={pillar} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                      <h3 className="font-semibold text-white mb-4">Pillar: {pillar}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mappedFields.map(field => {
                          const sourceColumn = columnMapping[field.key];
                          const rawValue = parsedData[selectedRow]?.[sourceColumn];
                          const hasError = validationErrors[field.key];
                          
                          return (
                            <div key={field.key} className={`p-3 rounded-lg border ${
                              hasError ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-700/50 border-slate-600'
                            }`}>
                              <div className="text-xs text-slate-400 mb-1">{field.label}</div>
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${hasError ? 'text-amber-400' : 'text-white'}`}>
                                  {String(rawValue || '-')}
                                </span>
                                {hasError ? (
                                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-emerald-500/20 rounded-full mb-6">
                <CheckCircle className="w-16 h-16 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Import Successful!</h3>
              <p className="text-slate-400 text-center max-w-md">
                Financial data has been imported and the Credit Committee assessment form has been updated.
              </p>
              <button
                onClick={onClose}
                className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Close & Review Assessment
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'complete' && (
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 'mapping') setStep('upload');
                else if (step === 'preview') setStep('mapping');
              }}
              disabled={step === 'upload'}
              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              
              {step === 'upload' && (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
                >
                  Upload a file to continue
                </button>
              )}
              
              {step === 'mapping' && (
                <button
                  onClick={() => {
                    validateAndTransform();
                    setStep('preview');
                  }}
                  disabled={Object.values(columnMapping).filter(Boolean).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Preview Data
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Import Data
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDataImport;
