/**
 * Authentication Context
 * Manages user authentication state
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/crm';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  badges: string[];
  password_change_required?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  extendSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const REMEMBER_ME_KEY = 'pss_remember_me';
const SESSION_WARNING_TIME = 5 * 60; // 5 minutes before expiry
const SHORT_SESSION = 60 * 60; // 1 hour
const LONG_SESSION = 30 * 24 * 60 * 60; // 30 days

// Admin email addresses that should always have admin role
// SECURITY POLICY: Only ONE Super Admin
const ADMIN_EMAILS = ['sam@psspowers.com'];

// Helper to determine role based on email
const getRoleForEmail = (email: string): UserRole => {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return 'admin';
  }
  if (email.toLowerCase().endsWith('@psspowers.com') || email.toLowerCase().endsWith('@ycubeholdings.com')) {
    return 'internal';
  }
  return 'external';
};

// Helper to get display name for email
const getNameForEmail = (email: string): string => {
  if (email.toLowerCase() === 'sam@psspowers.com') {
    return 'Sam Yamdagni';
  }
  // Capitalize first letter of email username
  const username = email.split('@')[0];
  return username.charAt(0).toUpperCase() + username.slice(1);
};

// Helper to get badges for email
const getBadgesForEmail = (email: string): string[] => {
  if (email.toLowerCase() === 'sam@psspowers.com') {
    return ['Founder', 'CEO', 'Admin'];
  }
  return [];
};


export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_WARNING_TIME);
  const mountedRef = useRef(true);
  const activityRef = useRef<number>(Date.now());

  const fetchProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    try {
      // Determine the correct role based on email (this takes precedence)
      const emailRole = userEmail ? getRoleForEmail(userEmail) : 'external';
      const emailName = userEmail ? getNameForEmail(userEmail) : 'User';
      const emailBadges = userEmail ? getBadgesForEmail(userEmail) : [];
      
      // First, try to fetch by ID
      const { data: dataById } = await supabase
        .from('crm_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (dataById) {
        // Use email-based role for admin emails to ensure they always have admin access
        const finalRole = ADMIN_EMAILS.includes(userEmail?.toLowerCase() || '') ? 'admin' : dataById.role;
        const finalName = ADMIN_EMAILS.includes(userEmail?.toLowerCase() || '') ? emailName : dataById.name;
        const finalBadges = ADMIN_EMAILS.includes(userEmail?.toLowerCase() || '') ? emailBadges : (dataById.badges || []);

        return {
          id: dataById.id,
          name: finalName || emailName,
          email: dataById.email,
          role: finalRole,
          avatar: dataById.avatar,
          badges: finalBadges,
          password_change_required: dataById.password_change_required || false
        };
      }
      
      // If not found by ID and we have an email, try to fetch by email
      if (userEmail) {
        const { data: dataByEmail } = await supabase
          .from('crm_users')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (dataByEmail) {
          // Found by email - update the record to use the auth user ID
          await supabase
            .from('crm_users')
            .update({ id: userId })
            .eq('email', userEmail);
          
          // Use email-based role for admin emails
          const finalRole = ADMIN_EMAILS.includes(userEmail.toLowerCase()) ? 'admin' : dataByEmail.role;
          const finalName = ADMIN_EMAILS.includes(userEmail.toLowerCase()) ? emailName : dataByEmail.name;
          const finalBadges = ADMIN_EMAILS.includes(userEmail.toLowerCase()) ? emailBadges : (dataByEmail.badges || []);
          
          return {
            id: userId,
            name: finalName || emailName,
            email: dataByEmail.email,
            role: finalRole,
            avatar: dataByEmail.avatar,
            badges: finalBadges,
            password_change_required: dataByEmail.password_change_required || false
          };
        }
      }

      // No profile found - create a default one for authenticated users
      if (userEmail) {
        const defaultProfile: UserProfile = {
          id: userId,
          name: emailName,
          email: userEmail,
          role: emailRole,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(emailName)}&background=f97316&color=fff&bold=true`,
          badges: emailBadges,
          password_change_required: false
        };
        
        // Try to insert the new profile
        await supabase.from('crm_users').insert({
          id: userId,
          name: defaultProfile.name,
          email: userEmail,
          role: emailRole,
          badges: emailBadges,
          avatar: defaultProfile.avatar,
          is_active: true
        });
        
        return defaultProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Return a minimal fallback profile so the UI doesn't break
      if (userEmail) {
        return {
          id: userId,
          name: getNameForEmail(userEmail),
          email: userEmail,
          role: getRoleForEmail(userEmail),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(getNameForEmail(userEmail))}&background=f97316&color=fff`,
          badges: getBadgesForEmail(userEmail)
        };
      }
      
      return null;
    }
  };

  const handleSignOut = useCallback(async () => {
    setShowTimeoutModal(false);

    // 1. CLEAR STATE FIRST
    // This ensures UI updates immediately even if API hangs
    setUser(null);
    setSession(null);
    setProfile(null);

    // 2. CLEAR STORAGE (The Critical Fix)
    // Remove app specific keys
    localStorage.removeItem(REMEMBER_ME_KEY);

    // Remove ALL Supabase tokens to prevent auto-relogin
    // Supabase stores tokens with keys like: sb-{project-ref}-auth-token
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });

    // 3. ATTEMPT SERVER LOGOUT (Fire & Forget)
    // Don't wait for this - the local session is already destroyed
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Server logout failed, but local session is destroyed:', error);
    }

    // 4. FORCE REDIRECT (ensures clean state)
    window.location.href = '/login';
  }, []);

  const extendSession = useCallback(async () => {
    setShowTimeoutModal(false);
    activityRef.current = Date.now();
    await supabase.auth.refreshSession();
  }, []);

  const checkSessionTimeout = useCallback(() => {
    if (!session || !user) return;
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    const sessionDuration = rememberMe ? LONG_SESSION : SHORT_SESSION;
    const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + sessionDuration * 1000;
    const now = Date.now();
    const remaining = Math.floor((expiresAt - now) / 1000);
    
    if (remaining <= SESSION_WARNING_TIME && remaining > 0) {
      setTimeRemaining(remaining);
      setShowTimeoutModal(true);
    } else if (remaining <= 0) {
      handleSignOut();
    }
  }, [session, user, handleSignOut]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSessionTimeout, 30000);
    return () => clearInterval(interval);
  }, [user, checkSessionTimeout]);

  useEffect(() => {
    mountedRef.current = true;
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mountedRef.current) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            const p = await fetchProfile(session.user.id, session.user.email);
            if (mountedRef.current) {
              setProfile(p);
            }
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mountedRef.current) setLoading(false);
      }
    };
    
    const timeout = setTimeout(() => { 
      if (mountedRef.current && loading) setLoading(false); 
    }, 6000);
    
    initAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const p = await fetchProfile(session.user.id, session.user.email);
        if (mountedRef.current) {
          setProfile(p);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    
    return () => { 
      mountedRef.current = false; 
      clearTimeout(timeout); 
      subscription.unsubscribe(); 
    };
  }, []);

  // Sign in with timeout protection
  const signIn = async (email: string, password: string, rememberMe = false): Promise<{ error: Error | null }> => {
    try {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
      
      // Create a timeout promise (5 seconds max for login - fail fast)
      const LOGIN_TIMEOUT = 5000;
      
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
        setTimeout(() => {
          resolve({ 
            data: null, 
            error: new Error('Login request timed out. Please check your internet connection and try again.') 
          });
        }, LOGIN_TIMEOUT);
      });
      
      const result = await Promise.race([loginPromise, timeoutPromise]);
      
      if (result.error) {
        return { error: result.error };
      }
      
      activityRef.current = Date.now();
      return { error: null };
      
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error instanceof Error ? error : new Error('Failed to sign in. Please try again.') };
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, name: string, role: UserRole = 'external'): Promise<{ error: Error | null }> => {
    try {
      const actualRole = getRoleForEmail(email);
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (!error && data.user) {
        try {
          await supabase.from('crm_users').insert({
            id: data.user.id,
            name: name || getNameForEmail(email),
            email,
            role: actualRole,
            badges: getBadgesForEmail(email),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`
          });
        } catch (insertError) {
          console.warn('Could not create user profile during signup:', insertError);
        }
      }
      
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error instanceof Error ? error : new Error('Failed to sign up') };
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: `${window.location.origin}/reset-password` 
      });
      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error instanceof Error ? error : new Error('Failed to reset password') };
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      const { error } = await supabase.from('crm_users').update(updates).eq('id', user.id);
      if (!error) {
        setProfile(p => p ? { ...p, ...updates } : null);
      }
      return { error };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error: error instanceof Error ? error : new Error('Failed to update profile') };
    }
  };

  const value: AuthContextType = {
    user, 
    profile, 
    session, 
    loading, 
    signIn,
    signUp,
    signOut: handleSignOut,
    resetPassword,
    updateProfile,
    extendSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionTimeoutModal 
        isOpen={showTimeoutModal} 
        timeRemaining={timeRemaining} 
        onExtend={extendSession} 
        onLogout={handleSignOut} 
      />
    </AuthContext.Provider>
  );
};