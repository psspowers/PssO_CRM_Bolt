import { supabase } from '../supabase';
import { Project, ProjectStatus } from '../../types/crm';
import { DbProject } from './types';

const toProject = (db: DbProject, partnerIds: string[] = []): Project => ({
  id: db.id, name: db.name, linkedAccountId: db.linked_account_id, country: db.country,
  // Support both old (capacity_mw) and new (capacity) column names
  capacity: Number(db.capacity ?? db.capacity_mw) || 0,
  status: db.status as ProjectStatus, ownerId: db.owner_id,
  linkedPartnerIds: partnerIds, clickupLink: db.clickup_link, notes: db.notes,
  createdAt: new Date(db.created_at), updatedAt: new Date(db.updated_at),
});




export const fetchProjects = async (): Promise<Project[]> => {
  const { data: projects, error } = await supabase.from('projects').select('*').order('name');
  if (error) throw error;
  const { data: links } = await supabase.from('project_partners').select('project_id, partner_id');
  const partnerMap = new Map<string, string[]>();
  (links || []).forEach(l => {
    if (!partnerMap.has(l.project_id)) partnerMap.set(l.project_id, []);
    partnerMap.get(l.project_id)!.push(l.partner_id);
  });
  return (projects || []).map(p => toProject(p, partnerMap.get(p.id) || []));
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
  const { linkedPartnerIds, ...rest } = project;
  const { data, error } = await supabase.from('projects').insert({
    name: rest.name, linked_account_id: rest.linkedAccountId, country: rest.country,
    capacity: rest.capacity, status: rest.status, owner_id: rest.ownerId,
    clickup_link: rest.clickupLink, notes: rest.notes,
  }).select().single();
  if (error) throw error;
  if (linkedPartnerIds?.length) {
    await supabase.from('project_partners').insert(linkedPartnerIds.map(pid => ({ project_id: data.id, partner_id: pid })));
  }
  return toProject(data, linkedPartnerIds);
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project> => {
  const { linkedPartnerIds, ...rest } = updates;
  const dbUpdates: any = { updated_at: new Date().toISOString() };
  if (rest.name !== undefined) dbUpdates.name = rest.name;
  if (rest.linkedAccountId !== undefined) dbUpdates.linked_account_id = rest.linkedAccountId;
  if (rest.country !== undefined) dbUpdates.country = rest.country;
  if (rest.capacity !== undefined) dbUpdates.capacity = rest.capacity;
  if (rest.status !== undefined) dbUpdates.status = rest.status;
  if (rest.ownerId !== undefined) dbUpdates.owner_id = rest.ownerId;
  if (rest.clickupLink !== undefined) dbUpdates.clickup_link = rest.clickupLink;
  if (rest.notes !== undefined) dbUpdates.notes = rest.notes;
  
  const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', id).select().single();
  if (error) throw error;
  
  // Handle partner links update
  if (linkedPartnerIds !== undefined) {
    await supabase.from('project_partners').delete().eq('project_id', id);
    if (linkedPartnerIds.length) {
      await supabase.from('project_partners').insert(linkedPartnerIds.map(pid => ({ project_id: id, partner_id: pid })));
    }
    return toProject(data, linkedPartnerIds);
  }
  
  // If linkedPartnerIds not provided, fetch current links
  const { data: links } = await supabase.from('project_partners').select('partner_id').eq('project_id', id);
  const currentPartnerIds = (links || []).map(l => l.partner_id);
  return toProject(data, currentPartnerIds);
};


export const deleteProject = async (id: string): Promise<void> => {
  await supabase.from('project_partners').delete().eq('project_id', id);
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};
