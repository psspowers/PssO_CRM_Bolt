import React, { useState, useEffect, useRef } from 'react';
import { Camera, FileText, MapPin, Trash2, Upload, Eye, Loader2, X, Download, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const CATEGORIES = ['Roof', 'Electrical', 'Utility Bill', 'Site Map', 'Contract', 'Other'];

interface MediaFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: string;
  gps_lat?: number;
  gps_lng?: number;
  related_to_id?: string;
  related_to_type?: string;
  uploaded_by: string;
  created_at: string;
}

interface MediaVaultProps {
  relatedToId?: string;
  relatedToType?: 'Opportunity' | 'Account' | 'Project';
}

export const MediaVault: React.FC<MediaVaultProps> = ({ relatedToId, relatedToType }) => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('Roof');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files from database
  useEffect(() => {
    if (!user) return;
    fetchFiles();
  }, [user, relatedToId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by related entity if provided
      if (relatedToId && relatedToType) {
        query = query
          .eq('related_to_id', relatedToId)
          .eq('related_to_type', relatedToType);
      } else if (user) {
        // Otherwise show user's own files
        query = query.eq('uploaded_by', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching files:', error);
        toast({ title: 'Error', description: 'Failed to load files', variant: 'destructive' });
      } else {
        setFiles(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get signed URL for file
  const getFileUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('vault')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error getting signed URL:', error);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.error('Failed to get file URL:', err);
      return null;
    }
  };

  // Handle file upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      // Get GPS coordinates if available
      let gpsLat: number | undefined;
      let gpsLng: number | undefined;

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000
          });
        });
        gpsLat = position.coords.latitude;
        gpsLng = position.coords.longitude;
      } catch (gpsError) {
        console.warn('GPS not available:', gpsError);
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${user.id}/${activeCategory}/${fileName}`;

      // Upload to storage bucket
      const { error: uploadError } = await supabase.storage
        .from('vault')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Save metadata to database
      const { data: mediaFile, error: dbError } = await supabase
        .from('media_files')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          category: activeCategory,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          related_to_id: relatedToId,
          related_to_type: relatedToType,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (dbError) {
        // Rollback storage upload if DB insert fails
        await supabase.storage.from('vault').remove([storagePath]);
        throw dbError;
      }

      // Add to local state
      setFiles(prev => [mediaFile, ...prev]);

      toast({
        title: 'Upload successful',
        description: gpsLat ? 'File uploaded with GPS verification' : 'File uploaded successfully'
      });

    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file delete
  const handleDelete = async (file: MediaFile) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('vault')
        .remove([file.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_files')
        .delete()
        .eq('id', file.id);

      if (dbError) {
        throw dbError;
      }

      // Remove from local state
      setFiles(prev => prev.filter(f => f.id !== file.id));

      toast({ title: 'File deleted', description: 'File has been removed' });

    } catch (err: any) {
      console.error('Delete error:', err);
      toast({
        title: 'Delete failed',
        description: err.message || 'Failed to delete file',
        variant: 'destructive'
      });
    }
  };

  // Handle file preview
  const handlePreview = async (file: MediaFile) => {
    const url = await getFileUrl(file.storage_path);
    if (url) {
      if (file.file_type.startsWith('image/')) {
        setPreviewFile({ ...file, storage_path: url });
      } else {
        // For non-image files, open in new tab
        window.open(url, '_blank');
      }
    }
  };

  // Handle file download
  const handleDownload = async (file: MediaFile) => {
    const url = await getFileUrl(file.storage_path);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter files by category
  const filteredFiles = files.filter(f => f.category === activeCategory);

  // Check if file is an image
  const isImage = (fileType: string) => fileType.startsWith('image/');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-orange-500" /> Technical Vault
        </h3>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !user}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" /> Upload File
              </>
            )}
          </button>
        </div>
      </div>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Please sign in to upload and manage files</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
              activeCategory === cat 
              ? 'bg-orange-100 border-orange-200 text-orange-700' 
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            {cat} ({files.filter(f => f.category === cat).length})
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="py-10 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
          <p className="text-sm">Loading files...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredFiles.length > 0 ? (
            filteredFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                onPreview={() => handlePreview(file)}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file)}
                formatFileSize={formatFileSize}
              />
            ))
          ) : (
            <div className="col-span-2 py-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-gray-400">
              <Upload className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs">No {activeCategory} documents yet</p>
              {user && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-medium"
                >
                  Upload your first file
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            <div className="absolute -top-14 left-0 right-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg">
                  <p className="text-white font-semibold text-sm">{previewFile.file_name}</p>
                </div>
                {previewFile.gps_lat && (
                  <div className="bg-orange-500/90 backdrop-blur-md px-3 py-2 rounded-lg flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-white" />
                    <span className="text-white text-xs font-medium">
                      GPS: {previewFile.gps_lat.toFixed(4)}, {previewFile.gps_lng?.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(previewFile);
                  }}
                  className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Download</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white p-2 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <img
                src={previewFile.storage_path}
                alt={previewFile.file_name}
                className="w-full h-full object-contain max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg">
                <p className="text-white/70 text-xs">
                  Uploaded {new Date(previewFile.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Separate FileCard component for cleaner code
interface FileCardProps {
  file: MediaFile;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  formatFileSize: (bytes: number) => string;
}

const FileCard: React.FC<FileCardProps> = ({ file, onPreview, onDownload, onDelete, formatFileSize }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const isImage = file.file_type.startsWith('image/');

  useEffect(() => {
    if (isImage) {
      // Get thumbnail URL for images
      const getThumbnail = async () => {
        const { data } = await supabase.storage
          .from('vault')
          .createSignedUrl(file.storage_path, 3600);
        if (data) setThumbnailUrl(data.signedUrl);
      };
      getThumbnail();
    }
  }, [file.storage_path, isImage]);

  return (
    <div className="group relative bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
      {isImage ? (
        <div className="aspect-square relative bg-gray-100 cursor-pointer" onClick={onPreview}>
          {thumbnailUrl ? (
            <>
              <img
                src={thumbnailUrl}
                className="w-full h-full object-cover"
                alt={file.file_name}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                    <Eye className="w-4 h-4 text-slate-700" />
                    <span className="text-sm font-semibold text-slate-700">View</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          )}
          {file.gps_lat && (
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[9px] text-white flex items-center gap-1 shadow-sm">
              <MapPin className="w-2.5 h-2.5 text-orange-400" /> GPS Verified
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 cursor-pointer group-hover:from-slate-100 group-hover:to-slate-200 transition-all" onClick={onPreview}>
          <div className="relative">
            <FileText className="w-12 h-12 text-slate-300 group-hover:text-slate-400 transition-colors" />
            <div className="absolute -right-1 -top-1 bg-orange-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
              <Eye className="w-3 h-3" />
            </div>
          </div>
          <p className="text-[10px] text-slate-600 font-medium mt-3 text-center truncate w-full px-2">{file.file_name}</p>
          <p className="text-[9px] text-slate-400 mt-1 font-semibold">{formatFileSize(file.file_size)}</p>
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-orange-600 font-bold">Click to view</span>
          </div>
        </div>
      )}

      <div className="p-2.5 border-t bg-gradient-to-b from-white to-slate-50 flex items-center justify-between">
        <span className="text-[9px] text-slate-500 font-medium">
          {new Date(file.created_at).toLocaleDateString()}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={onPreview}
            className="p-2 hover:bg-orange-100 rounded-lg text-slate-400 hover:text-orange-600 transition-colors"
            title="View file"
            aria-label="View"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDownload}
            className="p-2 hover:bg-blue-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
            title="Download file"
            aria-label="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
            title="Delete file"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
