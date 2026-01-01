import { supabase } from '../supabase';
import { User, UserRole } from '../../types/crm';
import { DbUser } from './types';

const toUser = (db: DbUser): User => ({
  id: db.id,
  name: db.name,
  email: db.email,
  role: db.role as UserRole,
  avatar: db.avatar,
  badges: db.badges || [],
  reportsTo: db.reports_to || undefined
});

export const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('crm_users')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data || []).map(toUser);
};
