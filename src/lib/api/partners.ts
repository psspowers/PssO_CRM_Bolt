import { supabase } from '../supabase';
import { Partner } from '../../types/crm';
import { DbAccount } from './types';

const toPartner = (db: DbAccount): Partner => ({
  id: db.id,
  name: db.name,
  region: db.state || '',
  country: db.country,
  ownerId: db.owner_id || '',
  email: db.email || '',
  phone: db.phone || '',
  partnerType: db.industry,
  companyName: db.name,
  clickupLink: db.clickup_link,
  notes: db.notes,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

const toDb = (p: Partial<Partner>): Partial<DbAccount> => ({
  ...(p.name && { name: p.name }),
  ...(p.region && { state: p.region }),
  ...(p.country && { country: p.country }),
  ...(p.ownerId && { owner_id: p.ownerId }),
  ...(p.email && { email: p.email }),
  ...(p.phone && { phone: p.phone }),
  ...(p.partnerType !== undefined && { industry: p.partnerType }),
  ...(p.clickupLink !== undefined && { clickup_link: p.clickupLink }),
  ...(p.notes !== undefined && { notes: p.notes }),
  type: 'Partner',
});

export const fetchPartners = async (): Promise<Partner[]> => {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('type', 'Partner')
    .order('name');
  if (error) throw error;
  return (data || []).map(toPartner);
};

export const createPartner = async (partner: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>): Promise<Partner> => {
  const { data, error } = await supabase
    .from('accounts')
    .insert(toDb(partner))
    .select()
    .single();
  if (error) throw error;
  return toPartner(data);
};

export const updatePartner = async (id: string, updates: Partial<Partner>): Promise<Partner> => {
  const { data, error } = await supabase
    .from('accounts')
    .update({ ...toDb(updates), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('type', 'Partner')
    .select()
    .single();
  if (error) throw error;
  return toPartner(data);
};

export const deletePartner = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('type', 'Partner');
  if (error) throw error;
};
