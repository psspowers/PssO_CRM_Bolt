import { supabase } from '../supabase';
import { Account, Priority } from '../../types/crm';
import { DbAccount } from './types';

const toAccount = (db: any, partnerIds: string[] = []): Account => ({
  id: db.id,
  name: db.name,
  country: db.country,
  sector: db.sector || '',
  industry: db.industry || '',
  subIndustry: db.sub_industry || '',
  linkedPartnerIds: partnerIds,
  strategicImportance: db.strategic_importance as Priority,
  clickupLink: db.clickup_link,
  notes: db.notes,
  ownerId: db.owner_id,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
  totalDeals: db.totalDeals,
  totalMW: db.totalMW,
  totalValue: db.totalValue,
  teamSize: db.teamSize,
});

export const fetchAccounts = async (): Promise<Account[]> => {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select(`
      *,
      opportunities(id, value, target_capacity, stage),
      contacts(count)
    `)
    .order('name');
  if (error) throw error;

  const { data: links } = await supabase.from('account_partners').select('account_id, partner_id');
  const partnerMap = new Map<string, string[]>();
  (links || []).forEach(l => {
    if (!partnerMap.has(l.account_id)) partnerMap.set(l.account_id, []);
    partnerMap.get(l.account_id)!.push(l.partner_id);
  });

  return (accounts || []).map(a => {
    const opportunities = a.opportunities || [];
    const activeOpps = opportunities.filter((o: any) => !['Lost'].includes(o.stage));

    const totalDeals = activeOpps.length;
    const totalMW = activeOpps.reduce((sum: number, o: any) => sum + (Number(o.target_capacity) || 0), 0);
    const totalValue = activeOpps.reduce((sum: number, o: any) => sum + (Number(o.value) || 0), 0);
    const teamSize = a.contacts?.[0]?.count || 0;

    return toAccount({
      ...a,
      totalDeals,
      totalMW,
      totalValue,
      teamSize
    }, partnerMap.get(a.id) || []);
  });
};

export const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
  const { linkedPartnerIds, ...rest } = account;
  const { data, error } = await supabase.from('accounts').insert({
    name: rest.name,
    country: rest.country,
    sector: rest.sector,
    industry: rest.industry,
    sub_industry: rest.subIndustry,
    strategic_importance: rest.strategicImportance,
    clickup_link: rest.clickupLink,
    notes: rest.notes,
    owner_id: rest.ownerId,
  }).select().single();
  if (error) throw error;
  
  if (linkedPartnerIds?.length) {
    await supabase.from('account_partners').insert(linkedPartnerIds.map(pid => ({ account_id: data.id, partner_id: pid })));
  }
  return toAccount(data, linkedPartnerIds);
};

export const updateAccount = async (id: string, updates: Partial<Account>): Promise<Account> => {
  const { linkedPartnerIds, ...rest } = updates;
  const dbUpdates: any = { updated_at: new Date().toISOString() };
  
  if (rest.name !== undefined) dbUpdates.name = rest.name;
  if (rest.country !== undefined) dbUpdates.country = rest.country;
  if (rest.sector !== undefined) dbUpdates.sector = rest.sector;
  if (rest.industry !== undefined) dbUpdates.industry = rest.industry;
  if (rest.subIndustry !== undefined) dbUpdates.sub_industry = rest.subIndustry;
  if (rest.strategicImportance !== undefined) dbUpdates.strategic_importance = rest.strategicImportance;
  if (rest.clickupLink !== undefined) dbUpdates.clickup_link = rest.clickupLink;
  if (rest.notes !== undefined) dbUpdates.notes = rest.notes;
  
  const { data, error } = await supabase.from('accounts').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  
  // Handle partner links update
  if (linkedPartnerIds !== undefined) {
    await supabase.from('account_partners').delete().eq('account_id', id);
    if (linkedPartnerIds.length) {
      await supabase.from('account_partners').insert(linkedPartnerIds.map(pid => ({ account_id: id, partner_id: pid })));
    }
    return toAccount(data, linkedPartnerIds);
  }
  
  // If linkedPartnerIds not provided, fetch current links
  const { data: links } = await supabase.from('account_partners').select('partner_id').eq('account_id', id);
  const currentPartnerIds = (links || []).map(l => l.partner_id);
  return toAccount(data, currentPartnerIds);
};


export const deleteAccount = async (id: string): Promise<void> => {
  await supabase.from('account_partners').delete().eq('account_id', id);
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
};
