import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Partner, Account, Contact, Opportunity, Project, Activity, Relationship, User } from '../types/crm';
import * as api from '../lib/api';
import { fetchUsers } from '../lib/api/users';
import { useAuth, UserProfile } from './AuthContext';
import { useAnnouncer } from '../hooks/useAnnouncer';

interface CRMState {
  partners: Partner[]; accounts: Account[]; contacts: Contact[]; opportunities: Opportunity[];
  projects: Project[]; activities: Activity[]; relationships: Relationship[]; users: User[];
  loading: boolean; error: string | null;
  searchQuery: string;
}

interface AppContextType extends CRMState {
  currentUser: UserProfile | null;
  refreshData: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  createPartner: (p: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Partner>;
  updatePartner: (id: string, u: Partial<Partner>) => Promise<Partner>;
  deletePartner: (id: string) => Promise<void>;
  createAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Account>;
  updateAccount: (id: string, u: Partial<Account>) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  createContact: (c: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  updateContact: (id: string, u: Partial<Contact>) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  createOpportunity: (o: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Opportunity>;
  updateOpportunity: (id: string, u: Partial<Opportunity>) => Promise<Opportunity>;
  deleteOpportunity: (id: string) => Promise<void>;
  createProject: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, u: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  createActivity: (a: Omit<Activity, 'id' | 'createdAt'>) => Promise<Activity>;
  updateActivity: (id: string, u: Partial<Activity>) => Promise<Activity>;
  deleteActivity: (id: string) => Promise<void>;

  createRelationship: (r: Omit<Relationship, 'id'>) => Promise<Relationship>;
  deleteRelationship: (id: string) => Promise<void>;
  canEdit: (ownerId?: string) => boolean;
  canDelete: (ownerId?: string) => boolean;
  canCreate: () => boolean;
}

const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => { const ctx = useContext(AppContext); if (!ctx) throw new Error('useAppContext must be used within AppProvider'); return ctx; };

const emptyState: CRMState = { partners: [], accounts: [], contacts: [], opportunities: [], projects: [], activities: [], relationships: [], users: [], loading: false, error: null, searchQuery: '' };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user, loading: authLoading } = useAuth();
  const [state, setState] = useState<CRMState>({ ...emptyState, loading: true });
  const mountedRef = useRef(true);
  const { announce } = useAnnouncer();

  const refreshData = useCallback(async () => {
    if (!mountedRef.current) return;
    setState(s => ({ ...s, loading: true, error: null }));
    
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      if (mountedRef.current) setState(s => ({ ...s, loading: false, error: 'Timeout' }));
    }, 8000);

    try {
      const [partners, accounts, contacts, opportunities, projects, activities, relationships, users] = await Promise.all([
        api.fetchPartners().catch(() => []), api.fetchAccounts().catch(() => []), api.fetchContacts().catch(() => []),
        api.fetchOpportunities().catch(() => []), api.fetchProjects().catch(() => []),
        api.fetchActivities().catch(() => []), api.fetchRelationships().catch(() => []), fetchUsers().catch(() => [])
      ]);
      clearTimeout(timeoutId);
      if (mountedRef.current && !timedOut) setState(s => ({ ...s, partners, accounts, contacts, opportunities, projects, activities, relationships, users, loading: false, error: null }));
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (mountedRef.current && !timedOut) setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    // 1. Wait for Auth to finish initializing
    if (authLoading) return;

    // 2. If no user, do not fetch (RLS would block it anyway)
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // 3. User is ready - Fetch Data
    mountedRef.current = true;
    refreshData();

    return () => { mountedRef.current = false; };
  }, [refreshData, user, authLoading]);


  const canEdit = (ownerId?: string) => !profile ? false : profile.role === 'super_admin' || profile.role === 'admin' || profile.role === 'internal' || ownerId === profile.id;
  const canDelete = (ownerId?: string) => !profile ? false : profile.role === 'super_admin' || profile.role === 'admin' || ownerId === profile.id;
  const canCreate = () => profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'internal';

  const setSearchQuery = (query: string) => {
    setState(s => ({ ...s, searchQuery: query }));
  };

