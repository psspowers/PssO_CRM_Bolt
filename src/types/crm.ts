export type UserRole = 'admin' | 'internal' | 'external';
export type REType = 'Solar - Rooftop' | 'Solar - Ground' | 'Solar - Floating';
export type ContactTag = 'Decision Maker' | 'Influencer' | 'Regulator' | 'Advisor' | 'Banker' | 'Pricing' | 'Legal' | 'Policy' | 'Land' | 'Bank';
export type OpportunityStage = 'Prospect' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
export type Priority = 'Low' | 'Medium' | 'High';
export type ProjectStatus = 'Won' | 'Engineering' | 'Permit/EPC' | 'Construction' | 'Commissioning' | 'Operational';
export type ActivityType = 'Note' | 'Call' | 'Meeting' | 'WhatsApp' | 'Site Visit';
export type RelationshipType = 'Works At' | 'Advisor To' | 'Board Member' | 'JV Partner' | 'Banker' | 'Friend' | 'Introduced By' | 'Other';
export type Strength = 'Weak' | 'Medium' | 'Strong';

// Thai Sector Taxonomy Info
export interface TaxonomyInfo {
  sector: string;
  industry: string;
  subIndustry: string;
  baseScore: number;      // From Score column (1-10)
  priorityPoints: number; // From Points column (1-5)
}

// Counterparty Risk Assessment (Credit Committee Matrix)
export interface CounterpartyRisk {
  // Pillar 1: WHO (35% Weight)
  corporationType: 'Family Owned' | 'Local Midcap' | 'Local Bigcap' | 'Big MNC' | 'MNC';
  yearsOfExistence: number;
  sunsetRisk: 'Very High' | 'High' | 'Medium' | 'Low' | 'Core';
  
  // Pillar 2: WHERE (20% Weight)
  landOwnership: 'Leased' | 'Owned';
  landLeaseTerm: 'less than 10 yr' | '10<yr<15' | '16<yr<20' | 'more than 20yr';
  industryIntegrity: number; // 0, 500, 1000, 1500, 2000+
  
  // Pillar 3: HOW MUCH (45% Weight)
  netWorth: number;
  revenue: number;
  debtEquityRatio: number;
  revenueCAGR: number;
  debtEbitdaRatio: number;
  ebitdaMargin: number;
  interestCoverage: number | 'No Interest Expense';
  payableDays: number;
  roce: number;
  currentRatio: number;
  projectSavings: number;
  
  // Computed (Stored for history)
  finalScore: number;
  rating: string;
  whoScore: number;
  whereScore: number;
  howMuchScore: number;
}



export interface Partner {
  id: string; name: string; region: string; country: string; ownerId: string;
  email: string; phone: string; clickupLink?: string; notes?: string; createdAt: Date; updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  country: string;
  // NEW CLASSIFICATION FIELDS (Thai Taxonomy)
  sector: string;
  industry: string;
  subIndustry: string;
  // Existing fields
  linkedPartnerIds: string[];
  strategicImportance: Priority;
  clickupLink?: string;
  notes?: string;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string; fullName: string; role: string; accountId?: string; partnerId?: string;
  email: string; phone: string; country: string; city: string; tags: ContactTag[];
  relationshipNotes?: string; clickupLink?: string; avatar?: string; createdAt: Date; updatedAt: Date;
}

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  value: number;
  stage: OpportunityStage;
  priority: Priority;
  ownerId: string;
  linkedPartnerIds: string[];
  nextAction?: string;
  nextActionDate?: Date;
  clickupLink?: string;
  notes?: string;
  targetCapacity: number;
  reType: REType;
  targetDecisionDate?: Date;
  operatingDays?: string[];
  daytimeLoadKW?: number;
  is24Hours?: boolean;
  bankabilityScore?: number;
  completedMilestones?: string[];
  lostReason?: string;
  // NEW CLASSIFICATION FIELDS (Thai Taxonomy)
  sector: string;
  industry: string;
  subIndustry: string;
  // Counterparty Risk Profile (Credit Committee)
  riskProfile?: CounterpartyRisk;
  createdAt: Date;
  updatedAt: Date;
}


export interface Project {
  id: string; name: string; linkedAccountId: string; country: string; capacity: number;
  status: ProjectStatus; ownerId: string; linkedPartnerIds: string[]; clickupLink?: string; notes?: string;
  createdAt: Date; updatedAt: Date;
}

export interface Activity {
  id: string;
  type: ActivityType;
  summary: string;
  details?: string;
  relatedToId: string;
  relatedToType: 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project';
  createdById: string;
  createdAt: Date;
  attachments?: string[];
  tags?: string[];
  clickupLink?: string;
  // TASK FIELDS:
  isTask?: boolean;
  assignedToId?: string;
  dueDate?: Date;
  taskStatus?: 'Pending' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
}

export interface Relationship {
  id: string; fromEntityId: string; fromEntityType: 'Contact' | 'Account' | 'Partner';
  toEntityId: string; toEntityType: 'Contact' | 'Account' | 'Partner';
  type: RelationshipType; strength: Strength; notes?: string;
}

export interface User {
  id: string; name: string; email: string; role: UserRole; avatar?: string; badges: string[];
  reportsTo?: string;
}

export interface MediaFile {
  id: string;
  url: string;
  thumbnailUrl?: string;
  category: 'Roof' | 'Electrical' | 'Utility Bill' | 'Site Map' | 'Other';
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  createdAt: Date;
  // Investor Security:
  lat?: number;
  lng?: number;
  isVerified?: boolean; 
}
