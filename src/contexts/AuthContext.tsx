/**
 * Authentication Context
 * Manages user authentication state
 *
 * CRITICAL PRINCIPLE: SINGLE SOURCE OF TRUTH
 * =========================================
 * The crm_users table in the database is the ONLY source of truth for:
 * - User roles (admin, super_admin, internal, external)
 * - User names
 * - User badges
 * - All other user attributes
 *
 * Email-based logic (getDefaultRoleForEmail) is ONLY used when creating
 * a NEW user for the first time. After creation, all user data comes
 * exclusively from the crm_users table.
 *
 * NEVER override database values based on email address patterns.
 * To change a user's role, update the crm_users table directly.
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
const SESSION_START_KEY = 'pss_session_start';
const SESSION_WARNING_TIME = 10 * 60; // 10 minutes before expiry
const SHORT_SESSION = 3 * 60 * 60; // 3 hours
const LONG_SESSION = 30 * 24 * 60 * 60; // 30 days

// Helper to determine DEFAULT role for NEW users based on email
// NOTE: This is ONLY used when creating a new user for the first time
// After creation, the crm_users table is the SINGLE SOURCE OF TRUTH
const getDefaultRoleForEmail = (email: string): UserRole => {
  if (email.toLowerCase() === 'sam@psspowers.com') {
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
      // First, try to fetch by ID from database (DATABASE IS SOURCE OF TRUTH)
      const { data: dataById } = await supabase
        .from('crm_users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Defensive: Handle unexpected array response
      const profileData = Array.isArray(dataById) ? dataById[0] : dataById;

      if (profileData) {
        // USE DATABASE ROLE - No overrides!
        return {
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
          role: profileData.role,
          avatar: profileData.avatar,
          badges: profileData.badges || [],
          password_change_required: profileData.password_change_required || false
        };
      }
      
      // If not found by ID and we have an email, try to fetch by email
      if (userEmail) {
        const { data: dataByEmail } = await supabase
          .from('crm_users')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        // Defensive: Handle unexpected array response
        const emailProfileData = Array.isArray(dataByEmail) ? dataByEmail[0] : dataByEmail;

        if (emailProfileData) {
          // Found by email - update the record to use the auth user ID
          await supabase
            .from('crm_users')
            .update({ id: userId })
            .eq('email', userEmail);

          // USE DATABASE ROLE - No overrides!
          return {
            id: userId,
            name: emailProfileData.name,
            email: emailProfileData.email,
            role: emailProfileData.role,
            avatar: emailProfileData.avatar,
            badges: emailProfileData.badges || [],
            password_change_required: emailProfileData.password_change_required || false
          };
        }
      }

      // No profile found - create a default one for authenticated users
      // Use getDefaultRoleForEmail ONLY for new user creation
      if (userEmail) {
        const defaultRole = getDefaultRoleForEmail(userEmail);
        const defaultName = getNameForEmail(userEmail);
        const defaultBadges = getBadgesForEmail(userEmail);

        const defaultProfile: UserProfile = {
          id: userId,
          name: defaultName,
          email: userEmail,
          role: defaultRole,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=f97316&color=fff&bold=true`,
          badges: defaultBadges,
          password_change_required: false
        };

        // Try to insert the new profile
        await supabase.from('crm_users').insert({
          id: userId,
          name: defaultProfile.name,
          email: userEmail,
          role: defaultRole,
          badges: defaultBadges,
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
          role: getDefaultRoleForEmail(userEmail),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(getNameForEmail(userEmail))}&background=f97316&color=fff`,
          badges: getBadgesForEmail(userEmail)
        };
      }
      
      return null;
    }
  };

  const logSessionEvent = async (
    eventType: 'login' | 'logout' | 'timeout' | 'extend_session' | 'forced_logout' | 'auto_logout',
    logoutReason?: string,
    userId?: string,
    userEmail?: string
  ) => {
    try {
      const userAgent = navigator.userAgent;
      const deviceInfo = {
        browser: /Chrome/.test(userAgent) ? 'Chrome' : /Firefox/.test(userAgent) ? 'Firefox' : /Safari/.test(userAgent) ? 'Safari' : 'Other',
        os: /Windows/.test(userAgent) ? 'Windows' : /Mac/.test(userAgent) ? 'MacOS' : /Linux/.test(userAgent) ? 'Linux' : /Android/.test(userAgent) ? 'Android' : /iOS/.test(userAgent) ? 'iOS' : 'Other',
        deviceType: /Mobi/.test(userAgent) ? 'Mobile' : 'Desktop'
      };

      const sessionStart = localStorage.getItem(SESSION_START_KEY);
      const sessionDuration = sessionStart ? Math.floor((Date.now() - parseInt(sessionStart)) / 1000) : null;
      const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';

      await supabase.from('session_events').insert({
        user_id: userId,
        email: userEmail,
        event_type: eventType,
        logout_reason: logoutReason,
        session_duration_seconds: sessionDuration,
        remember_me: rememberMe,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        user_agent: userAgent
      });
    } catch (error) {
      console.warn('Failed to log session event:', error);
    }
  };

  const handleSignOut = useCallback(async (reason: 'manual' | 'timeout' | 'forced' | 'error' = 'manual') => {
    setShowTimeoutModal(false);

    const currentUserId = user?.id;
    const currentUserEmail = user?.email;

    // Log the logout event with reason
    const eventType = reason === 'timeout' ? 'auto_logout' : reason === 'forced' ? 'forced_logout' : 'logout';
    await logSessionEvent(eventType, reason, currentUserId, currentUserEmail);

    // 1. CLEAR STATE FIRST
    setUser(null);
    setSession(null);
    setProfile(null);

    // 2. CLEAR STORAGE
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(SESSION_START_KEY);

    // Remove ALL Supabase tokens to prevent auto-relogin
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });

    // 3. ATTEMPT SERVER LOGOUT
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Server logout failed, but local session is destroyed:', error);
    }

    // 4. FORCE REDIRECT
    window.location.href = '/login';
  }, [user]);

  const extendSession = useCallback(async () => {
    setShowTimeoutModal(false);
    activityRef.current = Date.now();

    // Log session extension
    await logSessionEvent('extend_session', 'user_extended_session', user?.id, user?.email);

    await supabase.auth.refreshSession();
  }, [user]);

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
      handleSignOut('timeout');
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
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
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
      })();
    });
    
    return () => { 
      mountedRef.current = false; 
      clearTimeout(timeout); 
      subscription.unsubscribe(); 
    };
  }, []);

  // Sign in with timeout protection (default 30-day session)
  const signIn = async (email: string, password: string, rememberMe = true): Promise<{ error: Error | null }> => {
    let userId: string | null = null;

    try {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

      // Collect device info for logging
      const userAgent = navigator.userAgent;
      const deviceInfo = {
        browser: /Chrome/.test(userAgent) ? 'Chrome' : /Firefox/.test(userAgent) ? 'Firefox' : /Safari/.test(userAgent) ? 'Safari' : 'Other',
        os: /Windows/.test(userAgent) ? 'Windows' : /Mac/.test(userAgent) ? 'MacOS' : /Linux/.test(userAgent) ? 'Linux' : /Android/.test(userAgent) ? 'Android' : /iOS/.test(userAgent) ? 'iOS' : 'Other',
        deviceType: /Mobi/.test(userAgent) ? 'Mobile' : 'Desktop'
      };

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
        // Log failed login attempt
        try {
          await supabase.from('login_history').insert({
            email,
            success: false,
            user_agent: userAgent,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device_type: deviceInfo.deviceType,
            failure_reason: result.error.message
          });
        } catch (logError) {
          console.warn('Failed to log failed login attempt:', logError);
        }

        return { error: result.error };
      }

      // Success
      userId = result.data?.user?.id || null;
      activityRef.current = Date.now();

      // Store session start time
      localStorage.setItem(SESSION_START_KEY, Date.now().toString());

      // Log successful login attempt
      try {
        await supabase.from('login_history').insert({
          user_id: userId,
          email,
          success: true,
          user_agent: userAgent,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device_type: deviceInfo.deviceType,
          failure_reason: null
        });
      } catch (logError) {
        console.warn('Failed to log successful login attempt:', logError);
      }

      // Log session start event
      try {
        await supabase.from('session_events').insert({
          user_id: userId,
          email,
          event_type: 'login',
          remember_me: rememberMe,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          user_agent: userAgent
        });
      } catch (logError) {
        console.warn('Failed to log session event:', logError);
      }

      return { error: null };

    } catch (error) {
      console.error('Sign in error:', error);

      // Log unexpected error
      try {
        await supabase.from('login_history').insert({
          email,
          success: false,
          user_agent: navigator.userAgent,
          failure_reason: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (logError) {
        console.warn('Failed to log error login attempt:', logError);
      }

      return { error: error instanceof Error ? error : new Error('Failed to sign in. Please try again.') };
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, name: string, role: UserRole = 'external'): Promise<{ error: Error | null }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const defaultRole = getDefaultRoleForEmail(cleanEmail);
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });

      if (!error && data.user) {
        try {
          await supabase.from('crm_users').insert({
            id: data.user.id,
            name: cleanName || getNameForEmail(cleanEmail),
            email: cleanEmail,
            role: defaultRole,
            badges: getBadgesForEmail(cleanEmail),
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