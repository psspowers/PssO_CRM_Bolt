import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ForcePasswordChangeProps {
  onPasswordChanged: () => void;
}

export const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ onPasswordChanged }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { label: 'Contains uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'Contains lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: 'Contains number', test: (pwd: string) => /\d/.test(pwd) },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast({
        title: 'Invalid Password',
        description: 'Please meet all password requirements',
        variant: 'destructive'
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please ensure both passwords are identical',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: profileError } = await supabase
        .from('crm_users')
        .update({ password_change_required: false })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update password_change_required flag:', profileError);
      }

      toast({
        title: 'Password Changed',
        description: 'Your password has been successfully updated'
      });

      onPasswordChanged();
    } catch (err: any) {
      console.error('Password change error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to change password',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Password Change Required</h2>
            <p className="text-xs text-slate-600">Set a new password to continue</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs leading-tight text-amber-800">
              Your administrator assigned a temporary password. You must create a new password before accessing the system.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-700 block mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                placeholder="Enter new password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-1.5 text-xs space-y-0.5">
              {passwordRequirements.map((req, index) => {
                const isValid = req.test(newPassword);
                return (
                  <div key={index} className={`flex items-center gap-1.5 ${isValid ? 'text-green-600' : 'text-slate-500'}`}>
                    <CheckCircle className={`w-3 h-3 flex-shrink-0 ${isValid ? 'opacity-100' : 'opacity-30'}`} />
                    <span>{req.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                placeholder="Confirm new password"
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && (
              <p className={`text-xs mt-1 ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid || !passwordsMatch}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Changing Password...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Change Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
