import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  User, Mail, Building2, Save, Loader2, Camera,
  CheckCircle, AlertCircle
} from 'lucide-react';

const ProfileSettings: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || user?.email || '',
        avatar: profile.avatar || ''
      });
    }
  }, [profile, user]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) {
      if (!user?.id) {
        toast({
          title: 'Upload failed',
          description: 'Authentication required. Please log in again.',
          variant: 'destructive'
        });
      }
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);

      setFormData(prev => ({ ...prev, avatar: data.publicUrl }));
      setHasChanges(true);

      toast({
        title: 'Avatar uploaded',
        description: 'Your profile picture has been uploaded. Click "Save Changes" to apply.'
      });
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast({
        title: 'Upload failed',
        description: err.message || 'Could not upload avatar. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setLoading(true);
    try {
      const { error } = await updateProfile({
        name: formData.name,
        avatar: formData.avatar
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update profile',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.'
        });
        setHasChanges(false);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    internal: 'Internal Team',
    external: 'External Partner'
  };

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
    admin: 'bg-red-100 text-red-700 border-red-200',
    internal: 'bg-blue-100 text-blue-700 border-blue-200',
    external: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  if (!profile) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="text-center py-8 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Please log in to manage your profile settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-orange-600" />
          Profile Information
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt={formData.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-orange-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-orange-100">
                  {formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </div>
              )}
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium text-gray-900">{formData.name || 'Your Name'}</p>
              <p className="text-sm text-gray-500">{formData.email}</p>
              <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full border ${roleColors[profile.role] || roleColors.external}`}>
                {roleLabels[profile.role] || 'User'}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter your full name"
                className="focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email Address
              </Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              {hasChanges ? (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-600">You have unsaved changes</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">All changes saved</span>
                </>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-1">User ID</p>
            <p className="font-mono text-xs text-gray-700 break-all">{profile.id}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-1">Account Type</p>
            <p className="font-medium text-gray-900">{roleLabels[profile.role] || 'User'}</p>
          </div>
          {profile.badges && profile.badges.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg md:col-span-2">
              <p className="text-gray-500 mb-2">Badges</p>
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((badge, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
