import { supabase } from '../supabase';

export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  contentType?: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return { url: null, error };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (err) {
    console.error('Error in uploadFile:', err);
    return { url: null, error: err as Error };
  }
}

export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error('Error deleting file:', error);
    return false;
  }

  return true;
}

export async function listFiles(bucket: string, path: string = ''): Promise<any[]> {
  const { data, error } = await supabase.storage.from(bucket).list(path);

  if (error) {
    console.error('Error listing files:', error);
    return [];
  }

  return data || [];
}

export function getCompanyLogoUrl(): string {
  return getPublicUrl('company-assets', 'pss_orange_logo.png');
}
