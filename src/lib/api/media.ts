import { supabase } from '../supabase';
import { MediaFile } from '../../types/crm';

/**
 * SECURE MEDIA API
 * 
 * This API is designed to work with a PRIVATE storage bucket.
 * All file access uses Signed URLs (temporary secure tokens).
 * 
 * Database Schema (media_files table):
 * - storage_path: The internal path in the bucket (NOT a URL)
 * - file_name: Original filename
 * - file_type: MIME type
 * - file_size: Size in bytes
 * - category: Roof, Electrical, Utility Bill, etc.
 * - gps_lat, gps_lng: GPS coordinates for verification
 * - related_to_id, related_to_type: Entity association
 * - uploaded_by: User ID
 * - is_verified: GPS verification status
 */

// Default signed URL expiry (1 hour)
const SIGNED_URL_EXPIRY = 3600;

/**
 * Helper to extract storage path from a signed URL or return the path itself
 */
const extractStoragePath = (pathOrUrl: string): string => {
  // If it's already a path (no http), return as-is
  if (!pathOrUrl.startsWith('http')) {
    return pathOrUrl;
  }
  
  // Extract path from signed URL
  // Format: https://xxx.supabase.co/storage/v1/object/sign/vault/path/to/file?token=xxx
  try {
    const url = new URL(pathOrUrl);
    const pathParts = url.pathname.split('/vault/');
    if (pathParts.length > 1) {
      return decodeURIComponent(pathParts[1]);
    }
  } catch {
    // If URL parsing fails, try simple split
    if (pathOrUrl.includes('/vault/')) {
      const parts = pathOrUrl.split('/vault/');
      if (parts.length > 1) {
        // Remove query params
        return parts[1].split('?')[0];
      }
    }
  }
  
  return pathOrUrl;
};

/**
 * Generate a signed URL for a storage path
 */
const getSignedUrl = async (storagePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('vault')
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
  
  if (error) {
    console.error('Error generating signed URL:', error);
    return '';
  }
  
  return data.signedUrl;
};

/**
 * Upload a media file to Supabase Storage and save metadata to database
 * Returns the MediaFile with a signed URL for immediate display
 */
