import { supabase } from './supabase';
import { PROJECT_IDS, ACCOUNT_IDS, USER_IDS, ACTIVITY_IDS, OPPORTUNITY_IDS, PARTNER_IDS, CONTACT_IDS } from './seedIds';

export const seedProjects = async () => {
  const projects = [
    { id: PROJECT_IDS.pr1, name: 'Vardhman 31.5 MWp Phase 1', linked_account_id: ACCOUNT_IDS.a2, country: 'India', capacity: 31.5, status: 'Engineering', owner_id: USER_IDS.u3, clickup_link: 'https://app.clickup.com/t/proj001', notes: 'Land acquisition complete' },
    { id: PROJECT_IDS.pr2, name: 'SM Mall of Asia Rooftop', linked_account_id: ACCOUNT_IDS.a4, country: 'Philippines', capacity: 5.2, status: 'Construction', owner_id: USER_IDS.u5, clickup_link: 'https://app.clickup.com/t/proj002', notes: 'Phase 1 of 15 sites' },
    { id: PROJECT_IDS.pr3, name: 'Tata Power Utility 100MW', linked_account_id: ACCOUNT_IDS.a2, country: 'India', capacity: 100, status: 'Operational', owner_id: USER_IDS.u1, clickup_link: 'https://app.clickup.com/t/proj003', notes: 'Flagship project' },
    { id: PROJECT_IDS.pr4, name: 'GreenWave Floating Solar 8MW', linked_account_id: ACCOUNT_IDS.a3, country: 'Vietnam', capacity: 8, status: 'Won', owner_id: USER_IDS.u2, notes: 'Reservoir installation' },
    { id: PROJECT_IDS.pr5, name: 'Central Retail Bangkok 3MW', linked_account_id: ACCOUNT_IDS.a8, country: 'Thailand', capacity: 3, status: 'Permit/EPC', owner_id: USER_IDS.u6, clickup_link: 'https://app.clickup.com/t/proj005', notes: 'First of 8 sites' },
  ];
  const { error } = await supabase.from('projects').upsert(projects, { onConflict: 'id' });
  if (error) throw error;
  return projects.length;
};

export const seedActivities = async () => {
  const activities = [
    { id: ACTIVITY_IDS.act1, type: 'Meeting', summary: 'Pricing negotiation with BDx leadership', details: 'Discussed final pricing terms. CEO positive on timeline. Need to address BESS costs.', related_to_id: OPPORTUNITY_IDS.o1, related_to_type: 'Opportunity', created_by_id: USER_IDS.u1, tags: ['pricing', 'executive'] },
    { id: ACTIVITY_IDS.act2, type: 'Call', summary: 'Follow-up with Sunita on proposal feedback', details: 'CFO requested revised payment terms. Will discuss with finance team.', related_to_id: OPPORTUNITY_IDS.o2, related_to_type: 'Opportunity', created_by_id: USER_IDS.u3, tags: ['follow-up'] },
    { id: ACTIVITY_IDS.act3, type: 'Site Visit', summary: 'Vardhman site assessment complete', details: 'Rooftop structural analysis done. 31.5 MWp capacity confirmed.', related_to_id: PROJECT_IDS.pr1, related_to_type: 'Project', created_by_id: USER_IDS.u3, tags: ['technical'] },
    { id: ACTIVITY_IDS.act4, type: 'WhatsApp', summary: 'Quick update from Maria Santos', details: 'Board meeting moved to Dec 8. She is confident about approval.', related_to_id: OPPORTUNITY_IDS.o4, related_to_type: 'Opportunity', created_by_id: USER_IDS.u5 },
    { id: ACTIVITY_IDS.act5, type: 'Email', summary: 'Contract draft sent to Foxconn legal', details: 'Sent v3 of PPA contract. Please follow up on insurance clause.', related_to_id: OPPORTUNITY_IDS.o6, related_to_type: 'Opportunity', created_by_id: USER_IDS.u1, tags: ['legal', 'contract'] },
    { id: ACTIVITY_IDS.act6, type: 'Note', summary: 'Regulatory update for India projects', details: 'New MNRE guidelines released. May impact Vardhman timeline.', related_to_id: ACCOUNT_IDS.a2, related_to_type: 'Account', created_by_id: USER_IDS.u6, tags: ['regulatory', 'policy'] },
    { id: ACTIVITY_IDS.act7, type: 'Photo', summary: 'SM Mall of Asia installation progress', details: 'Phase 1 panels 60% installed. On track for Dec completion.', related_to_id: PROJECT_IDS.pr2, related_to_type: 'Project', created_by_id: USER_IDS.u5 },
    { id: ACTIVITY_IDS.act8, type: 'Document', summary: 'PTT GC feasibility study uploaded', details: 'Initial feasibility report for 20MW ground-mount.', related_to_id: OPPORTUNITY_IDS.o5, related_to_type: 'Opportunity', created_by_id: USER_IDS.u6, clickup_link: 'https://app.clickup.com/t/doc001' },
    { id: ACTIVITY_IDS.act9, type: 'Meeting', summary: 'Partner alignment call with GreenWave', details: 'Discussed Vietnam market strategy. Floating solar focus for Q1 2025.', related_to_id: PARTNER_IDS.p2, related_to_type: 'Partner', created_by_id: USER_IDS.u2, tags: ['partner', 'strategy'] },
    { id: ACTIVITY_IDS.act10, type: 'Call', summary: 'ERC update from Rajesh Khanna', details: 'New open access regulations expected in Jan.', related_to_id: CONTACT_IDS.c6, related_to_type: 'Contact', created_by_id: USER_IDS.u1, tags: ['regulatory'] },
    { id: ACTIVITY_IDS.act11, type: 'Meeting', summary: 'Quarterly review with Tata Power', details: 'Reviewed project performance. 100MW project exceeding targets.', related_to_id: PROJECT_IDS.pr3, related_to_type: 'Project', created_by_id: USER_IDS.u1, tags: ['review'] },
    { id: ACTIVITY_IDS.act12, type: 'Email', summary: 'Central Retail contract finalization', details: 'Final terms agreed. Ready for signature next week.', related_to_id: PROJECT_IDS.pr5, related_to_type: 'Project', created_by_id: USER_IDS.u6, tags: ['contract'] },
  ];
  const { error } = await supabase.from('activities').upsert(activities, { onConflict: 'id' });
  if (error) throw error;
  return activities.length;
};
