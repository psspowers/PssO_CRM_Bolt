import { supabase } from './supabase';
import { PARTNER_IDS, USER_IDS, ACCOUNT_IDS } from './seedIds';

export const seedPartners = async () => {
  const partners = [
    { id: PARTNER_IDS.p1, name: 'SunTech Energy Partners', region: 'South Asia', country: 'India', pss_orange_owner: USER_IDS.u1, partner_owner: USER_IDS.u2, email: 'contact@suntech.in', phone: '+91 98765 43210', clickup_link: 'https://app.clickup.com/t/abc123', notes: 'Strategic partner for rooftop installations' },
    { id: PARTNER_IDS.p2, name: 'GreenWave Solutions', region: 'Southeast Asia', country: 'Vietnam', pss_orange_owner: USER_IDS.u3, partner_owner: USER_IDS.u1, email: 'info@greenwave.vn', phone: '+84 123 456 789', clickup_link: 'https://app.clickup.com/t/def456', notes: 'Expanding into floating solar' },
    { id: PARTNER_IDS.p3, name: 'EcoSolar Philippines', region: 'Southeast Asia', country: 'Philippines', pss_orange_owner: USER_IDS.u2, partner_owner: USER_IDS.u5, email: 'hello@ecosolar.ph', phone: '+63 912 345 6789', notes: 'Strong government connections' },
    { id: PARTNER_IDS.p4, name: 'Tata Power Solar', region: 'South Asia', country: 'India', pss_orange_owner: USER_IDS.u1, partner_owner: USER_IDS.u3, email: 'solar@tatapower.com', phone: '+91 22 6665 8282', clickup_link: 'https://app.clickup.com/t/ghi789', notes: 'Major EPC partner' },
    { id: PARTNER_IDS.p5, name: 'Thai Solar Energy', region: 'Southeast Asia', country: 'Thailand', pss_orange_owner: USER_IDS.u5, partner_owner: USER_IDS.u2, email: 'contact@thaisolar.co.th', phone: '+66 2 123 4567', notes: 'Industrial focus' },
    { id: PARTNER_IDS.p6, name: 'BDx Data Centers', region: 'Asia Pacific', country: 'Singapore', pss_orange_owner: USER_IDS.u1, partner_owner: USER_IDS.u6, email: 'energy@bdx.sg', phone: '+65 6789 0123', clickup_link: 'https://app.clickup.com/t/jkl012', notes: 'Key data center client' },
  ];
  const { error } = await supabase.from('partners').upsert(partners, { onConflict: 'id' });
  if (error) throw error;
  return partners.length;
};

export const seedAccountPartners = async () => {
  const accountPartners = [
    { account_id: ACCOUNT_IDS.a1, partner_id: PARTNER_IDS.p6 },
    { account_id: ACCOUNT_IDS.a2, partner_id: PARTNER_IDS.p1 },
    { account_id: ACCOUNT_IDS.a2, partner_id: PARTNER_IDS.p4 },
    { account_id: ACCOUNT_IDS.a3, partner_id: PARTNER_IDS.p2 },
    { account_id: ACCOUNT_IDS.a4, partner_id: PARTNER_IDS.p3 },
    { account_id: ACCOUNT_IDS.a5, partner_id: PARTNER_IDS.p5 },
    { account_id: ACCOUNT_IDS.a6, partner_id: PARTNER_IDS.p1 },
    { account_id: ACCOUNT_IDS.a7, partner_id: PARTNER_IDS.p2 },
    { account_id: ACCOUNT_IDS.a8, partner_id: PARTNER_IDS.p5 },
  ];
  await supabase.from('account_partners').delete().neq('account_id', '00000000-0000-0000-0000-000000000000');
  const { error } = await supabase.from('account_partners').insert(accountPartners);
  if (error) throw error;
  return accountPartners.length;
};
