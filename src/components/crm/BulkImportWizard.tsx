import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Upload, FileSpreadsheet, X, Check, AlertTriangle, ArrowRight,
  ChevronLeft, ChevronRight, RefreshCw, Download, Info,
  FileText, Table, CheckCircle, XCircle, Users, Building2,
  Target, FolderKanban, Handshake, Loader2, Link, Unlink,
  Search, ChevronDown, Edit2, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Account, Partner, User } from '@/types/crm';
import { fetchUsers } from '@/lib/api/users';

// ============================================================================
// ENTITY TYPE DEFINITIONS
// ============================================================================

export type EntityType = 'Contact' | 'Account' | 'Opportunity' | 'Project' | 'Partner';

interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'currency' | 'select' | 'date' | 'tags';
  required?: boolean;
  options?: string[];
  validation?: (value: any) => { isValid: boolean; error?: string };
}

interface LinkableField {
  key: string;
  label: string;
  targetEntity: 'Account' | 'Partner' | 'User';
  matchField: string; // The field in target entity to match against (e.g., 'name')
}

interface EntityConfig {
  name: EntityType;
  icon: React.ReactNode;
  color: string;
  fields: FieldDefinition[];
  aliases: Record<string, string[]>;
  templateData: string[][];
  linkableFields?: LinkableField[];
}

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) track[0][i] = i;
  for (let j = 0; j <= s2.length; j++) track[j][0] = j;
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[s2.length][s1.length];
};

// Calculate similarity score (0-100)
const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 100;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const containmentScore = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length) * 100;
    return Math.max(containmentScore, 75);
  }

  // Levenshtein-based similarity
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLen - distance) / maxLen) * 100;

  return Math.round(similarity);
};

// Normalize user name for better matching
const normalizeUserName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

// Normalize company name for better matching
const normalizeCompanyName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(co|co\.|company|corp|corp\.|corporation|inc|inc\.|incorporated|ltd|ltd\.|limited|llc|plc|gmbh|ag|sa|nv|bv)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

interface MatchResult {
  entity: Account | Partner | User;
  score: number;
  matchType: 'exact' | 'high' | 'medium' | 'low';
}

