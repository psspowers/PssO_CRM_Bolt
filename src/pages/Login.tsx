import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import TwoFactorVerification from '@/components/TwoFactorVerification';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/6906bb3c71e38f27025f3702_1764911901727_6285940b.png';

// Maximum time to wait for login (in milliseconds)
const MAX_LOGIN_TIME = 8000;

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// User-friendly error messages
const getErrorMessage = (error: Error | { message: string } | string): string => {
  const msg = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();
  
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email address before logging in. Check your inbox for a verification link.';
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Too many login attempts. Please wait a few minutes and try again.';
  }
  if (msg.includes('user not found') || msg.includes('no user')) {
    return 'No account found with this email address. Please check your email or sign up.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Login request timed out. Please check your internet connection and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  if (msg.includes('disabled') || msg.includes('banned')) {
    return 'This account has been disabled. Please contact support for assistance.';
  }
  
  // Default message
  return typeof error === 'string' ? error : (error.message || 'An unexpected error occurred. Please try again.');
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<'email' | 'authenticator'>('email');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  // Ref to track if component is mounted (prevent state updates after unmount)
  const mountedRef = useRef(true);
  // Ref to track timeout for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Client-side validation - instant feedback before any API call
  const validateForm = (): string | null => {
    if (!email.trim()) {
      return 'Please enter your email address.';
    }
    if (!isValidEmail(email)) {
      return 'Please enter a valid email address.';
    }
    if (!password) {
      return 'Please enter your password.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return null;
  };

  // Fire and forget - log login attempt without blocking
  const logLoginAttempt = (userEmail: string, success: boolean, failureReason?: string, userId?: string) => {
    supabase.functions.invoke('login-history', {
      body: { 
        action: 'log', 
        email: userEmail, 
        success, 
        failure_reason: failureReason,
        user_agent: navigator.userAgent,
        user_id: userId || null
      }
    }).catch(() => {}); // Silently ignore errors
  };


  // Fire and forget - register device without blocking
  const registerDevice = (userId: string) => {
    try {
      const ua = navigator.userAgent;
      const isMobile = /Mobile|Android|iPhone/i.test(ua);
      const isTablet = /iPad|Tablet/i.test(ua);
      const deviceType = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop';
      const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Other';
      const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : ua.includes('Android') ? 'Android' : ua.includes('iOS') ? 'iOS' : 'Unknown';
      
      supabase.functions.invoke('trusted-devices', {
        body: { 
          action: 'register_device', 
          user_id: userId,
          device_info: { device_type: deviceType, browser, os, user_agent: ua, ip_address: 'Unknown' }
        }
      }).catch(() => {}); // Silently ignore errors
    } catch {
      // Silently ignore errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous error
    setError(null);
    
    // Client-side validation first (instant feedback - no API call needed)
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    
    // Set a global timeout - if ANYTHING takes longer than MAX_LOGIN_TIME, fail
    let timedOut = false;
    timeoutRef.current = setTimeout(() => {
      timedOut = true;
      if (mountedRef.current) {
        setLoading(false);
        setError('Login request timed out. Please check your internet connection and try again.');
        toast({ 
          title: 'Login timed out', 
          description: 'Please check your connection and try again.', 
          variant: 'destructive' 
        });
      }
    }, MAX_LOGIN_TIME);
    
    try {
      // Attempt sign in
      const { error: signInError } = await signIn(email, password, rememberMe);
      
      // If we already timed out, don't continue
      if (timedOut || !mountedRef.current) return;
      
      // Clear the timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (signInError) {
        const friendlyMessage = getErrorMessage(signInError);
        setError(friendlyMessage);
        setLoading(false);
        
        // Log failed attempt (fire and forget - deferred to not block UI)
        setTimeout(() => logLoginAttempt(email, false, signInError.message), 0);

        
        toast({ 
          title: 'Login failed', 
          description: friendlyMessage, 
          variant: 'destructive' 
        });
        return;
      }

      // Login successful! Now check for 2FA (but don't block on it)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (timedOut || !mountedRef.current) return;
        
        if (user) {
          // Quick 2FA check - use a short timeout
          try {
            const twoFAPromise = supabase.functions.invoke('two-factor-auth', {
              body: { action: 'check', userId: user.id }
            });
            
            const twoFATimeout = new Promise<{ data: null }>((resolve) => 
              setTimeout(() => resolve({ data: null }), 2000)
            );
            
            const { data } = await Promise.race([twoFAPromise, twoFATimeout]) as { data: { enabled?: boolean; method?: string } | null };
            
            if (timedOut || !mountedRef.current) return;
            
            if (data?.enabled) {
              // 2FA is required - sign out and show 2FA form
              await supabase.auth.signOut();
              setPendingUserId(user.id);
              setTwoFAMethod((data.method as 'email' | 'authenticator') || 'email');
              setRequires2FA(true);
              setLoading(false);
              return;
            }
          } catch {
            // 2FA check failed - continue without 2FA (it's optional)
            console.warn('2FA check skipped');
          }
          
          // Register device (fire and forget)
          registerDevice(user.id);
        }
      } catch {
        // Getting user failed - but login succeeded, so continue
        console.warn('Failed to get user after login');
      }
      
      if (timedOut || !mountedRef.current) return;
      
      // Get user for logging (we may already have it from 2FA check)
      const currentUser = (await supabase.auth.getUser()).data.user;
      
      // Log successful attempt with user_id (fire and forget - deferred to not block UI)
      setTimeout(() => logLoginAttempt(email, true, undefined, currentUser?.id), 0);


      
      setLoading(false);
      toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
      navigate('/');
      
    } catch (err) {
      // Clear the timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (timedOut || !mountedRef.current) return;
      
      setLoading(false);
      const errorMessage = err instanceof Error ? getErrorMessage(err) : 'An unexpected error occurred.';
      setError(errorMessage);
      console.error('Login error:', err);
      toast({ 
        title: 'Login failed', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    }
  };

  const handle2FAVerified = async () => {
    setLoading(true);
    try {
      const { error } = await signIn(email, password, rememberMe);
      if (error) {
        toast({ title: 'Error', description: 'Please try logging in again', variant: 'destructive' });
        setRequires2FA(false);
        setLoading(false);
        return;
      }
      // Register device after 2FA verification
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        registerDevice(user.id);
        logLoginAttempt(email, true, undefined, user.id);
      }

      setLoading(false);
      toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
      navigate('/');
    } catch (err) {
      console.error('2FA verification error:', err);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive' });
      setRequires2FA(false);
      setLoading(false);
    }
  };

  const handle2FACancel = () => {
    setRequires2FA(false);
    setPendingUserId(null);
    setPassword('');
    setError(null);
  };

  // Clear error when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  // Show 2FA verification screen if required
  if (requires2FA && pendingUserId) {
    return (
      <TwoFactorVerification 
        userId={pendingUserId} 
        email={email} 
        method={twoFAMethod} 
        onVerified={handle2FAVerified} 
        onCancel={handle2FACancel} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo and Header */}
          <div className="flex items-center gap-6 mb-6">
            <img src={LOGO_URL} alt="PSS Orange Logo" className="w-24 h-24 object-contain flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">Welcome Back</h2>
              <p className="text-xl font-semibold text-orange-600 leading-tight">Investment CRM</p>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
            </div>
          </div>
          
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={handleEmailChange} 
                  className={`pl-10 ${error && !email ? 'border-red-300' : ''}`}
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={handlePasswordChange} 
                  className={`pl-10 ${error && !password ? 'border-red-300' : ''}`}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe} 
                  onCheckedChange={(checked) => setRememberMe(checked === true)} 
                  disabled={loading}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me for 30 days
                </Label>
              </div>
              <Link 
                to="/forgot-password" 
                className="text-sm text-orange-600 hover:text-orange-700"
                tabIndex={loading ? -1 : 0}
              >
                Forgot password?
              </Link>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-orange-600 hover:text-orange-700 font-medium"
              tabIndex={loading ? -1 : 0}
            >
              Sign up
            </Link>
          </p>
        </div>
        
        {/* Help text */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Having trouble signing in?{' '}
          <a href="mailto:support@psspowers.com" className="underline hover:text-gray-600">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
