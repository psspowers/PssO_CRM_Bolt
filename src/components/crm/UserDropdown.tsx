import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings, Shield, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  internal: 'bg-blue-100 text-blue-700',
  external: 'bg-gray-100 text-gray-700',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  internal: 'Internal Team',
  external: 'External Partner',
};

export const UserDropdown: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    
    try {
      // Start signOut but don't wait indefinitely
      const signOutPromise = signOut();
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Wait for either signOut to complete or timeout
      await Promise.race([signOutPromise, timeoutPromise]);
      
      toast({ 
        title: 'Signed out', 
        description: 'You have been logged out successfully.' 
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still show success since local state is cleared
      toast({ 
        title: 'Signed out', 
        description: 'You have been logged out.' 
      });
    }
    
    // Always redirect to login page regardless of API result
    window.location.href = '/login';
  };


  // Safety check: If not even the basic auth user exists, don't render
  if (!user) return null;

  // Fallback logic: Use profile data if available, otherwise use Auth data
  const displayName = profile?.name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';
  
  // Determine role - check for admin email pattern as fallback
  let displayRole = profile?.role || 'external';
  if (!profile?.role && user.email) {
    if (user.email === 'sam@psspowers.com') {
      displayRole = 'admin';
    } else if (user.email.endsWith('@psspowers.com')) {
      displayRole = 'internal';
    }
  }
  
  // Generate initials safely
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-gray-100 rounded-full p-2 pr-3 transition-colors outline-none" aria-label="User menu">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover border-2 border-orange-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium text-sm border-2 border-orange-200">
              {initials}
            </div>
          )}

          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium truncate">{displayName}</span>
            <span className="text-xs text-gray-500 font-normal truncate">{displayEmail}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 w-fit ${roleColors[displayRole] || 'bg-gray-100 text-gray-700'}`}>
              {roleLabels[displayRole] || 'User'}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="w-4 h-4 mr-2" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        {(displayRole === 'admin' || displayRole === 'super_admin') && (
          <DropdownMenuItem onClick={() => navigate('/admin')}>
            <Shield className="w-4 h-4 mr-2" />
            Admin Panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="text-red-600 focus:text-red-600"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
