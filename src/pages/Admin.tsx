import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { ActivityLogs } from '@/components/admin/ActivityLogs';
import { SettingsPanel } from '@/components/admin/SettingsPanel';
import { OrgChart } from '@/components/admin/OrgChart';
import { GamificationConsole } from '@/components/admin/GamificationConsole';
import { UserDropdown } from '@/components/crm/UserDropdown';
import { Users, Activity, Settings, Shield, ArrowLeft, Network, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface AdminStatsProps {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
}

const AdminStats: React.FC<AdminStatsProps> = ({ totalUsers, activeUsers, adminUsers }) => {
  const stats = [
    { label: 'Total Users', value: String(totalUsers), icon: Users, color: 'bg-blue-500' },
    { label: 'Active Users', value: String(activeUsers), icon: Activity, color: 'bg-green-500' },
    { label: 'Admin Users', value: String(adminUsers), icon: Shield, color: 'bg-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const Admin: React.FC = () => {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, adminUsers: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('crm_users')
        .select('role, is_active');

      if (data) {
        const totalUsers = data.length;
        const activeUsers = data.filter(u => u.is_active !== false).length;
        const adminUsers = data.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
        setStats({ totalUsers, activeUsers, adminUsers });
      }
      setStatsLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <UserDropdown />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <AdminStats
          totalUsers={stats.totalUsers}
          activeUsers={stats.activeUsers}
          adminUsers={stats.adminUsers}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-emerald-50/50 border-none p-2 ring-2 ring-orange-500 ring-inset rounded-xl">
            <TabsTrigger value="users" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700 font-bold">
              <Users className="w-4 h-4 mr-2" />Users
            </TabsTrigger>
            <TabsTrigger value="org-chart" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700 font-bold">
              <Network className="w-4 h-4 mr-2" />Org Chart
            </TabsTrigger>
            <TabsTrigger value="gamification" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700 font-bold">
              <Zap className="w-4 h-4 mr-2" />Rewards System
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700 font-bold">
              <Activity className="w-4 h-4 mr-2" />Activity Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=inactive]:text-emerald-700 font-bold">
              <Settings className="w-4 h-4 mr-2" />Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users"><UserManagement /></TabsContent>
          <TabsContent value="org-chart"><OrgChart /></TabsContent>
          <TabsContent value="gamification"><GamificationConsole /></TabsContent>
          <TabsContent value="activity"><ActivityLogs /></TabsContent>
          <TabsContent value="settings"><SettingsPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;