// Find best matches for a company name
const findMatches = (
  searchName: string,
  entities: (Account | Partner)[],
  limit: number = 5
): MatchResult[] => {
  if (!searchName || entities.length === 0) return [];

  const normalizedSearch = normalizeCompanyName(searchName);

  const results: MatchResult[] = entities.map(entity => {
    const normalizedEntity = normalizeCompanyName(entity.name);
    const score = calculateSimilarity(normalizedSearch, normalizedEntity);

    // Also check original names for exact matches
    const exactScore = calculateSimilarity(searchName.toLowerCase(), entity.name.toLowerCase());
    const finalScore = Math.max(score, exactScore);

    let matchType: 'exact' | 'high' | 'medium' | 'low';
    if (finalScore >= 95) matchType = 'exact';
    else if (finalScore >= 75) matchType = 'high';
    else if (finalScore >= 50) matchType = 'medium';
    else matchType = 'low';

    return { entity, score: finalScore, matchType };
  });

  return results
    .filter(r => r.score >= 30) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// Find best matches for users (by name)
const findUserMatches = (
  searchName: string,
  users: User[],
  limit: number = 5
): MatchResult[] => {
  if (!searchName || users.length === 0) return [];

  const normalizedSearch = normalizeUserName(searchName);

  const results: MatchResult[] = users.map(user => {
    const normalizedUserName = normalizeUserName(user.name);
    const score = calculateSimilarity(normalizedSearch, normalizedUserName);

    let matchType: 'exact' | 'high' | 'medium' | 'low';
    if (score >= 95) matchType = 'exact';
    else if (score >= 75) matchType = 'high';
    else if (score >= 50) matchType = 'medium';
    else matchType = 'low';

    return { entity: user, score, matchType };
  });

  return results
    .filter(r => r.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

// Normalize stage values to match database enums
const normalizeStage = (stage: string): string => {
  if (!stage) return stage;

  const normalized = stage.toLowerCase().trim();

  // Fix common typos and variations
  if (normalized.includes('negotation') || normalized.includes('negotiaton')) return 'Negotiation';
  if (normalized === 'presentation') return 'Proposal';
  if (normalized === 'hold') return 'Prospect';
  if (normalized.startsWith('termsheet') || normalized.startsWith('term sheet')) return 'Term Sheet';
  if (normalized === 'qualified lead') return 'Qualified';
  if (normalized === 'lost' || normalized === 'dead') return 'Lost';
  if (normalized === 'won' || normalized === 'closed') return 'Won';

  // Return title case
  return stage.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// Parse percentage strings ("100%" -> 100)
const parsePercentage = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const str = String(value).trim();
  const cleaned = str.replace(/%/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num)) return undefined;

  // If original had %, assume it's already in percentage form (75% = 75)
  // If no %, and value is between 0-1, convert to percentage (0.75 = 75)
  if (str.includes('%')) {
    return num;
  } else if (num >= 0 && num <= 1) {
    return num * 100;
  }

  return num;
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const validateEmail = (value: string): { isValid: boolean; error?: string } => {
  if (!value) return { isValid: true };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) 
    ? { isValid: true } 
    : { isValid: false, error: 'Invalid email format' };
};

const validatePhone = (value: string): { isValid: boolean; error?: string } => {
  if (!value) return { isValid: true };
  const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
  return cleaned.length >= 8 && /^[\+]?[\d]+$/.test(cleaned)
    ? { isValid: true }
    : { isValid: false, error: 'Invalid phone format' };
};

const validateNumber = (value: any): { isValid: boolean; error?: string } => {
  if (!value && value !== 0) return { isValid: true };
  const num = parseFloat(String(value).replace(/,/g, ''));
  return !isNaN(num) 
    ? { isValid: true } 
    : { isValid: false, error: 'Must be a valid number' };
};

const validateRequired = (value: any): { isValid: boolean; error?: string } => {
  const isEmpty = value === undefined || value === null || value === '';
  return isEmpty 
    ? { isValid: false, error: 'This field is required' } 
    : { isValid: true };
};

// ============================================================================
// ENTITY CONFIGURATIONS
// ============================================================================

const ENTITY_CONFIGS: Record<EntityType, EntityConfig> = {
  Contact: {
    name: 'Contact',
    icon: <Users className="w-5 h-5" />,
    color: 'blue',
    fields: [
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
      { key: 'role', label: 'Role/Title', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', validation: validateEmail },
      { key: 'phone', label: 'Phone', type: 'phone', validation: validatePhone },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'tags', label: 'Tags', type: 'tags', options: ['Decision Maker', 'Influencer', 'Regulator', 'Advisor', 'Banker', 'Pricing', 'Legal', 'Policy', 'Land', 'Bank'] },
      { key: 'relationshipNotes', label: 'Notes', type: 'text' },
    ],
    aliases: {
      fullName: ['full name', 'name', 'contact name', 'person', 'ชื่อ'],
      role: ['role', 'title', 'position', 'job title', 'designation', 'ตำแหน่ง'],
      email: ['email', 'e-mail', 'email address', 'อีเมล'],
      phone: ['phone', 'telephone', 'mobile', 'cell', 'contact number', 'โทรศัพท์'],
      country: ['country', 'nation', 'ประเทศ'],
      city: ['city', 'location', 'town', 'เมือง'],
      tags: ['tags', 'labels', 'categories', 'type'],
      relationshipNotes: ['notes', 'comments', 'remarks', 'description', 'หมายเหตุ'],
      // Relationship mapping fields
      relationshipType: ['relationship type', 'relationship', 'rel type', 'type of relationship', 'connection type'],
      strength: ['strength', 'strength (1-5)', 'relationship strength', 'rel strength'],
      connectionNotes: ['connection notes', 'relationship notes', 'rel notes', 'connection'],
      // Linkable field aliases
      accountName: ['account', 'account name', 'company', 'company name', 'organization', 'employer', 'บริษัท'],
      partnerName: ['partner', 'partner name', 'พันธมิตร'],
    },
    templateData: [
      ['Full Name', 'Role', 'Email', 'Phone', 'Country', 'City', 'Tags', 'Notes', 'Company Name', 'Relationship Type', 'Strength (1-5)', 'Connection Notes'],
      ['John Smith', 'CEO', 'john@example.com', '+66-81-234-5678', 'Thailand', 'Bangkok', 'Decision Maker', 'Key contact for solar project', 'ABC Manufacturing', 'Client', '4', 'Met at solar conference'],
      ['Jane Doe', 'CFO', 'jane@example.com', '+66-82-345-6789', 'Thailand', 'Chiang Mai', 'Influencer,Banker', 'Handles financial decisions', 'XYZ Foods', 'Knows', '3', 'Referred by partner'],
    ],
    linkableFields: [
      { key: 'accountId', label: 'Link to Account', targetEntity: 'Account', matchField: 'accountName' },
      { key: 'partnerId', label: 'Link to Partner', targetEntity: 'Partner', matchField: 'partnerName' },
    ],
  },
  Account: {
    name: 'Account',
    icon: <Building2 className="w-5 h-5" />,
    color: 'purple',
    fields: [
      { key: 'name', label: 'Company Name', type: 'text', required: true },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'sector', label: 'Sector', type: 'text' },
      { key: 'industry', label: 'Industry', type: 'text' },
      { key: 'subIndustry', label: 'Sub-Industry', type: 'text' },
      { key: 'strategicImportance', label: 'Strategic Importance', type: 'select', options: ['Low', 'Medium', 'High'] },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],
    aliases: {
      name: ['company name', 'name', 'account name', 'organization', 'business name', 'ชื่อบริษัท'],
      country: ['country', 'nation', 'location', 'ประเทศ'],
      sector: ['sector', 'business sector', 'ภาคธุรกิจ'],
      industry: ['industry', 'business type', 'อุตสาหกรรม'],
      subIndustry: ['sub-industry', 'sub industry', 'subsector', 'กลุ่มย่อย'],
      strategicImportance: ['importance', 'priority', 'strategic importance', 'tier', 'ความสำคัญ'],
      notes: ['notes', 'comments', 'remarks', 'description', 'หมายเหตุ'],
    },
    templateData: [
      ['Company Name', 'Country', 'Sector', 'Industry', 'Sub-Industry', 'Strategic Importance', 'Notes'],
      ['ABC Manufacturing', 'Thailand', 'Industrial', 'Manufacturing', 'Electronics', 'High', 'Major solar prospect'],
      ['XYZ Foods', 'Vietnam', 'Consumer', 'Food & Beverage', 'Processing', 'Medium', 'Cold storage facility'],
    ],
  },
  Opportunity: {
    name: 'Opportunity',
    icon: <Target className="w-5 h-5" />,
    color: 'emerald',
    fields: [
      { key: 'name', label: 'Opportunity Name', type: 'text', required: true },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'stage', label: 'Stage', type: 'select', required: true, options: ['Prospect', 'Qualified', 'Proposal', 'Negotation', 'Term Sheet', 'Won', 'Lost'] },
      { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'] },
      { key: 'value', label: 'Value (THB)', type: 'currency', validation: validateNumber },
      { key: 'targetCapacity', label: 'Target Capacity (MW)', type: 'number', validation: validateNumber },
      { key: 'maxCapacity', label: 'Max Capacity (MWp)', type: 'number', validation: validateNumber },
      { key: 'ppaTermYears', label: 'PPA Term (Years)', type: 'number', validation: validateNumber },
      { key: 'epcCost', label: 'EPC Cost (THB)', type: 'currency', validation: validateNumber },
      { key: 'reType', label: 'RE Type', type: 'select', options: ['Solar - Rooftop', 'Solar - Ground', 'Solar - Floating'] },
      { key: 'manualProbability', label: 'Probability (%)', type: 'number', validation: validateNumber },
      { key: 'clickupLink', label: 'ClickUp Link', type: 'text' },
    ],
    aliases: {
      name: ['Opportunity Name', 'Deal Name', 'Deal Name *', 'opportunity name', 'deal name', 'name'],
      location: ['Location', 'location', 'site', 'place'],
      stage: ['Stage', 'stage', 'status', 'pipeline stage', 'negotation', 'negotiation'],
      priority: ['Priority', 'priority', 'importance'],
      value: ['Value (THB)', 'value (thb)', 'value', 'deal value', 'amount'],
      targetCapacity: ['Target Capacity (MW)', 'Capacity (MW)', 'target capacity (mw)', 'capacity (mw)', 'target capacity', 'capacity', 'mw'],
      maxCapacity: ['Max Capacity (MWp)', 'Max Capacity', 'max capacity (mwp)', 'max capacity', 'maximum capacity'],
      ppaTermYears: ['PPA Term (Years)', 'PPA Year', 'ppa term (years)', 'ppa year', 'ppa term', 'ppa years'],
      epcCost: ['EPC Cost (THB)', 'EPC Cost', 'epc cost (thb)', 'epc cost', 'construction cost'],
      reType: ['RE Type', 're type', 'type', 'solar type', 'renewable type'],
      manualProbability: ['Probability (%)', 'Probability', 'probability (%)', 'probability', 'win probability'],
      clickupLink: ['ClickUp Link', 'Clickup ID', 'clickup link', 'clickup id', 'clickup'],
      accountName: ['Account Name', 'Account Name *', 'account name', 'company name', 'company', 'account', 'customer'],
      partnerName: ['Partner Name', 'Partner', 'partner name', 'partner', 'epc partner', 'epc'],
      ownerName: ['Leader', 'Leader*', 'leader', 'owner', 'owner name', 'assigned to', 'sales rep'],
    },
    templateData: [
      ['Opportunity Name', 'Account Name', 'Location', 'Partner Name', 'Leader', 'Stage', 'Priority', 'Value (THB)', 'Target Capacity (MW)', 'Max Capacity (MWp)', 'PPA Term (Years)', 'EPC Cost (THB)', 'RE Type (comma-separated)', 'Probability (%)', 'ClickUp Link'],
      ['Renaissance Phuket Resort & Spa', 'Seacon Hotels & Resorts', 'Phuket', 'K Nuu (Tanapatanagul)', 'Chaweng Suesut', 'Won', 'High', '50000000', '0.4554', '0.4554', '15', '20000000', 'Solar - Rooftop', '100', '1me2gwt'],
      ['Naresuan University Solar', 'Naresuan University', 'Phitsanulok', 'Rohit Powel', 'Nakkarin Saingarmsatit', 'Term Sheet', 'High', '278070000', '12.09', '12.09', '12', '23000000', 'Solar - Rooftop, Solar - Ground', '100', '860py2mgf'],
    ],
    linkableFields: [
      { key: 'accountId', label: 'Link to Account', targetEntity: 'Account', matchField: 'accountName' },
      { key: 'partnerId', label: 'Link to Partner', targetEntity: 'Partner', matchField: 'partnerName' },
      { key: 'ownerId', label: 'Link to Owner', targetEntity: 'User', matchField: 'ownerName' },
    ],
  },
  Project: {
    name: 'Project',
    icon: <FolderKanban className="w-5 h-5" />,
    color: 'amber',
    fields: [
      { key: 'name', label: 'Project Name', type: 'text', required: true },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'capacity', label: 'Capacity (MW)', type: 'number', required: true, validation: validateNumber },
      { key: 'status', label: 'Status', type: 'select', required: true, options: ['Won', 'Engineering', 'Permit/EPC', 'Construction', 'Commissioning', 'Operational'] },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],
    aliases: {
      name: ['project name', 'name', 'site name', 'ชื่อโครงการ'],
      country: ['country', 'nation', 'location', 'ประเทศ'],
      capacity: ['capacity', 'mw', 'size', 'power', 'กำลังการผลิต'],
      status: ['status', 'stage', 'phase', 'สถานะ'],
      notes: ['notes', 'comments', 'remarks', 'description', 'หมายเหตุ'],
      // Linkable field aliases
      accountName: ['account', 'account name', 'company', 'company name', 'customer', 'client', 'บริษัท'],
    },
    templateData: [
      ['Project Name', 'Country', 'Capacity (MW)', 'Status', 'Notes', 'Account Name'],
      ['Bangkok Solar Farm', 'Thailand', '5.0', 'Construction', 'On track for Q2 completion', 'ABC Manufacturing'],
      ['Hanoi Rooftop', 'Vietnam', '2.0', 'Dev', 'Permits in progress', 'XYZ Foods'],
    ],
    linkableFields: [
      { key: 'linkedAccountId', label: 'Link to Account', targetEntity: 'Account', matchField: 'accountName' },
    ],
  },
  Partner: {
    name: 'Partner',
    icon: <Handshake className="w-5 h-5" />,
    color: 'rose',
    fields: [
      { key: 'name', label: 'Partner Name', type: 'text', required: true },
      { key: 'companyName', label: 'Company Legal Name', type: 'text' },
      { key: 'partnerType', label: 'Partner Type', type: 'text' },
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'country', label: 'Country', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email', validation: validateEmail },
      { key: 'phone', label: 'Phone', type: 'phone', validation: validatePhone },
      { key: 'notes', label: 'Notes', type: 'text' },
    ],
    aliases: {
      name: ['partner name', 'name', 'company', 'organization', 'ชื่อพันธมิตร'],
      companyName: ['company name', 'legal name', 'company legal name', 'official name', 'registered name'],
      partnerType: ['type', 'partner type', 'category', 'classification', 'ประเภท'],
      region: ['region', 'area', 'territory', 'ภูมิภาค'],
      country: ['country', 'nation', 'location', 'ประเทศ'],
      email: ['email', 'e-mail', 'email address', 'อีเมล'],
      phone: ['phone', 'telephone', 'mobile', 'contact number', 'โทรศัพท์'],
      notes: ['notes', 'comments', 'remarks', 'description', 'หมายเหตุ'],
      ownerName: ['owner', 'leader', 'owner name', 'assigned to', 'account manager'],
      // Relationship mapping fields
      relationshipType: ['relationship type', 'relationship', 'rel type', 'type of relationship', 'connection type'],
      strength: ['strength', 'strength (1-5)', 'relationship strength', 'rel strength'],
      connectionNotes: ['connection notes', 'relationship notes', 'rel notes', 'connection'],
    },
    templateData: [
      ['Partner Name', 'Company Legal Name', 'Type', 'Region', 'Country', 'Email', 'Phone', 'Notes', 'Owner', 'Relationship Type', 'Strength (1-5)', 'Connection Notes'],
      ['Solar Solutions Ltd', 'Solar Solutions Limited', 'EPC', 'Southeast Asia', 'Thailand', 'info@solarsolutions.com', '+66-2-123-4567', 'EPC partner', 'John Smith', 'Partner', '4', 'Reliable EPC contractor'],
      ['Green Energy Corp', 'Green Energy Corporation', 'Financier', 'Asia Pacific', 'Singapore', 'contact@greenenergy.sg', '+65-6789-0123', 'Financing partner', 'Jane Doe', 'Vendor', '5', 'Preferred financing partner'],
    ],
    linkableFields: [
      { key: 'ownerId', label: 'Link to Owner', targetEntity: 'User', matchField: 'ownerName' },
    ],
  },
};

