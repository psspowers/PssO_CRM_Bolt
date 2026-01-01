import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import TwoFactorSettings from '@/components/settings/TwoFactorSettings';
import LoginHistory from '@/components/settings/LoginHistory';
import TrustedDevices from '@/components/settings/TrustedDevices';
import ProfileSettings from '@/components/settings/ProfileSettings';
import { ArrowLeft, User, Shield, Palette, Sun, Moon, Monitor, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState('security');
  
  // Appearance settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    // In a real app, this would persist to localStorage and update the theme
    localStorage.setItem('pss_theme', newTheme);
  };

  const handleForceAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('crm_users').upsert({
        id: user.id,
        email: user.email,
        name: 'Sam Yamdagni',
        role: 'admin',
        is_active: true,
        badges: ['Super Admin']
      }, { onConflict: 'id' });

      if (error) {
        alert("Error: " + error.message);
      } else {
        alert("Success! You are now Admin. The page will reload.");
        window.location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Manage your account preferences</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Emergency Admin Restore Section */}
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Emergency Admin Restore</h3>
              <p className="text-sm text-red-700 mb-4">
                If you are locked out of the Admin Panel or your role is incorrect, use this button to restore full admin access.
              </p>
              <Button
                onClick={handleForceAdminAccess}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Force Admin Access
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border p-1 h-auto flex-wrap">
            <TabsTrigger value="security" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 gap-2">
              <Shield className="w-4 h-4" />Security
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 gap-2">
              <User className="w-4 h-4" />Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 gap-2">
              <Palette className="w-4 h-4" />Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="mt-6 space-y-6">
            <TwoFactorSettings />
            <TrustedDevices />
            <LoginHistory />
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">Password</h3>
              <p className="text-sm text-gray-500 mb-4">Change your password to keep your account secure.</p>
              <Button variant="outline" onClick={() => navigate('/forgot-password')}>Change Password</Button>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="appearance" className="mt-6 space-y-6">
            {/* Theme Selection */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Theme
              </h3>
              <p className="text-sm text-gray-500 mb-4">Choose your preferred color theme for the application.</p>
              
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === 'light' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Sun className="w-6 h-6 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium">Light</span>
                  </div>
                </button>

                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                      <Moon className="w-6 h-6 text-slate-200" />
                    </div>
                    <span className="text-sm font-medium">Dark</span>
                  </div>
                </button>

                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === 'system' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-slate-800 flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-gray-600" />
                    </div>
                    <span className="text-sm font-medium">System</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Display Options */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="text-lg font-semibold mb-4">Display Options</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="compact-mode" className="text-base font-medium">Compact Mode</Label>
                    <p className="text-sm text-gray-500">Reduce spacing and padding for a denser layout</p>
                  </div>
                  <Switch
                    id="compact-mode"
                    checked={compactMode}
                    onCheckedChange={setCompactMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="animations" className="text-base font-medium">Animations</Label>
                    <p className="text-sm text-gray-500">Enable smooth transitions and animations</p>
                  </div>
                  <Switch
                    id="animations"
                    checked={animations}
                    onCheckedChange={setAnimations}
                  />
                </div>
              </div>
            </div>

            {/* Preview Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Theme changes are saved locally. Dark mode and additional customization options will be fully implemented in a future update.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
