import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Network, Link, Star, ArrowRight, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NexusPath {
  path_id: number;
  hop_number: number;
  connector_user_id: string;
  connector_name: string;
  connector_avatar: string;
  relationship_type: string;
  strength: number;
  notes: string;
}

interface NexusTabProps {
  entityId: string;
  entityType: 'Contact' | 'Account';
}

const RELATIONSHIP_TYPES = [
  'Knows',
  'Worked With',
  'Alumni',
  'Family',
  'Board Member',
  'Advisor',
  'Banker',
  'Introduced By',
  'Friend',
  'Other'
];

const getStrengthColor = (strength: number): string => {
  if (strength >= 4) return 'text-green-600';
  if (strength >= 3) return 'text-yellow-600';
  return 'text-red-600';
};

const getStrengthLabel = (strength: number): string => {
  if (strength === 5) return 'Very Strong';
  if (strength === 4) return 'Strong';
  if (strength === 3) return 'Medium';
  if (strength === 2) return 'Weak';
  return 'Very Weak';
};

export default function NexusTab({ entityId, entityType }: NexusTabProps) {
  const { profile } = useAuth();
  const [paths, setPaths] = useState<NexusPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    relationshipType: 'Knows',
    strength: 3,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPaths = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_nexus_paths', {
        target_entity_id: entityId,
        target_entity_type: entityType,
        start_user_id: profile.id
      });

      if (error) throw error;
      setPaths(data || []);
    } catch (error) {
      console.error('Error fetching nexus paths:', error);
      toast.error('Failed to load connection paths');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaths();
  }, [entityId, entityType, profile?.id]);

  const handleAddConnection = async () => {
    if (!profile?.id) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_entity_connections').insert({
        user_id: profile.id,
        entity_id: entityId,
        entity_type: entityType,
        relationship_type: formData.relationshipType,
        strength: formData.strength,
        notes: formData.notes
      });

      if (error) throw error;

      toast.success('Connection added successfully');
      setDialogOpen(false);
      setFormData({
        relationshipType: 'Knows',
        strength: 3,
        notes: ''
      });
      fetchPaths();
    } catch (error: any) {
      console.error('Error adding connection:', error);
      toast.error(error.message || 'Failed to add connection');
    } finally {
      setSubmitting(false);
    }
  };

  const directPaths = paths.filter(p => p.path_id === 1);
  const indirectPaths = paths.filter(p => p.path_id === 2);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Network className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Connection Pathfinder</h3>
              <p className="text-sm text-slate-500">Discover how you're connected</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-orange-500/30"
              >
                <Link className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Your Connection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>I know this {entityType.toLowerCase()}...</Label>
                  <Select
                    value={formData.relationshipType}
                    onValueChange={(value) => setFormData({ ...formData, relationshipType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Relationship Strength: {getStrengthLabel(formData.strength)}</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[formData.strength]}
                      onValueChange={([value]) => setFormData({ ...formData, strength: value })}
                      min={1}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < formData.strength ? 'fill-orange-500 text-orange-500' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="How do you know them? Any relevant context..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleAddConnection}
                  disabled={submitting}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {submitting ? 'Adding...' : 'Add Connection'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Finding connection paths...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {directPaths.length === 0 && indirectPaths.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Network className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="text-lg font-medium text-slate-900 mb-2">No Paths Found</h4>
                <p className="text-slate-500 mb-4">Be the first to connect!</p>
                <Button
                  onClick={() => setDialogOpen(true)}
                  variant="outline"
                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Add Your Connection
                </Button>
              </div>
            ) : (
              <>
                {directPaths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Direct Connection
                    </h4>
                    <div className="space-y-3">
                      {directPaths.map((path, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100"
                        >
                          <Avatar className="w-12 h-12 border-2 border-green-200">
                            <AvatarImage src={path.connector_avatar} />
                            <AvatarFallback className="bg-green-500 text-white">
                              {path.connector_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-900">You</span>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600 font-medium">{path.relationship_type}</span>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-900">Target</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className={`font-medium ${getStrengthColor(path.strength)}`}>
                                {getStrengthLabel(path.strength)}
                              </span>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < path.strength ? 'fill-orange-500 text-orange-500' : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {path.notes && (
                              <p className="text-sm text-slate-600 mt-1">{path.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {indirectPaths.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Through Teammates
                    </h4>
                    <div className="space-y-3">
                      {indirectPaths.map((path, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100"
                        >
                          <Avatar className="w-12 h-12 border-2 border-blue-200">
                            <AvatarImage src={path.connector_avatar} />
                            <AvatarFallback className="bg-blue-500 text-white">
                              {path.connector_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-900">You</span>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <Users className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-600">{path.connector_name}</span>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <span className="text-sm text-slate-600 font-medium">{path.relationship_type}</span>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-900">Target</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className={`font-medium ${getStrengthColor(path.strength)}`}>
                                {getStrengthLabel(path.strength)}
                              </span>
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < path.strength ? 'fill-orange-500 text-orange-500' : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {path.notes && (
                              <p className="text-sm text-slate-600 mt-1">{path.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