  const value: AppContextType = {
    ...state, currentUser: profile, refreshData, setSearchQuery, canEdit, canDelete, canCreate,
    createPartner: async (p) => { const r = await api.createPartner(p); setState(s => ({ ...s, partners: [...s.partners, r] })); announce(`Partner ${r.name} created`); return r; },
    updatePartner: async (id, u) => { const r = await api.updatePartner(id, u); setState(s => ({ ...s, partners: s.partners.map(p => p.id === id ? r : p) })); announce(`Partner ${r.name} updated`); return r; },
    deletePartner: async (id) => { const partner = state.partners.find(p => p.id === id); await api.deletePartner(id); setState(s => ({ ...s, partners: s.partners.filter(p => p.id !== id) })); announce(`Partner ${partner?.name || ''} deleted`); },
    createAccount: async (a) => { const r = await api.createAccount(a); setState(s => ({ ...s, accounts: [...s.accounts, r] })); announce(`Account ${r.name} created`); return r; },
    updateAccount: async (id, u) => { const r = await api.updateAccount(id, u); setState(s => ({ ...s, accounts: s.accounts.map(a => a.id === id ? r : a) })); announce(`Account ${r.name} updated`); return r; },
    deleteAccount: async (id) => { const account = state.accounts.find(a => a.id === id); await api.deleteAccount(id); setState(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== id) })); announce(`Account ${account?.name || ''} deleted`); },
    createContact: async (c) => { const r = await api.createContact(c); setState(s => ({ ...s, contacts: [...s.contacts, r] })); announce(`Contact ${r.fullName} created`); return r; },
    updateContact: async (id, u) => { const r = await api.updateContact(id, u); setState(s => ({ ...s, contacts: s.contacts.map(c => c.id === id ? r : c) })); announce(`Contact ${r.fullName} updated`); return r; },
    deleteContact: async (id) => { const contact = state.contacts.find(c => c.id === id); await api.deleteContact(id); setState(s => ({ ...s, contacts: s.contacts.filter(c => c.id !== id) })); announce(`Contact ${contact?.fullName || ''} deleted`); },
    createOpportunity: async (o) => { const r = await api.createOpportunity(o); setState(s => ({ ...s, opportunities: [...s.opportunities, r] })); announce(`Deal ${r.name} created`); return r; },
    updateOpportunity: async (id, u) => { const r = await api.updateOpportunity(id, u); setState(s => ({ ...s, opportunities: s.opportunities.map(o => o.id === id ? r : o) })); announce(`Deal ${r.name} updated`); return r; },
    deleteOpportunity: async (id) => { const opp = state.opportunities.find(o => o.id === id); await api.deleteOpportunity(id); setState(s => ({ ...s, opportunities: s.opportunities.filter(o => o.id !== id) })); announce(`Deal ${opp?.name || ''} deleted`); },
    createProject: async (p) => { const r = await api.createProject(p); setState(s => ({ ...s, projects: [...s.projects, r] })); announce(`Project ${r.name} created`); return r; },
    updateProject: async (id, u) => { const r = await api.updateProject(id, u); setState(s => ({ ...s, projects: s.projects.map(p => p.id === id ? r : p) })); announce(`Project ${r.name} updated`); return r; },
    deleteProject: async (id) => { const project = state.projects.find(p => p.id === id); await api.deleteProject(id); setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) })); announce(`Project ${project?.name || ''} deleted`); },
    createActivity: async (a) => { const r = await api.createActivity(a); setState(s => ({ ...s, activities: [r, ...s.activities] })); announce(`Activity ${r.summary} created`); return r; },
    updateActivity: async (id, u) => { const r = await api.updateActivity(id, u); setState(s => ({ ...s, activities: s.activities.map(a => a.id === id ? r : a) })); announce(`Activity updated`); return r; },
    deleteActivity: async (id) => { await api.deleteActivity(id); setState(s => ({ ...s, activities: s.activities.filter(a => a.id !== id) })); announce(`Activity deleted`); },

    createRelationship: async (r) => { const res = await api.createRelationship(r); setState(s => ({ ...s, relationships: [...s.relationships, res] })); announce('Relationship created'); return res; },
    deleteRelationship: async (id) => { await api.deleteRelationship(id); setState(s => ({ ...s, relationships: s.relationships.filter(r => r.id !== id) })); announce('Relationship deleted'); },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
