import { supabase } from '../supabase';

import { Opportunity, OpportunityStage, Priority, REType, CounterpartyRisk } from '../../types/crm';
import { DbOpportunity } from './types';

/**
 * Helper: Convert empty string to null for UUID fields
 */
const toUuidOrNull = (value: string | undefined | null): string | null => {
  if (!value || value === '') return null;
  return value;
};

/**
 * Mapper: Converts Database (snake_case) to Frontend (camelCase)
 */
const toOpp = (db: DbOpportunity, partnerIds: string[] = []): Opportunity => ({
  id: db.id,
  name: db.name,
  accountId: db.account_id || db.linked_account_id || '',
  value: db.value ?? db.value_usd ?? 0,
  stage: db.stage as OpportunityStage,
  priority: db.priority as Priority,
  ownerId: db.owner_id,
  linkedPartnerIds: partnerIds,
  nextAction: db.next_action,
  nextActionDate: db.next_action_date ? new Date(db.next_action_date) : undefined,
  clickupLink: db.clickup_link,
  notes: db.notes,
  maxCapacity: db.max_capacity,
  targetCapacity: db.target_capacity ?? db.target_capacity_mw ?? 0,
  ppaTermYears: db.ppa_term,
  epcCost: db.epc_cost,
  manualProbability: db.manual_probability,
  projectIRR: db.project_irr,
  primaryPartnerId: db.primary_partner_id,
  reType: (db.re_type || []) as REType[],
  targetDecisionDate: db.target_decision_date ? new Date(db.target_decision_date) : undefined,
  companyName: db.company_name,

  // Thai Taxonomy Classification
  sector: db.sector || '',
  industry: db.industry || '',
  subIndustry: db.sub_industry || '',

  // --- INVESTOR PERSISTENCE FIELDS ---
  completedMilestones: db.completed_milestones || [], // Maps Quality Gates
  lostReason: db.lost_reason || '',                   // Maps Termination Reason
  operatingDays: db.operating_days || [],             // Maps Feature 1 (Load)
  daytimeLoadKW: db.daytime_load_kw || 0,             // Maps Feature 1 (Load)
  is24Hours: db.is_24_hours || false,
  bankabilityScore: db.bankability_score || 0,

  // Counterparty Risk Profile (Credit Committee)
  riskProfile: db.risk_profile as CounterpartyRisk | undefined,

  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});




export const fetchOpportunities = async (): Promise<Opportunity[]> => {
  const { data: opps, error } = await supabase.from('opportunities').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  const { data: links } = await supabase.from('opportunity_partners').select('opportunity_id, partner_id');
  const partnerMap = new Map<string, string[]>();
  (links || []).forEach(l => {
    if (!partnerMap.has(l.opportunity_id)) partnerMap.set(l.opportunity_id, []);
    partnerMap.get(l.opportunity_id)!.push(l.partner_id);
  });

  return (opps || []).map(o => toOpp(o, partnerMap.get(o.id) || []));
};

