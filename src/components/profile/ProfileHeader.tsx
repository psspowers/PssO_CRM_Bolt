import React, { useState, useRef } from 'react';
import { Camera, Edit2, Check, X, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  internal: 'bg-blue-100 text-blue-700 border-blue-200',
  external: 'bg-gray-100 text-gray-700 border-gray-200',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  internal: 'Internal Team',
  external: 'External Partner',
};

interface Props { profile: UserProfile; onUpdate: () => void; }

export const ProfileHeader: React.FC<Props> = ({ profile, onUpdate }) => {
  const { updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Defensive: Ensure profile and profile.name exist before processing
  const initials = (profile?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar: data.publicUrl });
      toast({ title: 'Avatar updated', description: 'Your profile picture has been updated.' });
      onUpdate();
    } catch (err) {
      toast({ title: 'Upload failed', description: 'Could not upload avatar.', variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({ name });
    if (error) toast({ title: 'Error', description: 'Could not update profile.', variant: 'destructive' });
    else { toast({ title: 'Profile updated' }); setEditing(false); onUpdate(); }
    setSaving(false);
  };

  // Defensive: Early return if profile is somehow invalid
  if (!profile) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center text-gray-500">
          <p>Profile data unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full object-cover border-4 border-orange-200" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-2xl border-4 border-orange-200">{initials}</div>
          )}
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white hover:bg-orange-600 transition-colors shadow-lg">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          {editing ? (
            <div className="flex items-center gap-2 mb-2">
              <Input value={name} onChange={e => setName(e.target.value)} className="max-w-xs" />
              <Button size="sm" onClick={handleSave} disabled={saving}><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(profile.name); }}><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-orange-500" aria-label="Edit profile"><Edit2 className="w-4 h-4" /></button>
            </div>
          )}
          <p className="text-gray-500 mb-2">{profile.email || 'No email'}</p>
          <span className={`inline-block text-sm px-3 py-1 rounded-full border ${roleColors[profile.role] || roleColors.external}`}>{roleLabels[profile.role] || 'User'}</span>
        </div>
      </div>
      {profile.badges && profile.badges.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><Award className="w-4 h-4" /> Badges</h3>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge, i) => (
              <span key={i} className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-full text-sm font-medium border border-orange-200">{badge}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
