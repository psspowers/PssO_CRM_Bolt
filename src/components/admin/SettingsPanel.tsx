import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, RefreshCw, Database, AlertTriangle, Loader2 } from 'lucide-react';

// Import seed functions
import { seedUsers, seedAccounts } from '@/lib/seedData';
import { seedPartners, seedAccountPartners } from '@/lib/seedPartners';
import { seedContacts } from '@/lib/seedContacts';
import { seedOpportunities } from '@/lib/seedOpportunities';
import { seedProjects, seedActivities } from '@/lib/seedProjects';
import { seedRelationships, seedOpportunityPartners, seedProjectPartners } from '@/lib/seedRelationships';

interface Setting {
  id: string; key: string; value: any; description?: string;
}

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSettings = async () => {
    const { data } = await supabase.from('crm_settings').select('*').order('key');
    if (data) setSettings(data.map(s => ({ ...s, value: typeof s.value === 'string' ? JSON.parse(s.value) : s.value })));
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(s => s.map(setting => setting.key === key ? { ...setting, value } : setting));
  };

  const saveSettings = async () => {
    setSaving(true);
    for (const setting of settings) {
      await supabase.from('crm_settings').update({ 
        value: JSON.stringify(setting.value), 
        updated_by: user?.id, 
        updated_at: new Date().toISOString() 
      }).eq('key', setting.key);
    }
    toast({ title: 'Settings saved', description: 'All settings have been updated' });
    setSaving(false);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedProgress('Starting...');
    
    try {
      // Execute seed functions in order (respecting foreign keys)
      setSeedProgress('Seeding users...');
      const usersCount = await seedUsers();
      
      setSeedProgress('Seeding partners...');
      const partnersCount = await seedPartners();
      
      setSeedProgress('Seeding accounts...');
      const accountsCount = await seedAccounts();
      
      setSeedProgress('Seeding account-partner relationships...');
      const accountPartnersCount = await seedAccountPartners();
      
      setSeedProgress('Seeding contacts...');
      const contactsCount = await seedContacts();
      
      setSeedProgress('Seeding opportunities...');
      const opportunitiesCount = await seedOpportunities();
      
      setSeedProgress('Seeding opportunity-partner relationships...');
      const oppPartnersCount = await seedOpportunityPartners();
      
      setSeedProgress('Seeding projects...');
      const projectsCount = await seedProjects();
      
      setSeedProgress('Seeding project-partner relationships...');
      const projPartnersCount = await seedProjectPartners();
      
      setSeedProgress('Seeding activities...');
      const activitiesCount = await seedActivities();
      
      setSeedProgress('Seeding relationships...');
      const relationshipsCount = await seedRelationships();
      
      setSeedProgress('');
      
      toast({ 
        title: 'Database populated successfully', 
        description: `Seeded: ${usersCount} users, ${partnersCount} partners, ${accountsCount} accounts, ${contactsCount} contacts, ${opportunitiesCount} opportunities, ${projectsCount} projects, ${activitiesCount} activities, ${relationshipsCount} relationships, plus join tables.`,
      });
    } catch (error: any) {
      console.error('Seed error:', error);
      setSeedProgress('');
      toast({ 
        title: 'Seeding failed', 
        description: error.message || 'An error occurred while populating the database',
        variant: 'destructive'
      });
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  const renderSetting = (setting: Setting) => {
    const isBool = setting.value === true || setting.value === false || setting.value === 'true' || setting.value === 'false';
    const isNum = typeof setting.value === 'number' || !isNaN(Number(setting.value));
    
    if (isBool) {
      const boolVal = setting.value === true || setting.value === 'true';
      return (
        <div key={setting.key} className="flex items-center justify-between p-4 bg-white rounded-lg border">
          <div>
            <Label className="font-medium">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
            <p className="text-xs text-gray-500">{setting.description}</p>
          </div>
          <Switch checked={boolVal} onCheckedChange={(v) => updateSetting(setting.key, v)} />
        </div>
      );
    }
    
    return (
      <div key={setting.key} className="p-4 bg-white rounded-lg border space-y-2">
        <Label className="font-medium">{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
        <p className="text-xs text-gray-500">{setting.description}</p>
        <Input 
          type={isNum ? 'number' : 'text'} 
          value={setting.value} 
          onChange={(e) => updateSetting(setting.key, isNum ? Number(e.target.value) : e.target.value)} 
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Application Settings Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Application Settings</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSettings}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
            <Button onClick={saveSettings} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
        <div className="grid gap-4">{settings.map(renderSetting)}</div>
      </div>

      {/* Developer Tools Section */}
      <div className="space-y-4 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Developer Tools</h3>
        </div>
        <p className="text-sm text-gray-500">
          These tools are for development and testing purposes. Use with caution in production environments.
        </p>
        
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Seed Database with Test Data</h4>
              <p className="text-sm text-gray-600 mt-1">
                Populate the database with sample data including users, partners, accounts, contacts, 
                opportunities, projects, activities, and relationships. This will upsert records 
                (update existing or insert new).
              </p>
              {seedProgress && (
                <p className="text-sm text-amber-700 mt-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {seedProgress}
                </p>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleSeedData} 
            disabled={seeding}
            variant="outline"
            className="border-amber-300 hover:bg-amber-100 text-amber-800"
          >
            {seeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Populating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Populate Test Data
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
