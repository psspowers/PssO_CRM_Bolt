import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Zap, Save, Loader2 } from 'lucide-react';

interface GamificationRule {
  id: string;
  event_key: string;
  name: string;
  description: string | null;
  points: number;
  is_active: boolean;
  multiplier_type: string | null;
  updated_at: string;
}

export const GamificationConsole: React.FC = () => {
  const [rules, setRules] = useState<GamificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedRules, setEditedRules] = useState<Record<string, { points: number; is_active: boolean }>>({});

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gamification_rules')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to load gamification rules');
      console.error(error);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  const handlePointsChange = (ruleId: string, newPoints: string) => {
    const points = parseInt(newPoints) || 0;
    setEditedRules(prev => ({
      ...prev,
      [ruleId]: {
        points,
        is_active: prev[ruleId]?.is_active ?? rules.find(r => r.id === ruleId)?.is_active ?? true
      }
    }));
  };

  const handleToggleActive = (ruleId: string, isActive: boolean) => {
    setEditedRules(prev => ({
      ...prev,
      [ruleId]: {
        points: prev[ruleId]?.points ?? rules.find(r => r.id === ruleId)?.points ?? 0,
        is_active: isActive
      }
    }));
  };

  const handleSave = async (ruleId: string) => {
    const edited = editedRules[ruleId];
    if (!edited) return;

    setSaving(ruleId);
    const { error } = await supabase
      .from('gamification_rules')
      .update({
        points: edited.points,
        is_active: edited.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId);

    if (error) {
      toast.error('Failed to update rule');
      console.error(error);
    } else {
      toast.success('Rule updated successfully');
      setRules(prev => prev.map(r =>
        r.id === ruleId
          ? { ...r, points: edited.points, is_active: edited.is_active, updated_at: new Date().toISOString() }
          : r
      ));
      setEditedRules(prev => {
        const updated = { ...prev };
        delete updated[ruleId];
        return updated;
      });
    }
    setSaving(null);
  };

  const getCurrentPoints = (rule: GamificationRule) => {
    return editedRules[rule.id]?.points ?? rule.points;
  };

  const getCurrentActive = (rule: GamificationRule) => {
    return editedRules[rule.id]?.is_active ?? rule.is_active;
  };

  const hasChanges = (ruleId: string) => {
    return !!editedRules[ruleId];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <CardTitle>Gamification Rules</CardTitle>
          </div>
          <CardDescription>
            Configure point rewards for various actions. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map(rule => (
              <Card key={rule.id} className="border-l-4 border-l-orange-500">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{rule.name}</h3>
                        <Badge variant={getCurrentActive(rule) ? 'default' : 'secondary'}>
                          {getCurrentActive(rule) ? 'Active' : 'Inactive'}
                        </Badge>
                        {rule.multiplier_type && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {rule.multiplier_type === 'per_mw' ? 'Per MW' : 'Fixed'}
                          </Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-600">{rule.description}</p>
                      )}
                      <p className="text-xs text-gray-400 font-mono">{rule.event_key}</p>
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`points-${rule.id}`} className="text-xs">Points</Label>
                        <Input
                          id={`points-${rule.id}`}
                          type="number"
                          value={getCurrentPoints(rule)}
                          onChange={(e) => handlePointsChange(rule.id, e.target.value)}
                          className="w-24 text-center font-bold"
                          min="0"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id={`active-${rule.id}`}
                          checked={getCurrentActive(rule)}
                          onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                        />
                        <Label htmlFor={`active-${rule.id}`} className="text-xs cursor-pointer">
                          {getCurrentActive(rule) ? 'On' : 'Off'}
                        </Label>
                      </div>

                      <Button
                        onClick={() => handleSave(rule.id)}
                        disabled={!hasChanges(rule.id) || saving === rule.id}
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {saving === rule.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
