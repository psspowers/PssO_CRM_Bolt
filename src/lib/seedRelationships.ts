import { supabase } from './supabase';
import { RELATIONSHIP_IDS, CONTACT_IDS, ACCOUNT_IDS, PARTNER_IDS, OPPORTUNITY_IDS, PROJECT_IDS } from './seedIds';

export const seedRelationships = async () => {
  const relationships = [
    { id: RELATIONSHIP_IDS.r1, from_entity_id: CONTACT_IDS.c1, from_entity_type: 'Contact', to_entity_id: ACCOUNT_IDS.a1, to_entity_type: 'Account', type: 'Works At', strength: 'Strong', notes: 'VP level decision maker' },
    { id: RELATIONSHIP_IDS.r2, from_entity_id: CONTACT_IDS.c2, from_entity_type: 'Contact', to_entity_id: ACCOUNT_IDS.a2, to_entity_type: 'Account', type: 'Works At', strength: 'Strong', notes: 'CFO with budget authority' },
    { id: RELATIONSHIP_IDS.r3, from_entity_id: CONTACT_IDS.c6, from_entity_type: 'Contact', to_entity_id: CONTACT_IDS.c2, to_entity_type: 'Contact', type: 'Friend', strength: 'Medium', notes: 'College alumni connection' },
    { id: RELATIONSHIP_IDS.r4, from_entity_id: CONTACT_IDS.c7, from_entity_type: 'Contact', to_entity_id: CONTACT_IDS.c2, to_entity_type: 'Contact', type: 'Banker', strength: 'Strong', notes: 'Handles Vardhman financing' },
    { id: RELATIONSHIP_IDS.r5, from_entity_id: CONTACT_IDS.c6, from_entity_type: 'Contact', to_entity_id: PARTNER_IDS.p1, to_entity_type: 'Partner', type: 'Advisor To', strength: 'Strong', notes: 'Regulatory guidance' },
    { id: RELATIONSHIP_IDS.r6, from_entity_id: CONTACT_IDS.c8, from_entity_type: 'Contact', to_entity_id: CONTACT_IDS.c1, to_entity_type: 'Contact', type: 'Works At', strength: 'Strong', notes: 'Same company, legal team' },
    { id: RELATIONSHIP_IDS.r7, from_entity_id: CONTACT_IDS.c7, from_entity_type: 'Contact', to_entity_id: PARTNER_IDS.p4, to_entity_type: 'Partner', type: 'Banker', strength: 'Strong', notes: 'Tata Power financing lead' },
    { id: RELATIONSHIP_IDS.r8, from_entity_id: CONTACT_IDS.c3, from_entity_type: 'Contact', to_entity_id: ACCOUNT_IDS.a3, to_entity_type: 'Account', type: 'Works At', strength: 'Medium', notes: 'Energy department' },
    { id: RELATIONSHIP_IDS.r9, from_entity_id: CONTACT_IDS.c4, from_entity_type: 'Contact', to_entity_id: ACCOUNT_IDS.a4, to_entity_type: 'Account', type: 'Works At', strength: 'Strong', notes: 'Key procurement contact' },
    { id: RELATIONSHIP_IDS.r10, from_entity_id: CONTACT_IDS.c5, from_entity_type: 'Contact', to_entity_id: ACCOUNT_IDS.a5, to_entity_type: 'Account', type: 'Works At', strength: 'Medium', notes: 'Plant operations' },
    { id: RELATIONSHIP_IDS.r11, from_entity_id: CONTACT_IDS.c6, from_entity_type: 'Contact', to_entity_id: CONTACT_IDS.c7, to_entity_type: 'Contact', type: 'Introduced By', strength: 'Medium', notes: 'Rajesh introduced Anita for BOI' },
    { id: RELATIONSHIP_IDS.r12, from_entity_id: CONTACT_IDS.c1, from_entity_type: 'Contact', to_entity_id: CONTACT_IDS.c4, to_entity_type: 'Contact', type: 'Friend', strength: 'Weak', notes: 'Met at ASEAN summit' },
    { id: RELATIONSHIP_IDS.r13, from_entity_id: PARTNER_IDS.p1, from_entity_type: 'Partner', to_entity_id: PARTNER_IDS.p4, to_entity_type: 'Partner', type: 'JV Partner', strength: 'Strong', notes: 'Joint India projects' },
    { id: RELATIONSHIP_IDS.r14, from_entity_id: CONTACT_IDS.c7, from_entity_type: 'Contact', to_entity_id: ACCOUNT_IDS.a2, to_entity_type: 'Account', type: 'Banker', strength: 'Strong', notes: 'Project financing' },
  ];
  const { error } = await supabase.from('relationships').upsert(relationships, { onConflict: 'id' });
  if (error) throw error;
  return relationships.length;
};

export const seedOpportunityPartners = async () => {
  const oppPartners = [
    { opportunity_id: OPPORTUNITY_IDS.o1, partner_id: PARTNER_IDS.p6 },
    { opportunity_id: OPPORTUNITY_IDS.o2, partner_id: PARTNER_IDS.p1 },
    { opportunity_id: OPPORTUNITY_IDS.o2, partner_id: PARTNER_IDS.p4 },
    { opportunity_id: OPPORTUNITY_IDS.o3, partner_id: PARTNER_IDS.p2 },
    { opportunity_id: OPPORTUNITY_IDS.o4, partner_id: PARTNER_IDS.p3 },
    { opportunity_id: OPPORTUNITY_IDS.o5, partner_id: PARTNER_IDS.p5 },
    { opportunity_id: OPPORTUNITY_IDS.o6, partner_id: PARTNER_IDS.p2 },
    { opportunity_id: OPPORTUNITY_IDS.o7, partner_id: PARTNER_IDS.p5 },
    { opportunity_id: OPPORTUNITY_IDS.o8, partner_id: PARTNER_IDS.p1 },
    { opportunity_id: OPPORTUNITY_IDS.o9, partner_id: PARTNER_IDS.p2 },
    { opportunity_id: OPPORTUNITY_IDS.o10, partner_id: PARTNER_IDS.p3 },
  ];
  await supabase.from('opportunity_partners').delete().neq('opportunity_id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('opportunity_partners').insert(oppPartners);
  if (error) throw error;
  return oppPartners.length;
};

export const seedProjectPartners = async () => {
  const projPartners = [
    { project_id: PROJECT_IDS.pr1, partner_id: PARTNER_IDS.p1 },
    { project_id: PROJECT_IDS.pr1, partner_id: PARTNER_IDS.p4 },
    { project_id: PROJECT_IDS.pr2, partner_id: PARTNER_IDS.p3 },
    { project_id: PROJECT_IDS.pr3, partner_id: PARTNER_IDS.p4 },
    { project_id: PROJECT_IDS.pr4, partner_id: PARTNER_IDS.p2 },
    { project_id: PROJECT_IDS.pr5, partner_id: PARTNER_IDS.p5 },
  ];
  await supabase.from('project_partners').delete().neq('project_id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('project_partners').insert(projPartners);
  if (error) throw error;
  return projPartners.length;
};
