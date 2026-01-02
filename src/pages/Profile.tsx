import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileActivities } from '@/components/profile/ProfileActivities';
import { ProfileEntities } from '@/components/profile/ProfileEntities';

const Profile: React.FC = () => {
  const { profile, user, loading: authLoading } = useAuth();
  const { activities, opportunities, projects, contacts, accounts, loading: dataLoading } = useAppContext();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Filter data for current user
  const userActivities = useMemo(() => 
    activities.filter(a => a.createdById === profile?.id),
    [activities, profile?.id, refreshKey]
  );

  const userOpportunities = useMemo(() =>
    opportunities.filter(o => o.ownerId === profile?.id),
    [opportunities, profile?.id]
  );

  const userProjects = useMemo(() =>
    projects.filter(p => p.ownerId === profile?.id),
    [projects, profile?.id]
  );

  const thisMonthActivities = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return userActivities.filter(a => new Date(a.createdAt) >= startOfMonth).length;
  }, [userActivities]);

  const winRate = useMemo(() => {
    const closed = userOpportunities.filter(o => o.stage === 'Won' || o.stage === 'Lost');
    if (closed.length === 0) return 0;
    const won = closed.filter(o => o.stage === 'Won').length;
    return Math.round((won / closed.length) * 100);
  }, [userOpportunities]);

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  // Show login prompt if no user at all
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Logged In</h2>
          <p className="text-gray-500 mb-6">Please log in to view your profile</p>
          <Button onClick={() => navigate('/login')} className="bg-orange-500 hover:bg-orange-600">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Create a fallback profile from user data if profile is not loaded
  const displayProfile = profile || {
    id: user.id,
    name: user.email?.split('@')[0] || 'User',
    email: user.email || '',
    role: 'external' as const,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email?.split('@')[0] || 'U')}&background=f97316&color=fff`,
    badges: []
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">My Profile</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
            <p className="text-gray-500">Loading your data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProfileHeader profile={displayProfile} onUpdate={() => setRefreshKey(k => k + 1)} />
              <ProfileStats
                activitiesCount={userActivities.length}
                opportunitiesOwned={userOpportunities.length}
                projectsOwned={userProjects.length}
                contactsManaged={contacts.length}
                thisMonthActivities={thisMonthActivities}
                winRate={winRate}
              />
              <ProfileActivities activities={userActivities} />
            </div>
            <div className="space-y-6">
              <ProfileEntities opportunities={userOpportunities} projects={userProjects} accounts={accounts} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
