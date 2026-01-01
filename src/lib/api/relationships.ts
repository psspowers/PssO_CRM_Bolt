import { supabase } from '../supabase';
import { Relationship, RelationshipType, Strength } from '../../types/crm';
import { DbRelationship } from './types';

const toRelationship = (db: DbRelationship): Relationship => ({
  id: db.id, fromEntityId: db.from_entity_id,
  fromEntityType: db.from_entity_type as 'Contact' | 'Account' | 'Partner',
  toEntityId: db.to_entity_id,
  toEntityType: db.to_entity_type as 'Contact' | 'Account' | 'Partner',
  type: db.type as RelationshipType, strength: db.strength as Strength, notes: db.notes,
});

export const fetchRelationships = async (): Promise<Relationship[]> => {
  const { data, error } = await supabase.from('relationships').select('*');
  if (error) throw error;
  return (data || []).map(toRelationship);
};

export const fetchRelationshipsForEntity = async (entityId: string): Promise<Relationship[]> => {
  const { data, error } = await supabase.from('relationships')
    .select('*')
    .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
  if (error) throw error;
  return (data || []).map(toRelationship);
};

export const createRelationship = async (rel: Omit<Relationship, 'id'>): Promise<Relationship> => {
  const { data, error } = await supabase.from('relationships').insert({
    from_entity_id: rel.fromEntityId, from_entity_type: rel.fromEntityType,
    to_entity_id: rel.toEntityId, to_entity_type: rel.toEntityType,
    type: rel.type, strength: rel.strength, notes: rel.notes,
  }).select().single();
  if (error) throw error;
  return toRelationship(data);
};

export const updateRelationship = async (id: string, updates: Partial<Relationship>): Promise<Relationship> => {
  const dbUpdates: any = {};
  if (updates.fromEntityId) dbUpdates.from_entity_id = updates.fromEntityId;
  if (updates.fromEntityType) dbUpdates.from_entity_type = updates.fromEntityType;
  if (updates.toEntityId) dbUpdates.to_entity_id = updates.toEntityId;
  if (updates.toEntityType) dbUpdates.to_entity_type = updates.toEntityType;
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.strength) dbUpdates.strength = updates.strength;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  
  const { data, error } = await supabase.from('relationships').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  return toRelationship(data);
};

export const deleteRelationship = async (id: string): Promise<void> => {
  const { error } = await supabase.from('relationships').delete().eq('id', id);
  if (error) throw error;
};