export const createOpportunity = async (opp: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Opportunity> => {
  const { linkedPartnerIds, ...rest } = opp;
  const { data, error } = await supabase.from('opportunities').insert({
    name: rest.name,
    account_id: toUuidOrNull(rest.accountId), // Convert empty string to null
    value: rest.value,
    stage: rest.stage,
    priority: rest.priority,
    owner_id: rest.ownerId,
    next_action: rest.nextAction,
    next_action_date: rest.nextActionDate?.toISOString(),
    clickup_link: rest.clickupLink,
    notes: rest.notes,
    max_capacity: rest.maxCapacity,
    target_capacity: rest.targetCapacity,
    ppa_term: rest.ppaTermYears,
    epc_cost: rest.epcCost,
    manual_probability: rest.manualProbability,
    project_irr: rest.projectIRR,
    primary_partner_id: toUuidOrNull(rest.primaryPartnerId),
    re_type: rest.reType,
    target_decision_date: rest.targetDecisionDate?.toISOString(),

    // Taxonomy
    sector: rest.sector || null,
    industry: rest.industry || null,
    sub_industry: rest.subIndustry || null,

    // Initial investor data
    completed_milestones: rest.completedMilestones || [],
    operating_days: rest.operatingDays || []
  }).select().single();

  if (error) throw error;
  if (linkedPartnerIds?.length) {
    await supabase.from('opportunity_partners').insert(linkedPartnerIds.map(pid => ({ opportunity_id: data.id, partner_id: pid })));
  }
  return toOpp(data, linkedPartnerIds);
};

export const updateOpportunity = async (id: string, updates: Partial<Opportunity>): Promise<Opportunity> => {
  const { linkedPartnerIds, nextActionDate, targetDecisionDate, ...rest } = updates;
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };

  // Standard Fields - Handle UUID fields specially to convert empty strings to null
  if (rest.name !== undefined) dbUpdates.name = rest.name;
  if (rest.accountId !== undefined) dbUpdates.account_id = toUuidOrNull(rest.accountId);
  if (rest.value !== undefined) dbUpdates.value = rest.value;
  if (rest.stage !== undefined) dbUpdates.stage = rest.stage;
  if (rest.priority !== undefined) dbUpdates.priority = rest.priority;
  if (rest.ownerId !== undefined) dbUpdates.owner_id = toUuidOrNull(rest.ownerId);
  if (rest.nextAction !== undefined) dbUpdates.next_action = rest.nextAction;
  if (rest.notes !== undefined) dbUpdates.notes = rest.notes;
  if (rest.maxCapacity !== undefined) dbUpdates.max_capacity = rest.maxCapacity;
  if (rest.targetCapacity !== undefined) dbUpdates.target_capacity = rest.targetCapacity;
  if (rest.ppaTermYears !== undefined) dbUpdates.ppa_term = rest.ppaTermYears;
  if (rest.epcCost !== undefined) dbUpdates.epc_cost = rest.epcCost;
  if (rest.manualProbability !== undefined) dbUpdates.manual_probability = rest.manualProbability;
  if (rest.projectIRR !== undefined) dbUpdates.project_irr = rest.projectIRR;
  if (rest.primaryPartnerId !== undefined) dbUpdates.primary_partner_id = toUuidOrNull(rest.primaryPartnerId);
  if (rest.reType !== undefined) dbUpdates.re_type = rest.reType;
  if (rest.clickupLink !== undefined) dbUpdates.clickup_link = rest.clickupLink;
  if (nextActionDate !== undefined) dbUpdates.next_action_date = nextActionDate?.toISOString() || null;
  if (targetDecisionDate !== undefined) dbUpdates.target_decision_date = targetDecisionDate?.toISOString() || null;
  
  // Thai Taxonomy - Allow null for empty strings
  if (rest.sector !== undefined) dbUpdates.sector = rest.sector || null;
  if (rest.industry !== undefined) dbUpdates.industry = rest.industry || null;
  if (rest.subIndustry !== undefined) dbUpdates.sub_industry = rest.subIndustry || null;

  // --- PERSISTENCE FOR INVESTOR HUB ---
  if (rest.completedMilestones !== undefined) dbUpdates.completed_milestones = rest.completedMilestones;
  if (rest.lostReason !== undefined) dbUpdates.lost_reason = rest.lostReason || null;
  if (rest.operatingDays !== undefined) dbUpdates.operating_days = rest.operatingDays;
  if (rest.daytimeLoadKW !== undefined) dbUpdates.daytime_load_kw = rest.daytimeLoadKW;
  if (rest.is24Hours !== undefined) dbUpdates.is_24_hours = rest.is24Hours;
  if (rest.bankabilityScore !== undefined) dbUpdates.bankability_score = rest.bankabilityScore;
  
  // Counterparty Risk Profile (Credit Committee)
  if (rest.riskProfile !== undefined) dbUpdates.risk_profile = rest.riskProfile;
  

  const { data, error } = await supabase.from('opportunities').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  
  // Handle partner links update
  if (linkedPartnerIds !== undefined) {
    await supabase.from('opportunity_partners').delete().eq('opportunity_id', id);
    if (linkedPartnerIds.length) {
      await supabase.from('opportunity_partners').insert(linkedPartnerIds.map(pid => ({ opportunity_id: id, partner_id: pid })));
    }
    return toOpp(data, linkedPartnerIds);
  }
  
  const { data: links } = await supabase.from('opportunity_partners').select('partner_id').eq('opportunity_id', id);
  const currentPartnerIds = (links || []).map(l => l.partner_id);
  return toOpp(data, currentPartnerIds);
};


export const deleteOpportunity = async (id: string): Promise<void> => {
  await supabase.from('opportunity_partners').delete().eq('opportunity_id', id);
  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) throw error;
};
