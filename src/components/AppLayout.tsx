import React, { useState, useEffect } from 'react';
import { Header, BottomNav, Sidebar, QuickAddModal, OnboardingModal, VelocityDashboard, BulkImportWizard } from './crm';
import type { EntityType as BulkEntityType } from './crm';
import {
  OpportunitiesScreen,
  AccountsScreen,
  PartnersScreen,
  ContactsScreen,
  SearchScreen,
  ActivityTimelineScreen,
  TasksScreen,
  ProjectsScreen,
  PulseScreen
} from './screens';
import { useAuth } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { supabase } from '@/lib/supabase';


type Tab = 'home' | 'accounts' | 'opportunities' | 'partners' | 'contacts' | 'search' | 'timeline' | 'tasks' | 'projects' | 'pulse';
type EntityType = 'Account' | 'Opportunity';

export default function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const {
    accounts,
    partners,
    opportunities,
    contacts,
    users,
    createAccount,
    createOpportunity,
    createActivity,
    createContact,
    createPartner,
    createProject,
    refreshData
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [autoOpenId, setAutoOpenId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  // Keyboard shortcuts
  const shortcuts = useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'h',
        alt: true,
        description: 'Go to Dashboard',
        action: () => setActiveTab('home'),
      },
      {
        key: 'd',
        alt: true,
        description: 'Go to Deals',
        action: () => setActiveTab('opportunities'),
      },
      {
        key: 'a',
        alt: true,
        description: 'Go to Accounts',
        action: () => setActiveTab('accounts'),
      },
      {
        key: 'p',
        alt: true,
        description: 'Go to Partners',
        action: () => setActiveTab('partners'),
      },
      {
        key: 'c',
        alt: true,
        description: 'Go to Contacts',
        action: () => setActiveTab('contacts'),
      },
      {
        key: 'j',
        alt: true,
        description: 'Go to Projects',
        action: () => setActiveTab('projects'),
      },
      {
        key: 't',
        alt: true,
        description: 'Go to Tasks',
        action: () => setActiveTab('tasks'),
      },
      {
        key: 'n',
        alt: true,
        description: 'Create new entry',
        action: () => setShowQuickAdd(true),
      },
      {
        key: 'k',
        ctrl: true,
        description: 'Search',
        action: () => setActiveTab('search'),
      },
      {
        key: '/',
        description: 'Toggle shortcuts help',
        action: () => setShowShortcutsHelp(!showShortcutsHelp),
        preventDefault: true,
      },
      {
        key: '?',
        shift: true,
        description: 'Toggle shortcuts help',
        action: () => setShowShortcutsHelp(!showShortcutsHelp),
      },
      {
        key: 'Escape',
        description: 'Close modals',
        action: () => {
          setShowQuickAdd(false);
          setShowBulkImport(false);
          setShowShortcutsHelp(false);
        },
        preventDefault: false,
      },
    ],
    enabled: true,
  });

  // Remove automatic redirect - allow users to see the app with login button
  // Protected features will prompt for login when accessed


  const handleDeepLink = (tab: Tab, id?: string) => {
    setActiveTab(tab);
    if (id) {
        setAutoOpenId(id);
        setTimeout(() => setAutoOpenId(null), 2000);
    }
  };

  const handleNavigateWithStageFilter = (tab: Tab, stage?: string) => {
    setActiveTab(tab);
    if (stage) {
      setStageFilter(stage);
      setTimeout(() => setStageFilter(null), 300);
    }
  };

  const handleAddActivity = async (data: any) => {
    try {
      await createActivity({
        type: data.type,
        summary: data.summary,
        details: data.details,
        relatedToId: data.relatedToId,
        relatedToType: data.relatedToType,
        createdById: user?.id || '',
        isTask: data.isTask,
        assignedToId: data.assignedToId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority,
        taskStatus: data.taskStatus,
      });
      toast({ 
        title: data.isTask ? 'Task Created' : 'Activity Logged', 
        description: data.summary 
      });
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to create activity',
        variant: 'destructive'
      });
    }
  };

  const handleAddEntity = async (entityType: EntityType, data: Record<string, any>) => {
    try {
      if (entityType === 'Account') {
        const newAccount = await createAccount({
          name: data.name,
          country: data.country,
          sector: data.sector,
          industry: data.industry,
          subIndustry: data.subIndustry,
          strategicImportance: data.strategicImportance,
          notes: data.notes,
          linkedPartnerIds: data.linkedPartnerIds || [],
          ownerId: user?.id,
        });
        toast({ 
          title: 'Customer Created', 
          description: `${newAccount.name} has been added successfully.` 
        });
        // Navigate to accounts tab to see the new customer
        setActiveTab('accounts');
      } else if (entityType === 'Opportunity') {
        const newOpp = await createOpportunity({
          name: data.name,
          accountId: data.accountId,
          value: data.value,
          stage: data.stage,
          priority: data.priority,
          targetCapacity: data.targetCapacity,
          reType: data.reType,
          sector: data.sector,
          industry: data.industry,
          subIndustry: data.subIndustry,
          nextAction: data.nextAction,
          nextActionDate: data.nextActionDate,
          notes: data.notes,
          ownerId: data.ownerId || user?.id || '',
          linkedPartnerIds: data.linkedPartnerIds || [],
        });
        toast({ 
          title: 'Deal Created', 
          description: `${newOpp.name} has been added successfully.` 
        });
        // Navigate to opportunities tab to see the new deal
        setActiveTab('opportunities');
      }
    } catch (error) {
      console.error('Error creating entity:', error);
      throw error; // Re-throw so QuickAddModal can handle it
    }
  };

  // Handle bulk import
  const handleBulkImport = async (
    entityType: BulkEntityType,
    data: Record<string, any>[],
    options?: {
      defaultRelType?: string;
      defaultStrength?: number;
      defaultTags?: string;
    }
  ) => {
    console.log(`Starting bulk import of ${data.length} ${entityType}(s)`);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const item of data) {
      try {
        console.log(`Importing ${entityType}:`, item.name || item.fullName);
        switch (entityType) {
          case 'Contact':
            // Resolve Tags - merge CSV tags with defaults
            const csvTags = item.tags
              ? (typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()) : item.tags)
              : [];
            const defaultTagsArr = options?.defaultTags
              ? options.defaultTags.split(',').map(t => t.trim()).filter(t => t)
              : [];
            const combinedTags = [...new Set([...csvTags, ...defaultTagsArr])];

            const newContact = await createContact({
              fullName: item.fullName || '',
              role: item.role || '',
              email: item.email || '',
              phone: item.phone || '',
              country: item.country || '',
              city: item.city || '',
              tags: combinedTags,
              relationshipNotes: item.relationshipNotes || '',
              accountId: item.accountId || undefined,
              partnerId: item.partnerId || undefined,
            });

            // Auto-create Nexus relationship: Importer "Knows" the imported contact
            if (newContact?.id && user?.id) {
              try {
                // Resolve relationship data
                const relType = item.relationshipType || options?.defaultRelType || 'Knows';
                const relStrength = parseInt(item.strength) || options?.defaultStrength || 3;
                const relNotes = item.connectionNotes || 'Imported via Bulk Upload';

                await supabase.from('relationships').insert({
                  from_entity_id: user.id,
                  from_entity_type: 'User',
                  to_entity_id: newContact.id,
                  to_entity_type: 'Contact',
                  type: relType,
                  strength: relStrength,
                  notes: relNotes,
                  created_by: user.id
                });
              } catch (relError: any) {
                console.warn(`Failed to create relationship for ${item.fullName}:`, relError.message);
              }
            }
            break;
          case 'Account':
            await createAccount({
              name: item.name || '',
              country: item.country || '',
              sector: item.sector || '',
              industry: item.industry || '',
              subIndustry: item.subIndustry || '',
              strategicImportance: item.strategicImportance || 'Medium',
              notes: item.notes || '',
              linkedPartnerIds: [],
              ownerId: item.ownerId || user?.id,
            });
            break;
          case 'Opportunity':
            await createOpportunity({
              name: item.name || '',
              accountId: item.accountId || '',
              value: item.value || 0,
              stage: item.stage || 'Prospect',
              priority: item.priority || 'Medium',
              targetCapacity: item.targetCapacity || 0,
              reType: item.reType || [],
              sector: item.sector || '',
              industry: item.industry || '',
              subIndustry: item.subIndustry || '',
              nextAction: item.nextAction || '',
              notes: item.notes || '',
              ownerId: item.ownerId || user?.id || '',
              linkedPartnerIds: [],
            });
            break;
          case 'Project':
            await createProject({
              name: item.name || '',
              country: item.country || '',
              capacity: item.capacity || 0,
              status: item.status || 'Won',
              linkedAccountId: item.linkedAccountId || '',
              ownerId: item.ownerId || user?.id || '',
              linkedPartnerIds: [],
              notes: item.notes || '',
            });
            break;
          case 'Partner':
            const newPartner = await createPartner({
              name: item.name || '',
              region: item.region || '',
              country: item.country || '',
              email: item.email || '',
              phone: item.phone || '',
              notes: item.notes || '',
              ownerId: item.ownerId || user?.id || '',
            });

            // Auto-create Nexus relationship: Importer "Knows" the imported partner
            if (newPartner?.id && user?.id) {
              try {
                // Resolve relationship data
                const relType = item.relationshipType || options?.defaultRelType || 'Knows';
                const relStrength = parseInt(item.strength) || options?.defaultStrength || 3;
                const relNotes = item.connectionNotes || 'Imported via Bulk Upload';

                await supabase.from('relationships').insert({
                  from_entity_id: user.id,
                  from_entity_type: 'User',
                  to_entity_id: newPartner.id,
                  to_entity_type: 'Partner',
                  type: relType,
                  strength: relStrength,
                  notes: relNotes,
                  created_by: user.id
                });
              } catch (relError: any) {
                console.warn(`Failed to create relationship for ${item.name}:`, relError.message);
              }
            }
            break;
        }
        successCount++;
        console.log(`✓ Successfully imported ${item.name || item.fullName} (${successCount}/${data.length})`);
      } catch (error: any) {
        failCount++;
        const errorMsg = `${item.name || item.fullName || 'Unknown'}: ${error.message || 'Failed'}`;
        console.error(`✗ Failed to import:`, errorMsg, error);
        errors.push(errorMsg);
      }
    }

    // Refresh data after import
    console.log(`Import complete: ${successCount} succeeded, ${failCount} failed`);
    await refreshData();

    // Show toast with results
    if (failCount === 0) {
      toast({
        title: 'Import Successful',
        description: `Successfully imported ${successCount} ${entityType.toLowerCase()}(s).`,
      });
    } else {
      toast({
        title: 'Import Completed with Errors',
        description: `${successCount} succeeded, ${failCount} failed.`,
        variant: 'destructive',
      });
    }

    // Navigate to the appropriate tab
    const tabMap: Record<BulkEntityType, Tab> = {
      Contact: 'contacts',
      Account: 'accounts',
      Opportunity: 'opportunities',
      Project: 'projects',
      Partner: 'partners',
    };
    setActiveTab(tabMap[entityType]);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <VelocityDashboard
            onNavigate={setActiveTab}
            onNavigateWithStageFilter={handleNavigateWithStageFilter}
            onOpportunityClick={(id) => handleDeepLink('opportunities', id)}
          />
        );
      case 'opportunities': return <OpportunitiesScreen forcedOpenId={autoOpenId} forcedStageFilter={stageFilter} />;
      case 'accounts': return <AccountsScreen forcedOpenId={autoOpenId} />;
      case 'partners': return <PartnersScreen forcedOpenId={autoOpenId} />;
      case 'contacts': return <ContactsScreen forcedOpenId={autoOpenId} />;
      case 'projects': return <ProjectsScreen forcedOpenId={autoOpenId} />;
      case 'tasks': return <TasksScreen />;
      case 'pulse': return <PulseScreen forcedOpenId={autoOpenId} />;
      case 'timeline': return <ActivityTimelineScreen />;
      case 'search': return <SearchScreen />;
      default:
        return (
          <VelocityDashboard
            onNavigate={setActiveTab}
            onNavigateWithStageFilter={handleNavigateWithStageFilter}
            onOpportunityClick={(id) => handleDeepLink('opportunities', id)}
          />
        );
    }
  };


  const titles: Record<Tab, string> = {
    home: 'Dashboard', 
    accounts: 'Accounts', 
    opportunities: 'Deals',
    partners: 'Partners', 
    contacts: 'Contacts', 
    projects: 'Projects',
    search: 'Search', 
    timeline: 'Timeline', 
    tasks: 'Tasks'
  };

  // Prepare entities for QuickAddModal
  const entitiesForModal = {
    accounts: accounts.map(a => ({ id: a.id, name: a.name })),
    partners: partners.map(p => ({ id: p.id, name: p.name })),
    opportunities: opportunities.map(o => ({ id: o.id, name: o.name, ownerId: o.ownerId })),
    contacts: contacts.map(c => ({ id: c.id, fullName: c.fullName })),
  };

  return (
    <>
      {/* Skip Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Screen Reader Announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <div className="min-h-screen bg-slate-100 flex overflow-x-hidden max-w-full">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onQuickAdd={() => setShowQuickAdd(true)}
        onBulkImport={() => setShowBulkImport(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area - THIS CONTAINER SCROLLS */}
      <div className="flex-1 flex flex-col h-screen max-w-full min-w-0 overflow-y-auto overflow-x-hidden">
        {/* Header - STICKY WITHIN THIS SCROLLING CONTAINER */}
        <Header
          onQuickAdd={() => setShowQuickAdd(true)}
          onNavigate={handleDeepLink}
          activeTab={activeTab}
          onSearchClick={() => setActiveTab('search')}
        />

        {/* Main Content - No scroll, just layout */}
        <main
          id="main-content"
          className={`flex-1 ${
            activeTab === 'pulse'
              ? 'p-0 pb-20'
              : 'p-3 sm:p-4 lg:p-8 pb-24 lg:pb-8'
          }`}
        >
          <div className={activeTab === 'pulse' ? '' : 'max-w-7xl mx-auto w-full'}>
            {/* Page Title - Desktop */}
            {activeTab !== 'home' && activeTab !== 'search' && activeTab !== 'opportunities' && activeTab !== 'pulse' && (
              <div className="mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{titles[activeTab]}</h1>
                <p className="text-slate-500 mt-1 hidden lg:block">
                  {activeTab === 'accounts' && 'Manage your customer accounts and relationships'}
                  {activeTab === 'partners' && 'Manage your partner network and collaborations'}
                  {activeTab === 'contacts' && 'View and manage your contacts'}
                  {activeTab === 'projects' && 'Track project development and capacity'}
                  {activeTab === 'tasks' && 'View and manage your tasks and to-dos'}
                  {activeTab === 'timeline' && 'Activity history and timeline'}
                </p>
              </div>
            )}

            {renderScreen()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdd={handleAddActivity}
        onAddEntity={handleAddEntity}
        entities={entitiesForModal}
        users={users}
      />

      {/* Bulk Import Wizard */}
      {showBulkImport && (
        <BulkImportWizard
          onImport={handleBulkImport}
          onClose={() => setShowBulkImport(false)}
          existingAccounts={accounts}
          existingPartners={partners}
          currentUserId={user?.id}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts.shortcuts}
      />

      </div>
    </>
  );
}
