import { supabase } from '../supabase';
import { Activity, ActivityType } from '../../types/crm';
import { DbActivity } from './types';

const toActivity = (db: DbActivity): Activity => ({
  id: db.id, 
  type: db.type as ActivityType, 
  summary: db.summary, 
  details: db.details,
  relatedToId: db.related_to_id,
  relatedToType: db.related_to_type as 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project',
  createdById: db.created_by,  // Map from 'created_by' column
  createdAt: new Date(db.created_at),
  attachments: db.attachments, 
  tags: db.tags, 
  clickupLink: db.clickup_link,
  // Task fields
  isTask: db.is_task,
  assignedToId: db.assigned_to_id,
  dueDate: db.due_date ? new Date(db.due_date) : undefined,
  taskStatus: db.task_status as 'Pending' | 'Completed' | undefined,
  priority: db.priority as 'Low' | 'Medium' | 'High' | undefined,
});

export const fetchActivities = async (): Promise<Activity[]> => {
  const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toActivity);
};

export const fetchActivitiesForEntity = async (entityId: string, entityType: string): Promise<Activity[]> => {
  const { data, error } = await supabase.from('activities')
    .select('*')
    .eq('related_to_id', entityId)
    .eq('related_to_type', entityType)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toActivity);
};

export const createActivity = async (activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> => {
  const insertData: Record<string, any> = {
    type: activity.type, 
    summary: activity.summary, 
    details: activity.details,
    related_to_id: activity.relatedToId, 
    related_to_type: activity.relatedToType,
    created_by: activity.createdById,  // Use 'created_by' to match database column
    attachments: activity.attachments,
    tags: activity.tags, 
    clickup_link: activity.clickupLink,
  };

  // Add task fields if this is a task
  if (activity.isTask) {
    insertData.is_task = activity.isTask;
    insertData.assigned_to_id = activity.assignedToId;
    insertData.due_date = activity.dueDate?.toISOString();
    insertData.task_status = activity.taskStatus;
    insertData.priority = activity.priority;
  }

  const { data, error } = await supabase.from('activities').insert(insertData).select().single();
  if (error) {
    console.error('Error creating activity:', JSON.stringify(error));
    throw error;
  }
  return toActivity(data);
};

export const updateActivity = async (id: string, updates: Partial<Activity>): Promise<Activity> => {
  const dbUpdates: any = {};
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.summary) dbUpdates.summary = updates.summary;
  if (updates.details !== undefined) dbUpdates.details = updates.details;
  if (updates.attachments) dbUpdates.attachments = updates.attachments;
  if (updates.tags) dbUpdates.tags = updates.tags;
  if (updates.clickupLink !== undefined) dbUpdates.clickup_link = updates.clickupLink;
  
  // Task fields
  if (updates.isTask !== undefined) dbUpdates.is_task = updates.isTask;
  if (updates.assignedToId !== undefined) dbUpdates.assigned_to_id = updates.assignedToId;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate?.toISOString();
  if (updates.taskStatus !== undefined) dbUpdates.task_status = updates.taskStatus;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  
  const { data, error } = await supabase.from('activities').update(dbUpdates).eq('id', id).select().single();
  if (error) {
    console.error('Error updating activity:', JSON.stringify(error));
    throw error;
  }
  return toActivity(data);
};

export const deleteActivity = async (id: string): Promise<void> => {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) {
    console.error('Error deleting activity:', JSON.stringify(error));
    throw error;
  }
};

export const toggleReaction = async (
  activityId: string,
  userId: string,
  reactionType: string = 'like'
): Promise<Record<string, string>> => {
  const { data: activity, error: fetchError } = await supabase
    .from('activities')
    .select('reactions')
    .eq('id', activityId)
    .single();

  if (fetchError) throw fetchError;

  const currentReactions = (activity?.reactions as Record<string, string>) || {};
  const newReactions = { ...currentReactions };

  if (newReactions[userId]) {
    delete newReactions[userId];
  } else {
    newReactions[userId] = reactionType;
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ reactions: newReactions })
    .eq('id', activityId)
    .select('reactions')
    .single();

  if (error) throw error;

  return (data?.reactions as Record<string, string>) || {};
};
