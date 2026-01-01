import { supabase } from '../supabase';

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export async function getSystemSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching system setting ${key}:`, error);
    return null;
  }

  return data?.value || null;
}

export async function getAllSystemSettings(): Promise<SystemSetting[]> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .order('key');

  if (error) {
    console.error('Error fetching system settings:', error);
    return [];
  }

  return data || [];
}

export async function updateSystemSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('system_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    console.error(`Error updating system setting ${key}:`, error);
    return false;
  }

  return true;
}

export async function getCompanyLogoUrl(): Promise<string | null> {
  return getSystemSetting('company_logo_url');
}

export async function getCompanyName(): Promise<string | null> {
  return getSystemSetting('company_name');
}

export async function getEmailSignature(): Promise<string | null> {
  return getSystemSetting('email_signature');
}
