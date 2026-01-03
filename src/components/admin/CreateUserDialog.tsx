import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/types/crm';
import { Loader2, UserPlus, Mail, Shield, Users, Briefcase, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  users: Array<{ id: string; name: string; email: string }>;
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  users
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'external' as UserRole,
    reports_to: 'none',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    user?.email === 'sam@psspowers.com';

  const isAdmin = profile?.role === 'admin';
  const canCreateAdmin = isSuperAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestBody: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        reports_to: formData.reports_to === 'none' ? null : formData.reports_to
      };

      if (formData.password) {
        requestBody.password = formData.password;
      }

      console.log('[CREATE-USER] Invoking edge function with:', {
        ...requestBody,
        password: formData.password ? '[REDACTED]' : undefined
      });

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: requestBody
      });

      console.log('=== CREATE USER RESPONSE ===');
      console.log('Raw response data:', data);
      console.log('Raw error:', error);
      console.log('Invitation sent flag:', data?.invitation_sent);
      console.log('Email error details:', data?.email_error);
      console.log('==========================');

      if (error) {
        console.error('[CREATE-USER] Error object keys:', Object.keys(error));
        console.error('[CREATE-USER] Error stringified:', JSON.stringify(error, null, 2));
        console.error('[CREATE-USER] Response data (might have error details):', data);

        let errorMessage = 'Failed to create user';

        if (data?.error) {
          errorMessage = data.error;
          if (data.details) {
            console.error('[CREATE-USER] Additional error details:', data.details);
            errorMessage += ` (${data.details.error_code || 'unknown error'})`;
          }
        } else if (error.context?.error) {
          errorMessage = error.context.error;
        } else if (error.message && error.message !== 'Edge Function returned a non-2xx status code') {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      }

      if (!data?.success) {
        console.error('[CREATE-USER] Data indicates failure:', data);
        throw new Error(data?.error || 'Failed to create user');
      }

      console.log('[CREATE-USER] User created successfully');

      if (data.password_assigned) {
        toast({
          title: 'User Created',
          description: `User ${formData.email} created with password. They must change it on first login.`
        });
      } else if (data.invite_link) {
        console.log('⚠️ Email failed, but invite link generated');
        console.log('Invite link:', data.invite_link);

        navigator.clipboard.writeText(data.invite_link).catch(() => {});

        toast({
          title: 'User Created (Manual Invite)',
          description: 'Email failed but invite link copied to clipboard. Send it to the user manually.',
          duration: 10000
        });

        alert(`User created! Email delivery failed, but here's the invite link:\n\n${data.invite_link}\n\n(Also copied to clipboard)\n\nSend this link to ${formData.email} to let them set their password.`);
      } else if (!data.invitation_sent) {
        console.warn('⚠️ WARNING: User created but invitation email FAILED to send!');
        console.error('Email error:', data.email_error);

        const errorMsg = data.email_error?.message || 'Unknown email error';
        toast({
          title: 'User Created (Email Issue)',
          description: `User created but email failed: ${errorMsg}. Check Supabase Auth settings.`,
          variant: 'destructive'
        });
      } else {
        console.log('✅ Invitation email sent successfully');
        toast({
          title: 'User Created',
          description: `Invitation email sent to ${formData.email}`
        });
      }

      setFormData({ name: '', email: '', role: 'external', reports_to: 'none', password: '' });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error('[CREATE-USER] Final catch block error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create user',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-500" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account and send them an invitation email to join the platform.
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
            <p className="text-xs text-gray-500">
              {formData.password ? 'User will login with assigned password' : 'An invitation will be sent to this email address'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500" />
              Initial Password (Optional)
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Leave blank to send invitation email"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {formData.password
                ? 'User will be required to change this password on first login'
                : 'Leave blank to send an invitation email instead'}
            </p>
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
                {isSuperAdmin && (
                  <SelectItem value="super_admin">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Super Admin - Full system access + settings
                    </span>
                  </SelectItem>
                )}
                {isSuperAdmin && (
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Admin - Global data access
                    </span>
                  </SelectItem>
                )}
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
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      {user.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Set the organizational hierarchy. Can be changed later in Org Chart.
            </p>
          </div>

          <div className={`${formData.password ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}>
            <div className="flex items-start gap-2">
              {formData.password ? (
                <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              )}
              <div className={`text-xs ${formData.password ? 'text-amber-800' : 'text-blue-800'}`}>
                <p className="font-medium">What happens next?</p>
                <ul className={`list-disc list-inside mt-1 space-y-0.5 ${formData.password ? 'text-amber-700' : 'text-blue-700'}`}>
                  <li>User account will be created in the system</li>
                  {formData.password ? (
                    <>
                      <li>User can login immediately with the assigned password</li>
                      <li>They will be required to change the password on first login</li>
                      <li>No invitation email will be sent</li>
                    </>
                  ) : (
                    <>
                      <li>Invitation email will be sent to {formData.email || 'the provided email'}</li>
                      <li>User can set their password via the invitation link</li>
                    </>
                  )}
                  <li>They'll have immediate access based on their assigned role</li>
                </ul>
              </div>
            </div>
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
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {formData.password ? 'Create User with Password' : 'Create User & Send Invite'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
