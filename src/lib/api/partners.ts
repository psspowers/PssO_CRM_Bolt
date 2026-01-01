import { supabase } from '../supabase';
import { Partner } from '../../types/crm';
import { DbPartner } from './types';

const toPartner = (db: DbPartner): Partner => ({
  id: db.id, name: db.name, region: db.region, country: db.country,
  ownerId: db.owner_id || '', email: db.email, phone: db.phone,
  clickupLink: db.clickup_link, notes: db.notes,
  createdAt: new Date(db.created_at), updatedAt: new Date(db.updated_at),
});

const toDb = (p: Partial<Partner>): Partial<DbPartner> => ({
  ...(p.name && { name: p.name }), ...(p.region && { region: p.region }),
  ...(p.country && { country: p.country }), ...(p.ownerId && { owner_id: p.ownerId }),
  ...(p.email && { email: p.email }), ...(p.phone && { phone: p.phone }),
  ...(p.clickupLink !== undefined && { clickup_link: p.clickupLink }),
  ...(p.notes !== undefined && { notes: p.notes }),
});

export const fetchPartners = async (): Promise<Partner[]> => {
  const { data, error } = await supabase.from('partners').select('*').order('name');
  if (error) throw error;
  return (data || []).map(toPartner);
};

export const createPartner = async (partner: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>): Promise<Partner> => {
  const { data, error } = await supabase.from('partners').insert(toDb(partner)).select().single();
  if (error) throw error;
  return toPartner(data);
};

export const updatePartner = async (id: string, updates: Partial<Partner>): Promise<Partner> => {
  const { data, error } = await supabase.from('partners').update({ ...toDb(updates), updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return toPartner(data);
};

export const deletePartner = async (id: string): Promise<void> => {
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) throw error;
};
