import { supabase } from '../supabase';
import { Contact, ContactTag } from '../../types/crm';
import { DbContact } from './types';

const toContact = (db: DbContact): Contact => ({
  id: db.id, fullName: db.full_name, role: db.role,
  accountId: db.account_id, partnerId: db.partner_id,
  email: db.email, phone: db.phone, country: db.country, city: db.city,
  tags: (db.tags || []) as ContactTag[], relationshipNotes: db.relationship_notes,
  clickupLink: db.clickup_link, avatar: db.avatar,
  createdAt: new Date(db.created_at), updatedAt: new Date(db.updated_at),
});

export const fetchContacts = async (): Promise<Contact[]> => {
  const { data, error } = await supabase.from('contacts').select('*').order('full_name');
  if (error) throw error;
  return (data || []).map(toContact);
};

export const createContact = async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> => {
  const { data, error } = await supabase.from('contacts').insert({
    full_name: contact.fullName, role: contact.role,
    account_id: contact.accountId, partner_id: contact.partnerId,
    email: contact.email, phone: contact.phone, country: contact.country, city: contact.city,
    tags: contact.tags, relationship_notes: contact.relationshipNotes,
    clickup_link: contact.clickupLink, avatar: contact.avatar,
  }).select().single();
  if (error) throw error;
  return toContact(data);
};

export const updateContact = async (id: string, updates: Partial<Contact>): Promise<Contact> => {
  const dbUpdates: any = { updated_at: new Date().toISOString() };
  if (updates.fullName) dbUpdates.full_name = updates.fullName;
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
  if (updates.partnerId !== undefined) dbUpdates.partner_id = updates.partnerId;
  if (updates.email) dbUpdates.email = updates.email;
  if (updates.phone) dbUpdates.phone = updates.phone;
  if (updates.country) dbUpdates.country = updates.country;
  if (updates.city) dbUpdates.city = updates.city;
  if (updates.tags) dbUpdates.tags = updates.tags;
  if (updates.relationshipNotes !== undefined) dbUpdates.relationship_notes = updates.relationshipNotes;
  if (updates.clickupLink !== undefined) dbUpdates.clickup_link = updates.clickupLink;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  
  const { data, error } = await supabase.from('contacts').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  return toContact(data);
};

export const deleteContact = async (id: string): Promise<void> => {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
};
