import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/types/crm';
import { Loader2, Save, Mail, Shield, Users, Briefcase, User, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    reports_to?: string | null;
  } | null;
  users: Array<{ id: string; name: string; email: string }>;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  user,
  users
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'external' as UserRole,
    avatar: '',
    reports_to: 'none'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'external',
        avatar: user.avatar || '',
        reports_to: user.reports_to || 'none'
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('crm_users')
        .update({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          avatar: formData.avatar || null,
          reports_to: formData.reports_to === 'none' ? null : formData.reports_to,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'User Updated',
        description: `${formData.name} has been updated successfully`
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) return null;

  const availableManagers = users.filter(u => u.id !== user.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-orange-500" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@company.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar" className="flex items-center gap-2">
              <Image className="w-4 h-4 text-gray-500" />
              Avatar URL
            </Label>
            <Input
              id="avatar"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={formData.avatar}
              onChange={(e) => handleChange('avatar', e.target.value)}
              disabled={loading}
            />
            {formData.avatar && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                  <img src={formData.avatar} alt="Avatar preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-gray-500">Preview</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-500" />
              Role
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleChange('role', value)}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Admin - Full system access
                  </span>
                </SelectItem>
                <SelectItem value="internal">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Internal - Company employee
                  </span>
                </SelectItem>
                <SelectItem value="external">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-500" />
                    External - Partner/Contractor
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-500" />
              Reports To (Manager)
            </Label>
            <Select
              value={formData.reports_to}
              onValueChange={(value) => handleChange('reports_to', value)}
              disabled={loading}
            >
              <SelectTrigger id="manager">
                <SelectValue placeholder="No manager (Top level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-gray-500">No manager (Top level)</span>
                </SelectItem>
                {availableManagers.map(mgr => (
                  <SelectItem key={mgr.id} value={mgr.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold">
                        {mgr.name.charAt(0).toUpperCase()}
                      </span>
                      {mgr.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