export const uploadMedia = async (
  file: File, 
  category: string, 
  relatedToId: string, 
  relatedToType: string,
  lat?: number, 
  lng?: number
): Promise<MediaFile> => {
  // 1. Generate unique storage path
  const fileExt = file.name.split('.').pop();
  // Clean filename to prevent special character issues
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  // Folder structure: EntityType/EntityID/Filename
  const storagePath = `${relatedToType}/${relatedToId}/${uniqueName}`;

  // 2. Upload to Private Bucket 'vault'
  const { error: uploadError } = await supabase.storage
    .from('vault')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  // 3. Save Metadata to Database (store PATH, not URL)
  const { data, error: dbError } = await supabase
    .from('media_files')
    .insert({
      storage_path: storagePath,  // Store the internal path
      file_name: file.name,
      file_size: file.size,       // Store as number (bytes)
      file_type: file.type,
      category,
      related_to_id: relatedToId,
      related_to_type: relatedToType,
      gps_lat: lat || null,
      gps_lng: lng || null,
      is_verified: !!(lat && lng)  // True if GPS coords exist
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: delete uploaded file if DB insert fails
    await supabase.storage.from('vault').remove([storagePath]);
    throw dbError;
  }

  // 4. Generate signed URL for immediate display
  const signedUrl = await getSignedUrl(storagePath);

  // 5. Return formatted MediaFile object
  return {
    id: data.id,
    url: signedUrl,
    category: data.category,
    fileName: data.file_name,
    fileSize: formatFileSize(data.file_size),
    uploadedBy: data.uploaded_by,
    createdAt: new Date(data.created_at),
    lat: data.gps_lat,
    lng: data.gps_lng,
    isVerified: data.is_verified
  };
};

/**
 * Fetch all media files for a specific entity
 * Generates signed URLs for all files in parallel
 */
export const fetchMedia = async (relatedToId: string): Promise<MediaFile[]> => {
  // 1. Get metadata from DB
  const { data, error } = await supabase
    .from('media_files')
    .select('*')
    .eq('related_to_id', relatedToId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // 2. Generate signed URLs for all files in parallel
  const filesWithUrls = await Promise.all(
    data.map(async (f: any) => {
      const signedUrl = await getSignedUrl(f.storage_path);
      
      return {
        id: f.id,
        url: signedUrl,
        category: f.category,
        fileName: f.file_name,
        fileSize: formatFileSize(f.file_size),
        uploadedBy: f.uploaded_by,
        createdAt: new Date(f.created_at),
        lat: f.gps_lat,
        lng: f.gps_lng,
        isVerified: f.is_verified
      };
    })
  );

  return filesWithUrls;
};

/**
 * Fetch all media files for a specific entity and type
 */
export const fetchMediaByType = async (
  relatedToId: string, 
  relatedToType: string
): Promise<MediaFile[]> => {
  const { data, error } = await supabase
    .from('media_files')
    .select('*')
    .eq('related_to_id', relatedToId)
    .eq('related_to_type', relatedToType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Generate signed URLs for all files in parallel
  const filesWithUrls = await Promise.all(
    data.map(async (f: any) => {
      const signedUrl = await getSignedUrl(f.storage_path);
      
      return {
        id: f.id,
        url: signedUrl,
        category: f.category,
        fileName: f.file_name,
        fileSize: formatFileSize(f.file_size),
        uploadedBy: f.uploaded_by,
        createdAt: new Date(f.created_at),
        lat: f.gps_lat,
        lng: f.gps_lng,
        isVerified: f.is_verified
      };
    })
  );

  return filesWithUrls;
};

/**
 * Delete a media file from both Storage and Database
 */
export const deleteMedia = async (id: string, fileUrlOrPath: string): Promise<void> => {
  // 1. Extract the storage path from URL or use directly
  const storagePath = extractStoragePath(fileUrlOrPath);
  
  // 2. Get the actual storage path from DB if we only have the ID
  let pathToDelete = storagePath;
  
  if (!pathToDelete || pathToDelete === id) {
    // Fetch the storage path from DB
    const { data: fileData } = await supabase
      .from('media_files')
      .select('storage_path')
      .eq('id', id)
      .single();
    
    if (fileData?.storage_path) {
      pathToDelete = fileData.storage_path;
    }
  }
  
  // 3. Delete from Storage
  if (pathToDelete) {
    const { error: storageError } = await supabase.storage
      .from('vault')
      .remove([pathToDelete]);
    
    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue to delete from DB even if storage fails
    }
  }
  
  // 4. Delete from Database
  const { error } = await supabase
    .from('media_files')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

/**
 * Update media file metadata (e.g., category, verification status)
 */
export const updateMedia = async (
  id: string, 
  updates: Partial<{
    category: string;
    is_verified: boolean;
    gps_lat: number;
    gps_lng: number;
  }>
): Promise<MediaFile> => {
  const { data, error } = await supabase
    .from('media_files')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Generate signed URL for the updated file
  const signedUrl = await getSignedUrl(data.storage_path);

  return {
    id: data.id,
    url: signedUrl,
    category: data.category,
    fileName: data.file_name,
    fileSize: formatFileSize(data.file_size),
    uploadedBy: data.uploaded_by,
    createdAt: new Date(data.created_at),
    lat: data.gps_lat,
    lng: data.gps_lng,
    isVerified: data.is_verified
  };
};

/**
 * Get media statistics for an entity
 */
export const getMediaStats = async (relatedToId: string): Promise<{
  totalFiles: number;
  verifiedFiles: number;
  byCategory: Record<string, number>;
}> => {
  const { data, error } = await supabase
    .from('media_files')
    .select('category, is_verified')
    .eq('related_to_id', relatedToId);

  if (error) throw error;

  const byCategory: Record<string, number> = {};
  let verifiedFiles = 0;

  (data || []).forEach((file: any) => {
    byCategory[file.category] = (byCategory[file.category] || 0) + 1;
    if (file.is_verified) verifiedFiles++;
  });

  return {
    totalFiles: data?.length || 0,
    verifiedFiles,
    byCategory
  };
};

/**
 * Refresh signed URL for a single file
 * Useful when a URL is about to expire
 */
export const refreshSignedUrl = async (storagePath: string): Promise<string> => {
  return getSignedUrl(storagePath);
};

/**
 * Get a single media file by ID with fresh signed URL
 */
export const getMediaById = async (id: string): Promise<MediaFile | null> => {
  const { data, error } = await supabase
    .from('media_files')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const signedUrl = await getSignedUrl(data.storage_path);

  return {
    id: data.id,
    url: signedUrl,
    category: data.category,
    fileName: data.file_name,
    fileSize: formatFileSize(data.file_size),
    uploadedBy: data.uploaded_by,
    createdAt: new Date(data.created_at),
    lat: data.gps_lat,
    lng: data.gps_lng,
    isVerified: data.is_verified
  };
};

/**
 * Format file size from bytes to human readable string
 */
const formatFileSize = (bytes: number | string): string => {
  // Handle if already formatted
  if (typeof bytes === 'string') return bytes;
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
