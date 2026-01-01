import React, { useState, useMemo } from 'react';
import { Search, Building2, Target, Users, Briefcase, FolderKanban } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

type ResultType = 'account' | 'opportunity' | 'partner' | 'contact' | 'project';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

export const SearchScreen: React.FC = () => {
  const { accounts, opportunities, partners, contacts, projects } = useAppContext();
  const [query, setQuery] = useState('');

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const res: SearchResult[] = [];

    accounts.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.country.toLowerCase().includes(q) || 
      (a.sector || '').toLowerCase().includes(q) ||
      (a.industry || '').toLowerCase().includes(q) || 
      (a.subIndustry || '').toLowerCase().includes(q)
    ).forEach(a => res.push({ 
      id: a.id, 
      type: 'account', 
      title: a.name, 
      subtitle: `${a.sector || 'Unclassified'} • ${a.country}`, 
      icon: Building2, 
      color: 'text-blue-600 bg-blue-100' 
    }));

    // Get account name for opportunity display
    const getAccountName = (accountId: string) => accounts.find(a => a.id === accountId)?.name || '';

    opportunities.filter(o => 
      o.name.toLowerCase().includes(q) || 
      getAccountName(o.accountId).toLowerCase().includes(q) ||
      (o.sector || '').toLowerCase().includes(q) ||
      (o.industry || '').toLowerCase().includes(q) ||
      (o.subIndustry || '').toLowerCase().includes(q)
    ).forEach(o => res.push({ 
      id: o.id, 
      type: 'opportunity', 
      title: o.name, 
      subtitle: `${o.stage} • $${(o.value / 1000000).toFixed(1)}M`, 
      icon: Target, 
      color: 'text-emerald-600 bg-emerald-100' 
    }));

    partners.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      .forEach(p => res.push({ id: p.id, type: 'partner', title: p.name, subtitle: `${p.region} • ${p.country}`, icon: Users, color: 'text-purple-600 bg-purple-100' }));

    contacts.filter(c => c.fullName.toLowerCase().includes(q) || c.role.toLowerCase().includes(q))
      .forEach(c => res.push({ id: c.id, type: 'contact', title: c.fullName, subtitle: c.role, icon: Briefcase, color: 'text-amber-600 bg-amber-100' }));

    projects.filter(p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      .forEach(p => res.push({ id: p.id, type: 'project', title: p.name, subtitle: `${p.status} • ${p.capacity} MW`, icon: FolderKanban, color: 'text-orange-600 bg-orange-100' }));

    return res.slice(0, 20);
  }, [query, accounts, opportunities, partners, contacts, projects]);


  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<ResultType, SearchResult[]>);

  const typeLabels: Record<ResultType, string> = {
    account: 'Accounts', opportunity: 'Opportunities', partner: 'Partners', contact: 'Contacts', project: 'Projects'
  };

  return (
    <div className="pb-24 space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search everything..." autoFocus
          className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-lg" />
      </div>

      {!query && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Search across all records</p>
          <p className="text-sm text-gray-400 mt-1">Accounts, opportunities, partners, contacts, projects</p>
        </div>
      )}

      {query && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No results found for "{query}"</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">{typeLabels[type as ResultType]}</h3>
          <div className="space-y-2">
            {items.map(item => (
              <button key={item.id} className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors text-left">
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