// ============================================================================
// INTERFACES
// ============================================================================

interface ParsedRow {
  [key: string]: string | number;
}

interface EntityLink {
  fieldKey: string;
  sourceColumn: string | null;
  matchedEntityId: string | null;
  matchedEntityName: string | null;
  matchScore: number;
  matchType: 'exact' | 'high' | 'medium' | 'low' | 'manual' | 'none';
  isManualOverride: boolean;
}

interface RowValidation {
  rowIndex: number;
  isValid: boolean;
  errors: Record<string, string>;
  data: Record<string, any>;
  entityLinks: EntityLink[];
}

interface BulkImportWizardProps {
  onImport: (entityType: EntityType, data: Record<string, any>[], options?: {
    defaultRelType?: string;
    defaultStrength?: number;
    defaultTags?: string;
  }) => Promise<void>;
  onClose: () => void;
  defaultEntityType?: EntityType;
  existingAccounts?: Account[];
  existingPartners?: Partner[];
  currentUserId?: string;
}

// ============================================================================
// ENTITY LINK SELECTOR COMPONENT
// ============================================================================

interface EntityLinkSelectorProps {
  rowIndex: number;
  linkField: LinkableField;
  sourceValue: string;
  currentLink: EntityLink;
  entities: (Account | Partner | User)[];
  onSelect: (entityId: string | null, entityName: string | null, score: number, matchType: EntityLink['matchType']) => void;
}

