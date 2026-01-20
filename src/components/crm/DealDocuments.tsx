import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, File, FileText, Image, Star, Download, Loader2,
  FolderOpen, X, ChevronDown
} from 'lucide-react';
import { MediaFile } from '../../types/crm';
import {
  fetchMediaByType,
  uploadMedia,
  updateMedia,
  deleteMedia
} from '../../lib/api/media';
import { useAuth } from '../../contexts/AuthContext';

interface DealDocumentsProps {
  entityId: string;
  entityType: 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project';
}

const FILE_CATEGORIES = [
  'Roof',
  'Electrical',
  'Utility Bill',
  'Site Map',
  'Other'
] as const;

export const DealDocuments: React.FC<DealDocumentsProps> = ({ entityId, entityType }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Other');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [entityId, entityType]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const files = await fetchMediaByType(entityId, entityType);

      const sorted = files.sort((a, b) => {
        if (a.isStarred !== b.isStarred) {
          return a.isStarred ? -1 : 1;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setDocuments(sorted);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file =>
        uploadMedia(file, selectedCategory, entityId, entityType)
      );

      await Promise.all(uploadPromises);
      await loadDocuments();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading files:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const toggleStar = async (doc: MediaFile) => {
    try {
      await updateMedia(doc.id, { is_starred: !doc.isStarred });
      await loadDocuments();
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  const handleDownload = (doc: MediaFile) => {
    window.open(doc.url, '_blank');
  };

  const handleDelete = async (doc: MediaFile) => {
    if (!confirm(`Delete ${doc.fileName}?`)) return;

    try {
      await deleteMedia(doc.id, doc.url);
      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return Image;
    }
    if (['pdf', 'doc', 'docx'].includes(ext || '')) {
      return FileText;
    }
    return File;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload Area */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            id="file-upload"
          />

          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400" />
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or{' '}
                    <label
                      htmlFor="file-upload"
                      className="text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium"
                    >
                      browse
                    </label>
                  </p>
                  <div className="relative inline-block">
                    <button
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Category: {selectedCategory}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                        {FILE_CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategory(cat);
                              setShowCategoryDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FolderOpen className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No documents yet</p>
            <p className="text-xs mt-1">Upload the first document to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const FileIcon = getFileIcon(doc.fileName);

              return (
                <div
                  key={doc.id}
                  className="group flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-gray-600" />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.fileName}
                      </p>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded flex-shrink-0">
                        {doc.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{doc.fileSize}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(doc.createdAt)}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleStar(doc)}
                      className={`p-2 rounded hover:bg-gray-100 transition-colors ${
                        doc.isStarred ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                      title={doc.isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star
                        className="w-4 h-4"
                        fill={doc.isStarred ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Starred Badge (always visible) */}
                  {doc.isStarred && (
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-current" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
