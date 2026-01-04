import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/6906bb3c71e38f27025f3702_1764911901727_6285940b.png';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validSession, setValidSession] = useState<boolean | null>(null); // null = loading
  
  const navigate = useNavigate();
  const location = useLocation();

  // 1. SESSION HANDSHAKE LOGIC
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const handleSessionExchange = async () => {
      try {
        console.log('Reset Password - URL check:', {
          search: location.search,
          hash: location.hash,
          pathname: location.pathname
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        if (!isMounted) return;

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('Session check result:', {
          hasSession: !!session,
          error: sessionError,
          user: session?.user?.email
        });

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          console.log('Valid session found for password reset');
          if (isMounted) {
            setValidSession(true);
          }
        } else {
          console.log('No valid session - link may be expired');
          if (isMounted) {
            setValidSession(false);
            setError('Invalid or expired reset link. Please request a new one.');
          }
        }

      } catch (err: any) {
        console.error('Session verification error:', err);
        if (isMounted) {
          setValidSession(false);
          setError(err.message || 'Unable to verify reset link. Please try again.');
        }
      }
    };

    timeoutId = setTimeout(() => {
      if (isMounted && validSession === null) {
        console.error('Session verification timeout after 10 seconds');
        setValidSession(false);
        setError('Connection timeout. Please check your internet connection and request a new reset link.');
      }
    }, 10000);

    handleSessionExchange();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [location]);

  // 2. PASSWORD VALIDATION
  const validatePassword = (): string | null => {
    if (!password) return 'Please enter a new password.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  // 3. SUBMIT HANDLER
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      toast({ title: 'Success', description: 'Password updated successfully.' });

      // Auto-redirect
      setTimeout(async () => {
        await supabase.auth.signOut(); // Force re-login with new password
        navigate('/login');
      }, 3000);

    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  // RENDER STATES
  if (validSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-in fade-in">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Verifying security token...</p>
        </div>
      </div>
    );
  }

  if (validSession === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h2>
          <p className="text-gray-500 mb-6">{error || 'This link is invalid or has expired.'}</p>
          <Link to="/forgot-password">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 mb-3">Request New Link</Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" className="w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h2>
          <p className="text-gray-500 mb-6">Redirecting to login...</p>
          <Link to="/login">
            <Button className="w-full bg-orange-500 hover:bg-orange-600">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">PSS Orange</h1>
            <p className="text-xs text-gray-500">Secure Reset</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Set New Password</h2>
        <p className="text-center text-gray-500 mb-6 text-sm">Create a strong password for your account</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                id="password" 
                type={showPassword ? 'text' : 'password'}
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label>Confirm Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;