const EntityLinkSelector: React.FC<EntityLinkSelectorProps> = ({
  rowIndex,
  linkField,
  sourceValue,
  currentLink,
  entities,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const matches = useMemo(() => {
    const searchValue = searchTerm || sourceValue;
    if (linkField.targetEntity === 'User') {
      return findUserMatches(searchValue, entities as User[], searchTerm ? 10 : 5);
    }
    return findMatches(searchValue, entities as (Account | Partner)[], searchTerm ? 10 : 5);
  }, [sourceValue, entities, searchTerm, linkField.targetEntity]);
  
  const getMatchBadgeColor = (matchType: EntityLink['matchType']) => {
    switch (matchType) {
      case 'exact': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'high': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'manual': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
          currentLink.matchedEntityId
            ? 'bg-slate-700 border-slate-600 text-white'
            : sourceValue
            ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 hover:bg-amber-500/20'
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {currentLink.matchedEntityId ? (
            <>
              <Link className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{currentLink.matchedEntityName}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs border ${getMatchBadgeColor(currentLink.matchType)}`}>
                {currentLink.matchScore}%
              </span>
            </>
          ) : sourceValue ? (
            <>
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="font-medium">No Match - Click to Select</span>
            </>
          ) : (
            <>
              <Unlink className="w-4 h-4 flex-shrink-0" />
              <span>No link</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          
          {/* Source Value Info */}
          {sourceValue && (
            <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700">
              <div className="text-xs text-slate-400">Matching from:</div>
              <div className="text-sm text-white truncate">{sourceValue}</div>
            </div>
          )}
          
          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {/* No Link Option */}
            <button
              onClick={() => {
                onSelect(null, null, 0, 'none');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                !currentLink.matchedEntityId ? 'bg-slate-700' : ''
              }`}
            >
              <Unlink className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300">No link</span>
            </button>
            
            {/* Matched Options */}
            {matches.length > 0 ? (
              matches.map((match) => (
                <button
                  key={match.entity.id}
                  onClick={() => {
                    onSelect(
                      match.entity.id, 
                      match.entity.name, 
                      match.score, 
                      searchTerm ? 'manual' : match.matchType
                    );
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                    currentLink.matchedEntityId === match.entity.id ? 'bg-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Link className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-white truncate">{match.entity.name}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs border flex-shrink-0 ${getMatchBadgeColor(match.matchType)}`}>
                    {match.score}%
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                No matching {linkField.targetEntity.toLowerCase()}s found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BulkImportWizard: React.FC<BulkImportWizardProps> = ({
  onImport,
  onClose,
  defaultEntityType,
  existingAccounts = [],
  existingPartners = [],
  currentUserId,
}) => {
  const [step, setStep] = useState<'select' | 'upload' | 'mapping' | 'linking' | 'preview' | 'importing' | 'complete'>(
    defaultEntityType ? 'upload' : 'select'
  );
  const [entityType, setEntityType] = useState<EntityType | null>(defaultEntityType || null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [linkColumnMapping, setLinkColumnMapping] = useState<Record<string, string>>({});
  const [validatedRows, setValidatedRows] = useState<RowValidation[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [defaultRelType, setDefaultRelType] = useState('Knows');
  const [defaultStrength, setDefaultStrength] = useState(3);
  const [defaultTags, setDefaultTags] = useState('');

  const config = entityType ? ENTITY_CONFIGS[entityType] : null;
  const hasLinkableFields = config?.linkableFields && config.linkableFields.length > 0;

  // Fetch users when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const users = await fetchUsers();
        setAvailableUsers(users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Auto-map columns based on header names
  const autoMapColumns = useCallback((headers: string[], entityConfig: EntityConfig) => {
    const mapping: Record<string, string> = {};
    const linkMapping: Record<string, string> = {};

    if (!headers || !entityConfig || !entityConfig.aliases) {
      console.error('Invalid parameters for autoMapColumns');
      return { mapping, linkMapping };
    }

    console.log('=== AUTO-MAPPING START ===');
    console.log('CSV Headers:', JSON.stringify(headers));
    console.log('Entity:', entityConfig.name);

    headers.forEach(header => {
      if (!header) return;

      const cleanHeader = String(header).replace(/[*]/g, '').replace(/\s+/g, ' ').trim();
      const normalizedHeader = cleanHeader.toLowerCase();

      console.log(`\n📋 Header: "${header}"`);
      console.log(`   Cleaned: "${cleanHeader}"`);
      console.log(`   Normalized: "${normalizedHeader}"`);

      let bestMatch: { fieldKey: string; score: number } | null = null;

      Object.entries(entityConfig.aliases).forEach(([fieldKey, aliases]) => {
        aliases.forEach(alias => {
          const normalizedAlias = String(alias).toLowerCase().trim();
          let score = 0;

          if (normalizedHeader === normalizedAlias) {
            score = 100;
          } else if (normalizedHeader.includes(normalizedAlias) && normalizedAlias.length >= 4) {
            score = 80;
          } else if (normalizedAlias.includes(normalizedHeader) && normalizedHeader.length >= 4) {
            score = 60;
          }

          if (score > 0) {
            console.log(`   🔍 Checking "${alias}" (field: ${fieldKey}) → score: ${score}`);
          }

          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { fieldKey, score };
          }
        });
      });

      if (bestMatch) {
        console.log(`   ✅ MATCHED: ${bestMatch.fieldKey} (score: ${bestMatch.score})`);

        const linkableField = entityConfig.linkableFields?.find(lf => lf.matchField === bestMatch.fieldKey);
        if (linkableField) {
          linkMapping[linkableField.key] = header;
          console.log(`   → Link field: ${linkableField.key}`);
        } else {
          mapping[bestMatch.fieldKey] = header;
          console.log(`   → Data field: ${bestMatch.fieldKey}`);
        }
      } else {
        console.log(`   ❌ No match found`);
      }
    });

    console.log('\n📊 RESULTS:');
    console.log('Regular mappings:', Object.keys(mapping).length, JSON.stringify(mapping));
    console.log('Link mappings:', Object.keys(linkMapping).length, JSON.stringify(linkMapping));
    console.log('=== AUTO-MAPPING END ===\n');

    return { mapping, linkMapping };
  }, []);

  // Parse value based on field type
  const parseValue = (value: any, field: FieldDefinition): any => {
    if (value === undefined || value === null || value === '') return undefined;

    const strValue = String(value).trim();

    switch (field.type) {
      case 'number':
        // Special handling for probability field
        if (field.key === 'manualProbability') {
          return parsePercentage(value);
        }
        const cleaned = strValue.replace(/[,\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? strValue : num;

      case 'currency':
        const cleanedCurrency = strValue.replace(/[$,฿\s]/g, '');
        const currencyNum = parseFloat(cleanedCurrency);
        return isNaN(currencyNum) ? strValue : currencyNum;

      case 'select':
        // Special handling for stage field
        if (field.key === 'stage') {
          return normalizeStage(strValue);
        }
        return strValue;

      case 'tags':
        return strValue.split(',').map(t => t.trim()).filter(Boolean);

      case 'date':
        const date = new Date(strValue);
        return isNaN(date.getTime()) ? strValue : date;

      default:
        return strValue;
    }
  };

  // Process entity links for a row
  const processEntityLinks = useCallback((
    row: ParsedRow,
    entityConfig: EntityConfig,
    linkMapping: Record<string, string>
  ): EntityLink[] => {
    if (!entityConfig.linkableFields) return [];

    return entityConfig.linkableFields.map(linkField => {
      const sourceColumn = linkMapping[linkField.key] || null;
      const sourceValue = sourceColumn ? String(row[sourceColumn] || '') : '';

      if (!sourceValue) {
        return {
          fieldKey: linkField.key,
          sourceColumn,
          matchedEntityId: null,
          matchedEntityName: null,
          matchScore: 0,
          matchType: 'none' as const,
          isManualOverride: false,
        };
      }

      // Find best match based on entity type
      let matches: MatchResult[] = [];

      if (linkField.targetEntity === 'User') {
        matches = findUserMatches(sourceValue, availableUsers, 1);
      } else if (linkField.targetEntity === 'Account') {
        matches = findMatches(sourceValue, existingAccounts, 1);
      } else if (linkField.targetEntity === 'Partner') {
        matches = findMatches(sourceValue, existingPartners, 1);
      }

      // UPDATED: Lower threshold to 40% and remove silent fallback
      if (matches.length > 0 && matches[0].score >= 40) {
        return {
          fieldKey: linkField.key,
          sourceColumn,
          matchedEntityId: matches[0].entity.id,
          matchedEntityName: matches[0].entity.name,
          matchScore: matches[0].score,
          matchType: matches[0].matchType,
          isManualOverride: false,
        };
      }

      // REMOVED: Silent fallback to currentUserId - force manual selection instead
      return {
        fieldKey: linkField.key,
        sourceColumn,
        matchedEntityId: null,
        matchedEntityName: null,
        matchScore: 0,
        matchType: 'none' as const,
        isManualOverride: false,
      };
    });
  }, [existingAccounts, existingPartners, availableUsers]);

  // Validate a single row
  const validateRow = useCallback((
    row: ParsedRow, 
    rowIndex: number, 
    entityConfig: EntityConfig, 
    mapping: Record<string, string>,
    linkMapping: Record<string, string>
  ): RowValidation => {
    const errors: Record<string, string> = {};
    const data: Record<string, any> = {};
    
    entityConfig.fields.forEach(field => {
      const sourceColumn = mapping[field.key];
      const rawValue = sourceColumn ? row[sourceColumn] : undefined;
      const parsedValue = parseValue(rawValue, field);
      
      // Check required
      if (field.required) {
        const reqResult = validateRequired(parsedValue);
        if (!reqResult.isValid) {
          errors[field.key] = reqResult.error!;
        }
      }
      
      // Check field-specific validation
      if (parsedValue !== undefined && field.validation) {
        const valResult = field.validation(parsedValue);
        if (!valResult.isValid) {
          errors[field.key] = valResult.error!;
        }
      }
      
      // Check select options
      if (field.type === 'select' && field.options && parsedValue) {
        if (field.key === 'reType') {
          const values = String(parsedValue).split(',').map(v => v.trim()).filter(Boolean);
          const matchedValues: string[] = [];
          const invalidValues: string[] = [];

          values.forEach(val => {
            const matchedOption = field.options!.find(
              opt => opt.toLowerCase() === val.toLowerCase()
            );
            if (matchedOption) {
              matchedValues.push(matchedOption);
            } else {
              invalidValues.push(val);
            }
          });

          if (invalidValues.length > 0) {
            errors[field.key] = `Invalid RE Type(s): ${invalidValues.join(', ')}. Expected: ${field.options.join(', ')}`;
          } else {
            data[field.key] = matchedValues;
            return;
          }
        } else {
          const normalizedValue = String(parsedValue).trim();
          const matchedOption = field.options.find(
            opt => opt.toLowerCase() === normalizedValue.toLowerCase()
          );
          if (!matchedOption) {
            errors[field.key] = `Invalid option. Expected: ${field.options.join(', ')}`;
          } else {
            data[field.key] = matchedOption;
            return;
          }
        }
      }

      data[field.key] = parsedValue;
    });
    
    // Process entity links
    const entityLinks = processEntityLinks(row, entityConfig, linkMapping);
    
    return {
      rowIndex,
      isValid: Object.keys(errors).length === 0,
      errors,
      data,
      entityLinks,
    };
  }, [processEntityLinks]);

  // Validate all rows
  const validateAllRows = useCallback(() => {
    if (!config || parsedData.length === 0) return;
    
    const validated = parsedData.map((row, idx) => 
      validateRow(row, idx, config, columnMapping, linkColumnMapping)
    );
    
    setValidatedRows(validated);
    
    // Select all valid rows by default
    const validIndices = new Set(validated.filter(r => r.isValid).map(r => r.rowIndex));
    setSelectedRows(validIndices);
  }, [config, parsedData, columnMapping, linkColumnMapping, validateRow]);

  // Update entity link for a specific row
  const updateEntityLink = useCallback((
    rowIndex: number, 
    fieldKey: string, 
    entityId: string | null, 
    entityName: string | null,
    score: number,
    matchType: EntityLink['matchType']
  ) => {
    setValidatedRows(prev => prev.map(row => {
      if (row.rowIndex !== rowIndex) return row;
      
      return {
        ...row,
        entityLinks: row.entityLinks.map(link => {
          if (link.fieldKey !== fieldKey) return link;
          return {
            ...link,
            matchedEntityId: entityId,
            matchedEntityName: entityName,
            matchScore: score,
            matchType,
            isManualOverride: matchType === 'manual',
          };
        }),
      };
    }));
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    if (!config) return;
    
    setIsProcessing(true);
    setFile(uploadedFile);
    
    try {
      const fileExtension = uploadedFile.name.split('.').pop()?.toLowerCase();
      let data: ParsedRow[] = [];
      let fileHeaders: string[] = [];
      
      if (fileExtension === 'csv') {
        const text = await uploadedFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length > 0) {
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };
          
          fileHeaders = parseCSVLine(lines[0]);
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.every(v => !v)) continue;
            
            const row: ParsedRow = {};
            fileHeaders.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            data.push(row);
          }
        }
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1 });
        
        if (jsonData.length > 0) {
          fileHeaders = (jsonData[0] as any[]).map(h => String(h || '').trim());
          
          for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i] as any[];
            if (!rowData || rowData.every(cell => !cell)) continue;
            
            const row: ParsedRow = {};
            fileHeaders.forEach((header, idx) => {
              row[header] = rowData[idx] !== undefined ? rowData[idx] : '';
            });
            data.push(row);
          }
        }
      }
      
      setHeaders(fileHeaders);
      setParsedData(data);
      const { mapping, linkMapping } = autoMapColumns(fileHeaders, config);
      setColumnMapping(mapping);
      setLinkColumnMapping(linkMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please ensure it is a valid CSV or Excel file.');
    }
    
    setIsProcessing(false);
  }, [config, autoMapColumns]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  }, [handleFileUpload]);

  // Download template
  const downloadTemplate = () => {
    if (!config) return;
    
    const ws = XLSX.utils.aoa_to_sheet(config.templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.name);
    XLSX.writeFile(wb, `${config.name.toLowerCase()}_import_template.xlsx`);
  };

  // Handle import
  const handleImport = async () => {
    if (!config || !entityType) return;
    
    const rowsToImport = validatedRows.filter(r => selectedRows.has(r.rowIndex));
    if (rowsToImport.length === 0) return;
    
    setStep('importing');
    setImportProgress({ current: 0, total: rowsToImport.length });
    
    const results = { success: 0, failed: 0, errors: [] as string[] };
    const successfulData: Record<string, any>[] = [];
    
    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i];
      try {
        // Add entity links to data
        const dataWithLinks = { ...row.data };
        row.entityLinks.forEach(link => {
          if (link.matchedEntityId) {
            dataWithLinks[link.fieldKey] = link.matchedEntityId;
          }
        });

        // Inherit taxonomy from linked Account for Opportunities
        if (entityType === 'Opportunity' && dataWithLinks.accountId) {
          const linkedAccount = existingAccounts.find(a => a.id === dataWithLinks.accountId);
          if (linkedAccount) {
            if (!dataWithLinks.sector && linkedAccount.sector) {
              dataWithLinks.sector = linkedAccount.sector;
            }
            if (!dataWithLinks.industry && linkedAccount.industry) {
              dataWithLinks.industry = linkedAccount.industry;
            }
            if (!dataWithLinks.subIndustry && linkedAccount.subIndustry) {
              dataWithLinks.subIndustry = linkedAccount.subIndustry;
            }
          }
        }

        successfulData.push(dataWithLinks);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${row.rowIndex + 1}: ${error.message || 'Unknown error'}`);
      }
      setImportProgress({ current: i + 1, total: rowsToImport.length });
    }
    
    try {
      await onImport(entityType, successfulData, {
        defaultRelType,
        defaultStrength,
        defaultTags
      });
    } catch (error: any) {
      results.failed = successfulData.length;
      results.success = 0;
      results.errors.push(`Import failed: ${error.message || 'Unknown error'}`);
    }
    
    setImportResults(results);
    setStep('complete');
  };

  // Toggle row selection
  const toggleRowSelection = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedRows.size === validatedRows.filter(r => r.isValid).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(validatedRows.filter(r => r.isValid).map(r => r.rowIndex)));
    }
  };

  // Get link statistics
  const linkStats = useMemo(() => {
    if (!hasLinkableFields || validatedRows.length === 0) return null;
    
    const stats: Record<string, { linked: number; unlinked: number; highConfidence: number }> = {};
    
    config?.linkableFields?.forEach(linkField => {
      stats[linkField.key] = { linked: 0, unlinked: 0, highConfidence: 0 };
      
      validatedRows.forEach(row => {
        const link = row.entityLinks.find(l => l.fieldKey === linkField.key);
        if (link?.matchedEntityId) {
          stats[linkField.key].linked++;
          if (link.matchScore >= 75) {
            stats[linkField.key].highConfidence++;
          }
        } else {
          stats[linkField.key].unlinked++;
        }
      });
    });
    
    return stats;
  }, [validatedRows, hasLinkableFields, config]);

  // Proceed from mapping to linking or preview
  const proceedFromMapping = () => {
    validateAllRows();
    if (hasLinkableFields) {
      setStep('linking');
    } else {
      setStep('preview');
    }
  };

  // Step labels based on whether linking is needed
  const stepLabels = hasLinkableFields 
    ? ['Select Type', 'Upload', 'Map Columns', 'Link Entities', 'Preview', 'Complete']
    : ['Select Type', 'Upload', 'Map Columns', 'Preview', 'Complete'];
  
  const stepKeys = hasLinkableFields
    ? ['select', 'upload', 'mapping', 'linking', 'preview', 'complete']
    : ['select', 'upload', 'mapping', 'preview', 'complete'];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config ? `bg-${config.color}-500/20` : 'bg-blue-500/20'}`}>
              {config ? config.icon : <FileSpreadsheet className="w-6 h-6 text-blue-400" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {config ? `Import ${config.name}s` : 'Bulk Import Wizard'}
              </h2>
              <p className="text-sm text-slate-400">
                {config ? `Upload CSV or Excel file with ${config.name.toLowerCase()} data` : 'Import data from spreadsheets'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {stepLabels.map((label, idx) => {
              const currentIdx = stepKeys.indexOf(step === 'importing' ? 'preview' : step);
              const isActive = idx === currentIdx;
              const isComplete = idx < currentIdx;
              
              if (defaultEntityType && idx === 0) return null;
              
              return (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isComplete ? 'bg-emerald-500 text-white' :
                      isActive ? 'bg-blue-500 text-white' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {isComplete ? <Check className="w-4 h-4" /> : defaultEntityType ? idx : idx + 1}
                    </div>
                    <span className={`text-sm hidden sm:inline ${isActive ? 'text-white font-medium' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {idx < stepLabels.length - 1 && !(defaultEntityType && idx === 0) && (
                    <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 0: Select Entity Type */}
          {step === 'select' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">What would you like to import?</h3>
                <p className="text-slate-400">Select the type of data you want to import from your spreadsheet</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(ENTITY_CONFIGS).map((entityConfig) => (
                  <button
                    key={entityConfig.name}
                    onClick={() => {
                      setEntityType(entityConfig.name);
                      setStep('upload');
                    }}
                    className={`p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                      entityType === entityConfig.name 
                        ? `border-${entityConfig.color}-500 bg-${entityConfig.color}-500/10` 
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className={`p-3 rounded-lg bg-${entityConfig.color}-500/20 w-fit mx-auto mb-4`}>
                      <div className={`text-${entityConfig.color}-400`}>
                        {entityConfig.icon}
                      </div>
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">{entityConfig.name}s</h4>
                    <p className="text-sm text-slate-400">
                      {entityConfig.fields.length} fields available
                      {entityConfig.linkableFields && entityConfig.linkableFields.length > 0 && (
                        <span className="block mt-1 text-blue-400">
                          <Link className="w-3 h-3 inline mr-1" />
                          Can link to {entityConfig.linkableFields.map(l => l.targetEntity).join(', ')}
                        </span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && config && (
            <div className="space-y-6">
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

              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Info className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-2">Need a template?</h3>
                    <p className="text-sm text-slate-400 mb-4">
                      Download our Excel template with all the {config.name.toLowerCase()} fields pre-configured.
                      {config.linkableFields && config.linkableFields.length > 0 && (
                        <span className="block mt-1">
                          Include company names to automatically link to existing {config.linkableFields.map(l => l.targetEntity.toLowerCase() + 's').join(' or ')}.
                        </span>
                      )}
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download {config.name} Template
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <h3 className="font-medium text-white mb-4">Available Fields</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {config.fields.map(field => (
                    <div 
                      key={field.key}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        field.required 
                          ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' 
                          : 'bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      {field.label}
                      {field.required && <span className="text-blue-400 ml-1">*</span>}
                    </div>
                  ))}
                  {config.linkableFields?.map(linkField => (
                    <div 
                      key={linkField.key}
                      className="px-3 py-2 rounded-lg text-sm bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1"
                    >
                      <Link className="w-3 h-3" />
                      {linkField.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && config && (
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

              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="text-white">{file?.name}</span>
                </div>
                <span className="text-sm text-slate-400">{parsedData.length} rows found</span>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-400 mb-1">Detected CSV Headers</h4>
                    <p className="text-sm text-amber-200/80 mb-2">Found {headers.length} columns in your file</p>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {headers.map((header, idx) => (
                      <div key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-white border border-slate-600">
                        <span className="text-slate-400">{idx + 1}.</span>
                        <span>{header}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-amber-200/80">
                    Auto-mapped: <span className="font-semibold text-emerald-400">{Object.keys(columnMapping).length + Object.keys(linkColumnMapping).length}</span> of {headers.length} columns
                  </div>
                  <button
                    onClick={() => {
                      if (config) {
                        const { mapping, linkMapping } = autoMapColumns(headers, config);
                        setColumnMapping(mapping);
                        setLinkColumnMapping(linkMapping);
                      }
                    }}
                    className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                  >
                    Re-run Auto-Mapping
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="font-semibold text-white mb-4">Field Mapping</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.fields.map(field => (
                    <div key={field.key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
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

              {/* Entity Linking Column Mapping */}
              {config.linkableFields && config.linkableFields.length > 0 && (
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Link className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-purple-300">Entity Linking Columns</h3>
                  </div>
                  <p className="text-sm text-purple-200 mb-4">
                    Map columns containing company/organization names to automatically link records to existing entities.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.linkableFields.map(linkField => (
                      <div key={linkField.key} className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-purple-300 mb-1">
                            {linkField.label} (match by name)
                          </label>
                          <select
                            value={linkColumnMapping[linkField.key] || ''}
                            onChange={(e) => setLinkColumnMapping(prev => ({ ...prev, [linkField.key]: e.target.value }))}
                            className="w-full bg-slate-700 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm"
                          >
                            <option value="">-- Not Mapped --</option>
                            {headers.map(header => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </select>
                        </div>
                        {linkColumnMapping[linkField.key] && (
                          <div className="pt-5">
                            <CheckCircle className="w-5 h-5 text-purple-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-xs text-slate-400">
                      <span className="font-medium text-slate-300">Available for linking:</span>
                      <span className="ml-2">
                        {existingAccounts.length} Accounts, {existingPartners.length} Partners, {availableUsers.length} Users
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {parsedData.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-4">Sample Data (First Row)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(columnMapping).filter(([_, col]) => col).map(([fieldKey, column]) => {
                      const field = config.fields.find(f => f.key === fieldKey);
                      const value = parsedData[0]?.[column];
                      return (
                        <div key={fieldKey} className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-1">{field?.label}</div>
                          <div className="text-white text-sm truncate">{String(value || '-')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Entity Linking */}
          {step === 'linking' && config && hasLinkableFields && (
            <div className="space-y-6">
              {/* Warning Banner for Unmatched Links */}
              {linkStats && Object.values(linkStats).some(stat => stat.unlinked > 0) && (
                <div className="bg-amber-500/10 border border-amber-500/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-amber-300 mb-1">Action Required: Unmatched Links Detected</div>
                      <div className="text-amber-200 text-sm">
                        Some rows have unmatched entity links (highlighted in amber below).
                        You can proceed with the import, but these records will have empty owner/link fields.
                        Click on any "No Match - Click to Select" button to manually assign the correct entity.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Link Statistics */}
              {linkStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {config.linkableFields?.map(linkField => {
                    const stats = linkStats[linkField.key];
                    return (
                      <div key={linkField.key} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-center gap-2 mb-3">
                          <Link className="w-4 h-4 text-purple-400" />
                          <span className="font-medium text-white">{linkField.label}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-xl font-bold text-emerald-400">{stats.linked}</div>
                            <div className="text-xs text-slate-400">Linked</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-amber-400">{stats.unlinked}</div>
                            <div className="text-xs text-slate-400">Unlinked</div>
                          </div>
                          <div>
                            <div className="text-xl font-bold text-blue-400">{stats.highConfidence}</div>
                            <div className="text-xs text-slate-400">High Conf.</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <span className="font-medium text-blue-400">Review entity matches. </span>
                    <span className="text-blue-200">
                      Fuzzy matching has been applied. Click on any match to change or remove the link.
                    </span>
                  </div>
                </div>
              </div>

              {/* Entity Linking Table */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-700/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Record Name
                        </th>
                        {config.linkableFields?.map(linkField => (
                          <React.Fragment key={linkField.key}>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                              Source ({linkField.targetEntity} Name)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[250px]">
                              {linkField.label}
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {validatedRows.slice(0, 50).map((row) => {
                        const nameField = config.fields.find(f => f.key === 'name' || f.key === 'fullName');
                        const recordName = nameField ? row.data[nameField.key] : `Row ${row.rowIndex + 1}`;

                        // Check if any entity links are unmatched
                        const hasUnmatchedLinks = row.entityLinks.some(link =>
                          link.sourceColumn && !link.matchedEntityId
                        );

                        return (
                          <tr
                            key={row.rowIndex}
                            className={`hover:bg-slate-700/30 ${
                              hasUnmatchedLinks ? 'bg-amber-500/10 border-l-4 border-amber-500' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {hasUnmatchedLinks && (
                                <AlertCircle className="w-4 h-4 text-amber-400 inline mr-1" />
                              )}
                              {row.rowIndex + 1}
                            </td>
                            <td className="px-4 py-3 text-sm text-white font-medium">
                              {String(recordName || '-')}
                            </td>
                            {config.linkableFields?.map(linkField => {
                              const link = row.entityLinks.find(l => l.fieldKey === linkField.key);
                              const sourceColumn = linkColumnMapping[linkField.key];
                              const sourceValue = sourceColumn ? String(parsedData[row.rowIndex]?.[sourceColumn] || '') : '';
                              const entities = linkField.targetEntity === 'User' ? availableUsers :
                                             linkField.targetEntity === 'Account' ? existingAccounts : existingPartners;

                              return (
                                <React.Fragment key={linkField.key}>
                                  <td className="px-4 py-3 text-sm text-slate-300">
                                    {sourceValue || <span className="text-slate-500 italic">No source</span>}
                                  </td>
                                  <td className="px-4 py-3">
                                    {link && (
                                      <EntityLinkSelector
                                        rowIndex={row.rowIndex}
                                        linkField={linkField}
                                        sourceValue={sourceValue}
                                        currentLink={link}
                                        entities={entities}
                                        onSelect={(entityId, entityName, score, matchType) =>
                                          updateEntityLink(row.rowIndex, linkField.key, entityId, entityName, score, matchType)
                                        }
                                      />
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {validatedRows.length > 50 && (
                  <div className="px-4 py-3 bg-slate-700/30 text-center text-sm text-slate-400">
                    Showing first 50 rows. All {validatedRows.length} rows will be imported.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && config && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                  <div className="text-2xl font-bold text-white">{validatedRows.length}</div>
                  <div className="text-sm text-slate-400">Total Rows</div>
                </div>
                <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {validatedRows.filter(r => r.isValid).length}
                  </div>
                  <div className="text-sm text-emerald-300">Valid</div>
                </div>
                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {validatedRows.filter(r => !r.isValid).length}
                  </div>
                  <div className="text-sm text-amber-300">With Errors</div>
                </div>
              </div>

              {/* Link Summary */}
              {hasLinkableFields && linkStats && (
                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Link className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-purple-300">Entity Links Summary</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {config.linkableFields?.map(linkField => {
                      const stats = linkStats[linkField.key];
                      return (
                        <div key={linkField.key} className="flex items-center gap-2 text-sm">
                          <span className="text-purple-200">{linkField.label}:</span>
                          <span className="text-emerald-400">{stats.linked} linked</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-amber-400">{stats.unlinked} unlinked</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === validatedRows.filter(r => r.isValid).length && selectedRows.size > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-500 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-slate-300">
                    {selectedRows.size} of {validatedRows.filter(r => r.isValid).length} valid rows selected
                  </span>
                </div>
                <span className="text-sm text-slate-400">
                  Click rows to select/deselect
                </span>
              </div>

              <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-700/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                          Select
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-20">
                          Status
                        </th>
                        {config.fields.slice(0, 4).map(field => (
                          <th key={field.key} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            {field.label}
                          </th>
                        ))}
                        {hasLinkableFields && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Links
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {validatedRows.map((row) => (
                        <tr 
                          key={row.rowIndex}
                          onClick={() => row.isValid && toggleRowSelection(row.rowIndex)}
                          className={`transition-colors ${
                            row.isValid 
                              ? selectedRows.has(row.rowIndex)
                                ? 'bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer'
                                : 'hover:bg-slate-700/50 cursor-pointer'
                              : 'bg-red-500/5 opacity-60'
                          }`}
                        >
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {row.rowIndex + 1}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.rowIndex)}
                              onChange={() => toggleRowSelection(row.rowIndex)}
                              disabled={!row.isValid}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-slate-500 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {row.isValid ? (
                              <span className="flex items-center gap-1 text-emerald-400 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Valid
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400 text-sm" title={Object.values(row.errors).join(', ')}>
                                <XCircle className="w-4 h-4" />
                                Error
                              </span>
                            )}
                          </td>
                          {config.fields.slice(0, 4).map(field => {
                            const hasError = row.errors[field.key];
                            const value = row.data[field.key];
                            return (
                              <td 
                                key={field.key} 
                                className={`px-4 py-3 text-sm ${hasError ? 'text-red-400' : 'text-white'}`}
                                title={hasError || undefined}
                              >
                                <div className="flex items-center gap-1">
                                  {hasError && <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                                  <span className="truncate max-w-[150px]">
                                    {Array.isArray(value) ? value.join(', ') : String(value || '-')}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                          {hasLinkableFields && (
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {row.entityLinks.map(link => (
                                  link.matchedEntityId && (
                                    <span 
                                      key={link.fieldKey}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                                      title={`${link.matchedEntityName} (${link.matchScore}%)`}
                                    >
                                      <Link className="w-3 h-3" />
                                      {link.matchedEntityName?.slice(0, 15)}
                                      {(link.matchedEntityName?.length || 0) > 15 ? '...' : ''}
                                    </span>
                                  )
                                ))}
                                {row.entityLinks.every(l => !l.matchedEntityId) && (
                                  <span className="text-xs text-slate-500">No links</span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {validatedRows.some(r => !r.isValid) && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-red-400">Validation Errors</span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {validatedRows.filter(r => !r.isValid).map(row => (
                      <div key={row.rowIndex} className="text-sm">
                        <span className="text-red-300 font-medium">Row {row.rowIndex + 1}:</span>
                        <span className="text-red-200 ml-2">
                          {Object.entries(row.errors).map(([field, error]) => `${field}: ${error}`).join('; ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(entityType === 'Contact' || entityType === 'Partner') && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Handshake className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Default Relationship Settings</h3>
                    <Info className="w-4 h-4 text-slate-400 ml-auto" title={`These defaults will be applied to ${entityType.toLowerCase()}s that don't have relationship data in the CSV`} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Relationship Type
                      </label>
                      <select
                        value={defaultRelType}
                        onChange={(e) => setDefaultRelType(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Knows">Knows</option>
                        <option value="Worked With">Worked With</option>
                        <option value="Client">Client</option>
                        <option value="Partner">Partner</option>
                        <option value="Vendor">Vendor</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Relationship Strength (1-5)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={defaultStrength}
                          onChange={(e) => setDefaultStrength(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-lg font-bold text-blue-500 w-8 text-center">
                          {defaultStrength}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>Weak</span>
                        <span>Strong</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Add Tag (Optional)
                      </label>
                      <input
                        type="text"
                        value={defaultTags}
                        onChange={(e) => setDefaultTags(e.target.value)}
                        placeholder="e.g., Import 2024"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-6" />
              <h3 className="text-xl font-semibold text-white mb-2">Importing Data...</h3>
              <p className="text-slate-400 mb-6">
                Processing {importProgress.current} of {importProgress.total} records
              </p>
              <div className="w-full max-w-md bg-slate-700 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Step 6: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              {importResults.failed === 0 ? (
                <>
                  <div className="p-4 bg-emerald-500/20 rounded-full mb-6">
                    <CheckCircle className="w-16 h-16 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Import Successful!</h3>
                  <p className="text-slate-400 text-center max-w-md mb-4">
                    Successfully imported {importResults.success} {config?.name.toLowerCase()}(s).
                  </p>
                </>
              ) : (
                <>
                  <div className="p-4 bg-amber-500/20 rounded-full mb-6">
                    <AlertTriangle className="w-16 h-16 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Import Completed with Errors</h3>
                  <p className="text-slate-400 text-center max-w-md mb-4">
                    {importResults.success} succeeded, {importResults.failed} failed.
                  </p>
                  {importResults.errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 w-full max-w-lg">
                      <div className="text-sm text-red-300 space-y-1 max-h-40 overflow-y-auto">
                        {importResults.errors.map((error, idx) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="mt-8 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!['importing', 'complete'].includes(step) && (
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 'upload') {
                  if (defaultEntityType) {
                    onClose();
                  } else {
                    setStep('select');
                  }
                }
                else if (step === 'mapping') setStep('upload');
                else if (step === 'linking') setStep('mapping');
                else if (step === 'preview') setStep(hasLinkableFields ? 'linking' : 'mapping');
              }}
              disabled={step === 'select'}
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
              
              {step === 'select' && (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
                >
                  Select an entity type
                </button>
              )}
              
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
                  onClick={proceedFromMapping}
                  disabled={Object.values(columnMapping).filter(Boolean).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {hasLinkableFields ? 'Configure Links' : 'Preview Data'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              
              {step === 'linking' && (
                <button
                  onClick={() => setStep('preview')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Preview Data
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  disabled={selectedRows.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Import {selectedRows.size} {config?.name}(s)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImportWizard;
