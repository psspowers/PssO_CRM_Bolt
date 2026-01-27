import React, { useState, useEffect } from 'react';
import { Network, Search, Loader2, ArrowLeft, X, User, Building2, Target, UserSearch } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { NexusOrbitGraph } from '../crm/NexusOrbitGraph';
import { DossierModal } from '../crm/DossierModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NexusPath {
  path: Array<{
    entity_id: string;
    entity_type: string;
    entity_name: string;
    relationship?: string;
    strength?: number;
  }>;
  total_strength: number;
  degrees: number;
  win_probability: number;
}

interface SearchResult {
  id: string;
  name: string;
  type: 'Contact' | 'Account' | 'Partner';
  subtitle?: string;
}

export const NexusScreen: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(null);
  const [paths, setPaths] = useState<NexusPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntityData, setSelectedEntityData] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierContact, setDossierContact] = useState<any>(null);

  // Search for entities
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const contactsPromise = supabase
        .from('contacts')
        .select('id, full_name, role, company')
        .ilike('full_name', `%${query}%`)
        .limit(10);

      const accountsPromise = supabase
        .from('accounts')
        .select('id, name, industry')
        .ilike('name', `%${query}%`)
        .limit(10);

      const partnersPromise = supabase
        .from('partners')
        .select('id, name, partner_type')
        .ilike('name', `%${query}%`)
        .limit(10);

      const [contactsRes, accountsRes, partnersRes] = await Promise.all([
        contactsPromise,
        accountsPromise,
        partnersPromise
      ]);

      const results: SearchResult[] = [];

      if (contactsRes.data) {
        results.push(...contactsRes.data.map(c => ({
          id: c.id,
          name: c.full_name,
          type: 'Contact' as const,
          subtitle: c.role ? `${c.role}${c.company ? ` @ ${c.company}` : ''}` : c.company
        })));
      }

      if (accountsRes.data) {
        results.push(...accountsRes.data.map(a => ({
          id: a.id,
          name: a.name,
          type: 'Account' as const,
          subtitle: a.industry
        })));
      }

      if (partnersRes.data) {
        results.push(...partnersRes.data.map(p => ({
          id: p.id,
          name: p.name,
          type: 'Partner' as const,
          subtitle: p.partner_type
        })));
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch paths for selected entity
  const fetchPaths = async (entityId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_team_nexus_paths', {
        target_entity_id: entityId
      });

      if (error) {
        console.error('RPC error:', error);
        setPaths([]);
      } else {
        setPaths(data || []);
      }
    } catch (err) {
      console.error('Error fetching nexus paths:', err);
      setPaths([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle entity selection
  const handleSelectEntity = (result: SearchResult) => {
    setSelectedEntity(result);
    setSearchResults([]);
    setSearchQuery('');
    fetchPaths(result.id);
  };

  // Handle node click in graph
  const handleNodeClick = async (nodeEntityId: string, nodeEntityType: string) => {
    setSelectedNodeId(nodeEntityId);
    setSelectedNodeType(nodeEntityType);
    setLoadingEntity(true);

    try {
      let tableName = '';

      switch (nodeEntityType) {
        case 'Contact':
          tableName = 'contacts';
          break;
        case 'User':
          tableName = 'crm_users';
          break;
        case 'Account':
          tableName = 'accounts';
          break;
        case 'Partner':
          tableName = 'partners';
          break;
        default:
          return;
      }

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', nodeEntityId)
        .single();

      if (!error && data) {
        setSelectedEntityData(data);
      }
    } catch (err) {
      console.error('Error fetching entity data:', err);
    } finally {
      setLoadingEntity(false);
    }
  };

  const handleCloseEntityDetail = () => {
    setSelectedNodeId(null);
    setSelectedNodeType(null);
    setSelectedEntityData(null);
  };

  const handleOpenDossier = () => {
    if (selectedNodeType === 'Contact' && selectedEntityData) {
      setDossierContact({
        id: selectedNodeId,
        name: selectedEntityData.full_name,
        company: selectedEntityData.company,
        intelligence_dossier: selectedEntityData.intelligence_dossier,
        personality_type: selectedEntityData.personality_type
      });
      setShowDossierModal(true);
    }
  };

  const handleDossierSave = async () => {
    if (selectedNodeId && selectedNodeType === 'Contact') {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', selectedNodeId)
        .maybeSingle();

      if (data) {
        setSelectedEntityData(data);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Network Intelligence</h1>
                <p className="text-sm text-slate-400">Explore team-wide connections and relationship paths</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search Person or Company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-6 text-lg bg-white/10 backdrop-blur-lg border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-purple-500 focus-visible:border-purple-500"
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
              {searchResults.map((result) => {
                const Icon = result.type === 'Contact' ? User : Building2;
                const bgColor =
                  result.type === 'Contact' ? 'bg-cyan-500/20 text-cyan-400' :
                  result.type === 'Account' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-purple-500/20 text-purple-400';

                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectEntity(result)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700 last:border-b-0 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {result.type}
                        </span>
                        <span className="font-semibold text-white truncate">{result.name}</span>
                      </div>
                      {result.subtitle && (
                        <div className="text-sm text-slate-400 mt-0.5 truncate">{result.subtitle}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Entity & Graph */}
        {selectedEntity ? (
          <div className="space-y-6">
            {/* Selected Entity Card */}
            <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedEntity.type === 'Contact' ? 'bg-cyan-500/20 text-cyan-400' :
                    selectedEntity.type === 'Account' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {selectedEntity.type === 'Contact' ? <User className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-purple-500/30 text-purple-300">
                        {selectedEntity.type}
                      </span>
                      <h2 className="text-xl font-bold text-white">{selectedEntity.name}</h2>
                    </div>
                    {selectedEntity.subtitle && (
                      <p className="text-sm text-slate-300 mt-1">{selectedEntity.subtitle}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntity(null);
                    setPaths([]);
                  }}
                  className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Graph Visualization */}
            {loading ? (
              <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-purple-400 mb-4" />
                <p className="text-slate-400">Mapping network connections...</p>
              </div>
            ) : paths.length === 0 ? (
              <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center">
                <Network className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg font-semibold mb-2">No connections found</p>
                <p className="text-slate-500 text-sm">Start mapping relationships to build the network</p>
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-6">
                <NexusOrbitGraph
                  paths={paths}
                  targetName={selectedEntity.name}
                  onNodeClick={handleNodeClick}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-16 flex flex-col items-center justify-center">
            <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-2xl mb-6">
              <Network className="w-16 h-16 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Search to Explore the Network</h3>
            <p className="text-slate-400 text-center max-w-md">
              Use the search bar above to find a person or company, then visualize all team connections and relationship paths.
            </p>
          </div>
        )}
      </div>

      {/* Entity Detail Modal */}
      {selectedEntityData && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={handleCloseEntityDetail}>
          <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-t-2xl p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseEntityDetail}
                  className="p-2 hover:bg-purple-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-lg">
                    {selectedNodeType === 'Contact' ? selectedEntityData.full_name :
                     selectedNodeType === 'User' ? selectedEntityData.name :
                     selectedEntityData.name}
                  </h3>
                  <p className="text-purple-200 text-xs">{selectedNodeType}</p>
                </div>
              </div>
              <button onClick={handleCloseEntityDetail} className="p-2 hover:bg-purple-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {loadingEntity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : (
                <>
                  {selectedNodeType === 'Contact' && (
                    <>
                      {selectedEntityData.email && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Email:</span>
                          <span className="text-sm text-white">{selectedEntityData.email}</span>
                        </div>
                      )}
                      {selectedEntityData.phone && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Phone:</span>
                          <span className="text-sm text-white">{selectedEntityData.phone}</span>
                        </div>
                      )}
                      {selectedEntityData.role && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Role:</span>
                          <span className="text-sm text-white">{selectedEntityData.role}</span>
                        </div>
                      )}
                      {selectedEntityData.company && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Company:</span>
                          <span className="text-sm text-white">{selectedEntityData.company}</span>
                        </div>
                      )}

                      {selectedEntityData.personality_type && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Personality:</span>
                          <span className="text-sm text-purple-400 font-semibold">{selectedEntityData.personality_type}</span>
                        </div>
                      )}

                      {selectedEntityData.intelligence_dossier && (
                        <div className="mt-3 p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
                          <div className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-2">
                            <UserSearch className="w-3 h-3" />
                            Intelligence Dossier
                          </div>
                          <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {selectedEntityData.intelligence_dossier.slice(0, 300)}
                            {selectedEntityData.intelligence_dossier.length > 300 && '...'}
                          </div>
                          {selectedEntityData.last_dossier_update && (
                            <div className="text-[10px] text-slate-500 mt-2">
                              Updated: {new Date(selectedEntityData.last_dossier_update).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-700">
                        <Button
                          onClick={handleOpenDossier}
                          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                        >
                          <UserSearch className="w-4 h-4 mr-2" />
                          {selectedEntityData.intelligence_dossier ? 'Update Intelligence' : 'Research Target'}
                        </Button>
                      </div>
                    </>
                  )}
                  {selectedNodeType === 'User' && (
                    <>
                      {selectedEntityData.email && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Email:</span>
                          <span className="text-sm text-white">{selectedEntityData.email}</span>
                        </div>
                      )}
                      {selectedEntityData.role && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Role:</span>
                          <span className="text-sm text-white">{selectedEntityData.role}</span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedNodeType === 'Partner' && (
                    <>
                      {selectedEntityData.partner_type && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Type:</span>
                          <span className="text-sm text-white">{selectedEntityData.partner_type}</span>
                        </div>
                      )}
                      {selectedEntityData.description && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Description:</span>
                          <span className="text-sm text-white">{selectedEntityData.description}</span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedNodeType === 'Account' && (
                    <>
                      {selectedEntityData.industry && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Industry:</span>
                          <span className="text-sm text-white">{selectedEntityData.industry}</span>
                        </div>
                      )}
                      {selectedEntityData.revenue && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 uppercase min-w-20">Revenue:</span>
                          <span className="text-sm text-white">{selectedEntityData.revenue}</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dossier Modal */}
      {dossierContact && (
        <DossierModal
          isOpen={showDossierModal}
          onClose={() => setShowDossierModal(false)}
          contact={dossierContact}
          onSave={handleDossierSave}
        />
      )}
    </div>
  );
};
