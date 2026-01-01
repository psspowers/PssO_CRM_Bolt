import { supabase } from './supabase';
import { USER_IDS, ACCOUNT_IDS } from './seedIds';

export const seedUsers = async () => {
  const users = [
    { id: USER_IDS.u1, name: 'Raj Sharma', email: 'raj@berdepss.com', role: 'admin', avatar: 'https://d64gsuwffb70l.cloudfront.net/692f0ace1e8f930d71bf9363_1764714000704_8bc8d1c3.webp', badges: ['Deal Closer', 'Network Builder', 'Early Adopter'] },
    { id: USER_IDS.u2, name: 'Priya Patel', email: 'priya@berdepss.com', role: 'internal', avatar: 'https://d64gsuwffb70l.cloudfront.net/692f0ace1e8f930d71bf9363_1764714007309_74a64cd5.webp', badges: ['Activity Star', 'Connector'] },
    { id: USER_IDS.u3, name: 'Amit Kumar', email: 'amit@berdepss.com', role: 'internal', avatar: 'https://d64gsuwffb70l.cloudfront.net/692f0ace1e8f930d71bf9363_1764714002604_97b62ad2.webp', badges: ['Deal Closer'] },
    { id: USER_IDS.u4, name: 'Meera Singh', email: 'meera@partner.com', role: 'external', avatar: 'https://d64gsuwffb70l.cloudfront.net/692f0ace1e8f930d71bf9363_1764714009216_55a28475.webp', badges: ['Partner Champion'] },
    { id: USER_IDS.u5, name: 'Vikram Reddy', email: 'vikram@berdepss.com', role: 'internal', avatar: 'https://d64gsuwffb70l.cloudfront.net/692f0ace1e8f930d71bf9363_1764714004537_59eca681.webp', badges: ['Network Builder'] },
    { id: USER_IDS.u6, name: 'Ananya Gupta', email: 'ananya@berdepss.com', role: 'internal', avatar: 'https://d64gsuwffb70l.cloudfront.net/692f0ace1e8f930d71bf9363_1764714011105_a8ffb87c.webp', badges: ['Activity Star', 'Deal Closer'] },
  ];
  const { error } = await supabase.from('crm_users').upsert(users, { onConflict: 'id' });
  if (error) throw error;
  return users.length;
};

export const seedAccounts = async () => {
  const accounts = [
    { id: ACCOUNT_IDS.a1, name: 'BDx Data Centers', country: 'Singapore', sector: 'Data Center', strategic_importance: 'High', clickup_link: 'https://app.clickup.com/t/acc001', notes: '50MW DPPA opportunity' },
    { id: ACCOUNT_IDS.a2, name: 'Vardhman Textiles', country: 'India', sector: 'Textile', strategic_importance: 'High', clickup_link: 'https://app.clickup.com/t/acc002', notes: 'Multi-phase project' },
    { id: ACCOUNT_IDS.a3, name: 'Vinamilk', country: 'Vietnam', sector: 'Food', strategic_importance: 'Medium', notes: 'Interested in rooftop solar' },
    { id: ACCOUNT_IDS.a4, name: 'SM Supermalls', country: 'Philippines', sector: 'Mall', strategic_importance: 'High', clickup_link: 'https://app.clickup.com/t/acc004', notes: '15 mall locations' },
    { id: ACCOUNT_IDS.a5, name: 'PTT Global Chemical', country: 'Thailand', sector: 'Chemical', strategic_importance: 'High', notes: 'Large industrial complex' },
    { id: ACCOUNT_IDS.a6, name: 'Mahindra University', country: 'India', sector: 'University', strategic_importance: 'Medium', notes: 'Campus solar project' },
    { id: ACCOUNT_IDS.a7, name: 'Foxconn Vietnam', country: 'Vietnam', sector: 'Industrial', strategic_importance: 'High', clickup_link: 'https://app.clickup.com/t/acc007', notes: 'Manufacturing facility' },
    { id: ACCOUNT_IDS.a8, name: 'Central Retail', country: 'Thailand', sector: 'Mall', strategic_importance: 'Medium', notes: '8 locations interested' },
  ];
  const { error } = await supabase.from('accounts').upsert(accounts, { onConflict: 'id' });
  if (error) throw error;
  return accounts.length;
};
