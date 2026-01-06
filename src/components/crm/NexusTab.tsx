import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Network, Link, Star, Plus, User, Building2, ArrowRight, Loader2, Save, X } from 'lucide-react';

interface NexusPath {
  id: string;
  node_name: string;
  node_type: string;
  relationship_type: string;
  strength: number;
}

interface NexusTabProps {
  entityId: string;
  entityType: 'Contact' | 'Account' | 'Partner';
}

export const NexusTab: React.FC<NexusTabProps> = ({ entityId, entityType }) => {
  const { user, profile } = useAuth();
  const [paths, setPaths] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [newRel, setNewRel] = useState({
    type: 'Knows',
    strength: 3,
    notes: ''
  });

  const fetchPaths = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select(`
          *,
          created_by_user:created_by ( name, avatar )
        `)
        .or(`to_entity_id.eq.${entityId},from_entity_id.eq.${entityId}`)
        .order('strength', { ascending: false });

      if (error) throw error;
      setPaths(data || []);
    } catch (err) {
      console.error('Error fetching nexus paths:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPaths(); }, [entityId]);

  const handleConnect = async () => {
    if (!user || !profile) return;
    try {
      const { error } = await supabase.from('relationships').insert({
        from_entity_id: profile.id,
        from_entity_type: 'Contact',
        to_entity_id: entityId,
        to_entity_type: entityType,
        type: newRel.type,
        strength: newRel.strength.toString(),
        notes: newRel.notes
      });
      if (error) throw error;
      setShowAdd(false);
      setNewRel({ type: 'Knows', strength: 3, notes: '' });
      fetchPaths();
    } catch (err) {
      console.error(err);
      alert('Failed to connect');
    }
  };

  const getStrengthValue = (strength: any): number => {
    if (typeof strength === 'number') return strength;
    const strengthMap: Record<string, number> = { 'Weak': 1, 'Medium': 3, 'Strong': 5 };
    return strengthMap[strength] || 3;
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
          I Know Them
        </button>
      </div>

      {showAdd && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <h4 className="font-bold text-orange-900 mb-3 text-sm">Add New Connection</h4>
          <div className="space-y-3">
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
              <button onClick={handleConnect} className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-orange-700 transition-colors">Save Connection</button>
              <button onClick={() => setShowAdd(false)} className="px-3 bg-white border border-orange-200 text-orange-700 rounded-lg text-xs hover:bg-orange-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400"/></div>
        ) : paths.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
            <p className="text-slate-400 text-sm">No connections mapped yet.</p>
          </div>
        ) : (
          paths.map(path => {
            const strengthValue = getStrengthValue(path.strength);
            return (
              <div key={path.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {profile?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Source</span>
                  </div>

                  <div className="flex flex-col items-center px-4 relative">
                    <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                      {path.type || path.relationship_type || 'Connected'}
                    </div>
                    <div className="w-24 h-0.5 bg-slate-200 relative">
                      <div className="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-slate-200 rotate-45"></div>
                    </div>
                    <div className="flex gap-0.5 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < strengthValue ? 'text-orange-400 fill-orange-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      {entityType === 'Contact' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Target</span>
                  </div>
                </div>

                {path.notes && (
                  <div className="ml-4 pl-4 border-l border-slate-100 text-xs text-slate-500 italic max-w-[150px]">
                    "{path.notes}"
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NexusTab;
