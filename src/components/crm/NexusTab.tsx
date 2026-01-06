import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Network, Star, Plus, User, Building2, Loader2, Search, ArrowRight, Users, Target } from 'lucide-react';

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

interface IntermediaryOption {
  id: string;
  name: string;
  type: 'User' | 'Contact' | 'Partner';
  avatar?: string;
  role?: string;
}

interface NexusTabProps {
  entityId: string;
  entityType: 'Contact' | 'Account' | 'Partner';
}

export const NexusTab: React.FC<NexusTabProps> = ({ entityId, entityType }) => {
  const { user, profile } = useAuth();
  const [paths, setPaths] = useState<NexusPath[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [sourceMode, setSourceMode] = useState<'me' | 'intermediary'>('me');
  const [selectedSource, setSelectedSource] = useState<IntermediaryOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<IntermediaryOption[]>([]);
  const [searching, setSearching] = useState(false);

  const [newRel, setNewRel] = useState({
    type: 'Knows',
    strength: 3,
    notes: ''
  });

  const fetchPaths = async () => {
    setLoading(true);
    try {
      if (!profile?.id) {
        console.log('Nexus: No profile ID');
        return;
      }

      console.log('Nexus: Fetching paths', {
        start_user_id: profile.id,
        target_entity_id: entityId,
        entityType
      });

      const { data, error } = await supabase.rpc('find_nexus_paths', {
        start_user_id: profile.id,
        target_entity_id: entityId
      });

      console.log('Nexus: RPC result', { data, error });

      if (error) {
        console.error('RPC error:', error);
        setPaths([]);
      } else {
        console.log('Nexus: Setting paths', data);
        setPaths(data || []);
      }
    } catch (err) {
      console.error('Error fetching nexus paths:', err);
      setPaths([]);
    } finally {
      setLoading(false);
    }
  };

  const searchIntermediaries = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const usersPromise = supabase
        .from('crm_users')
        .select('id, name, avatar, role')
        .ilike('name', `%${query}%`)
        .limit(5);

      const contactsPromise = supabase
        .from('contacts')
        .select('id, full_name, avatar, role')
        .ilike('full_name', `%${query}%`)
        .limit(5);

      const partnersPromise = supabase
        .from('partners')
        .select('id, name, partner_type')
        .ilike('name', `%${query}%`)
        .limit(5);

      const [usersRes, contactsRes, partnersRes] = await Promise.all([
        usersPromise,
        contactsPromise,
        partnersPromise
      ]);

      const results: IntermediaryOption[] = [];

      if (usersRes.data) {
        results.push(...usersRes.data.map(u => ({
          id: u.id,
          name: u.name,
          type: 'User' as const,
          avatar: u.avatar,
          role: u.role
        })));
      }

      if (contactsRes.data) {
        results.push(...contactsRes.data.map(c => ({
          id: c.id,
          name: c.full_name,
          type: 'Contact' as const,
          avatar: c.avatar,
          role: c.role
        })));
      }

      if (partnersRes.data) {
        results.push(...partnersRes.data.map(p => ({
          id: p.id,
          name: p.name,
          type: 'Partner' as const,
          avatar: undefined,
          role: p.partner_type
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
    fetchPaths();
  }, [entityId, profile?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceMode === 'intermediary') {
        searchIntermediaries(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, sourceMode]);

  const handleConnect = async () => {
    if (!user || !profile) {
      console.error('Nexus: No user or profile', { user, profile });
      return;
    }

    const fromId = sourceMode === 'me' ? profile.id : selectedSource?.id;
    const fromType = sourceMode === 'me' ? 'User' : selectedSource?.type;

    console.log('Nexus: handleConnect called', {
      sourceMode,
      selectedSource,
      fromId,
      fromType,
      entityId,
      entityType
    });

    if (!fromId || !fromType) {
      alert(`Please select who knows this person. Missing: ${!fromId ? 'ID' : 'Type'}`);
      return;
    }

    const strengthMap: Record<number, string> = {
      1: 'Weak',
      2: 'Weak',
      3: 'Medium',
      4: 'Strong',
      5: 'Strong'
    };

    try {
      const newRelationship = {
        from_entity_id: fromId,
        from_entity_type: fromType,
        to_entity_id: entityId,
        to_entity_type: entityType,
        type: newRel.type,
        strength: strengthMap[newRel.strength] || 'Medium',
        notes: newRel.notes
      };

      console.log('Nexus: Creating relationship', newRelationship);

      const { error, data: insertedData } = await supabase.from('relationships').insert(newRelationship).select();

      console.log('Nexus: Insert result', { error, insertedData });

      if (error) {
        console.error('Nexus: Insert error details', error);
        alert(`Failed to create connection: ${error.message}`);
        throw error;
      }

      if (!insertedData || insertedData.length === 0) {
        console.warn('Nexus: No data returned after insert');
        alert('Connection created but no confirmation received');
      }

      setShowAdd(false);
      setSourceMode('me');
      setSelectedSource(null);
      setSearchQuery('');
      setSearchResults([]);
      setNewRel({ type: 'Knows', strength: 3, notes: '' });

      console.log('Nexus: Refetching paths after insert');
      await fetchPaths();
    } catch (err) {
      console.error('Nexus: Connect error', err);
      alert(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getStrengthValue = (strength: any): number => {
    if (typeof strength === 'number') return strength;
    const strengthMap: Record<string, number> = { 'Weak': 1, 'Medium': 3, 'Strong': 5 };
    return strengthMap[strength] || 3;
  };

  const renderPathNode = (node: any, index: number, isLast: boolean) => {
    const isStart = index === 0;
    const isTarget = isLast;

    return (
      <React.Fragment key={`${node.entity_id}-${index}`}>
        <div className="flex flex-col items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isStart ? 'bg-blue-100 text-blue-600' :
            isTarget ? 'bg-orange-100 text-orange-600' :
            'bg-slate-100 text-slate-600'
          }`}>
            {node.entity_type === 'Contact' || node.entity_type === 'User' ?
              <User className="w-4 h-4" /> :
              <Building2 className="w-4 h-4" />
            }
          </div>
          <span className="text-[9px] text-slate-500 mt-1 max-w-[60px] text-center truncate">
            {node.entity_name || 'Unknown'}
          </span>
          <span className="text-[8px] text-slate-400">
            {isStart ? 'Start' : isTarget ? 'Target' : `Hop ${index}`}
          </span>
        </div>

        {!isLast && node.relationship && (
          <div className="flex flex-col items-center px-2">
            <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mb-1 whitespace-nowrap">
              {node.relationship}
            </div>
            <div className="w-16 h-0.5 bg-slate-200 relative">
              <div className="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-slate-200 rotate-45"></div>
            </div>
            {node.strength && (
              <div className="flex gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-2 h-2 ${
                    i < getStrengthValue(node.strength) ?
                    'text-orange-400 fill-orange-400' :
                    'text-slate-200'
                  }`} />
                ))}
              </div>
            )}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-400" />
            The Nexus
          </h3>
          <p className="text-slate-300 text-xs mt-1">
            Map your social capital to this target.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </div>

      {showAdd && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <h4 className="font-bold text-orange-900 mb-3 text-sm">Add New Connection</h4>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-orange-800 uppercase mb-2 block">
                Who knows this person?
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSourceMode('me');
                    setSelectedSource(null);
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    sourceMode === 'me'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <User className="w-3 h-3 inline mr-1" />
                  Me
                </button>
                <button
                  onClick={() => setSourceMode('intermediary')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    sourceMode === 'intermediary'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <Users className="w-3 h-3 inline mr-1" />
                  Someone Else
                </button>
              </div>
            </div>

            {sourceMode === 'intermediary' && (
              <div className="relative">
                <label className="text-xs font-bold text-orange-800 uppercase mb-1 block">
                  Search for intermediary
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-orange-200 text-sm"
                    placeholder="Search contacts or partners..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 animate-spin" />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-orange-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map(result => {
                      const typeBadge = result.type === 'User' ? 'Internal' : result.type;
                      const badgeColor = result.type === 'User' ? 'bg-blue-100 text-blue-700' :
                                        result.type === 'Contact' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-purple-100 text-purple-700';

                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => {
                            setSelectedSource(result);
                            setSearchQuery(result.name);
                            setSearchResults([]);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-orange-50 flex items-center gap-2 text-sm border-b border-orange-100 last:border-b-0"
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-slate-600 ${
                            result.type === 'User' ? 'bg-blue-100' :
                            result.type === 'Contact' ? 'bg-emerald-100' :
                            'bg-purple-100'
                          }`}>
                            {result.type === 'Partner' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                                {typeBadge}
                              </span>
                              <span className="font-medium text-slate-900">{result.name}</span>
                            </div>
                            {result.role && (
                              <div className="text-[10px] text-slate-500 mt-0.5">{result.role}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedSource && (
                  <div className="mt-2 p-2 bg-orange-100 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        selectedSource.type === 'User' ? 'bg-blue-200 text-blue-700' :
                        selectedSource.type === 'Contact' ? 'bg-emerald-200 text-emerald-700' :
                        'bg-purple-200 text-purple-700'
                      }`}>
                        {selectedSource.type === 'Partner' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            selectedSource.type === 'User' ? 'bg-blue-100 text-blue-700' :
                            selectedSource.type === 'Contact' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {selectedSource.type === 'User' ? 'Internal' : selectedSource.type}
                          </span>
                          <span className="text-xs font-bold text-orange-900">{selectedSource.name}</span>
                        </div>
                        {selectedSource.role && (
                          <div className="text-[10px] text-orange-600 mt-0.5">{selectedSource.role}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSource(null);
                        setSearchQuery('');
                      }}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-orange-800 uppercase">Relationship</label>
                <select
                  className="w-full mt-1 p-2 rounded-lg border border-orange-200 text-sm"
                  value={newRel.type}
                  onChange={e => setNewRel({...newRel, type: e.target.value})}
                >
                  <option>Knows</option>
                  <option>Worked With</option>
                  <option>Alumni</option>
                  <option>Family</option>
                  <option>Advisor</option>
                  <option>Board Member</option>
                  <option>Banker</option>
                  <option>Friend</option>
                  <option>Introduced By</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-orange-800 uppercase">Strength (1-5)</label>
                <input
                  type="range" min="1" max="5"
                  className="w-full mt-2 accent-orange-500"
                  value={newRel.strength}
                  onChange={e => setNewRel({...newRel, strength: parseInt(e.target.value)})}
                />
                <div className="text-center text-xs font-bold text-orange-600">{newRel.strength} / 5</div>
              </div>
            </div>

            <textarea
              className="w-full p-2 rounded-lg border border-orange-200 text-sm"
              placeholder="Context (e.g. Golf buddy, Ex-Colleague...)"
              value={newRel.notes}
              onChange={e => setNewRel({...newRel, notes: e.target.value})}
              rows={2}
            />

            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-orange-700 transition-colors"
              >
                Save Connection
              </button>
              <button
                onClick={() => {
                  setShowAdd(false);
                  setSourceMode('me');
                  setSelectedSource(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="px-3 bg-white border border-orange-200 text-orange-700 rounded-lg text-xs hover:bg-orange-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400"/>
          </div>
        ) : paths.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
            <Network className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No connection paths found yet.</p>
            <p className="text-slate-400 text-xs mt-1">Start mapping connections to build your network.</p>
          </div>
        ) : (
          paths.map((pathObj, pathIdx) => (
            <div
              key={pathIdx}
              className="relative bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Win Probability Badge */}
              {pathObj.win_probability !== undefined && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                  <Target className={`w-3 h-3 ${
                    pathObj.win_probability > 75 ? 'text-emerald-500' :
                    pathObj.win_probability >= 40 ? 'text-amber-500' :
                    'text-slate-400'
                  }`} />
                  <span className={`text-[10px] font-bold ${
                    pathObj.win_probability > 75 ? 'text-emerald-700' :
                    pathObj.win_probability >= 40 ? 'text-amber-700' :
                    'text-slate-500'
                  }`}>
                    {pathObj.win_probability}% Win Prob.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pathObj.degrees} {pathObj.degrees === 1 ? 'Degree' : 'Degrees'}
                  </div>
                  {pathObj.total_strength > 0 && (
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${
                          i < pathObj.total_strength ? 'text-orange-400 fill-orange-400' : 'text-slate-200'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {pathObj.path?.map((node: any, nodeIdx: number) =>
                  renderPathNode(node, nodeIdx, nodeIdx === pathObj.path.length - 1)
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NexusTab;
