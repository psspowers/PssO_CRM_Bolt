import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Zap, Check, Loader2, Activity } from 'lucide-react';

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

  const activeRulesCount = rules.filter(r => r.is_active).length;
  const totalRulesCount = rules.length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Mission Control</h2>
              <p className="text-sm text-white/80">Gamification Rule Configuration</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <Activity className="w-5 h-5" />
              <span className="text-3xl font-black">{activeRulesCount}</span>
              <span className="text-white/70">/</span>
              <span className="text-xl font-semibold text-white/70">{totalRulesCount}</span>
            </div>
            <p className="text-xs text-white/70">Active Rules</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rules.map(rule => {
          const isActive = getCurrentActive(rule);
          const points = getCurrentPoints(rule);
          const changed = hasChanges(rule.id);

          return (
            <div
              key={rule.id}
              className={`rounded-xl border-2 p-5 transition-all ${
                isActive
                  ? 'border-orange-500 bg-white shadow-md'
                  : 'border-slate-200 bg-slate-50 opacity-75 grayscale-[0.5]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-900 leading-tight flex-1 pr-2">{rule.name}</h3>
                <Switch
                  id={`active-${rule.id}`}
                  checked={isActive}
                  onCheckedChange={(checked) => handleToggleActive(rule.id, checked)}
                  className="flex-shrink-0"
                />
              </div>

              <div className="h-10 mb-4">
                <p className="text-xs text-slate-500 line-clamp-2">
                  {rule.description || 'No description available'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-600 font-semibold uppercase tracking-wide">Points</Label>
                  {rule.multiplier_type && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[10px]">
                      {rule.multiplier_type === 'per_mw' ? 'Per MW' : 'Fixed'}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    id={`points-${rule.id}`}
                    type="number"
                    value={points}
                    onChange={(e) => handlePointsChange(rule.id, e.target.value)}
                    className="flex-1 text-2xl font-black text-center border-2 h-14"
                    min="0"
                  />
                  <button
                    onClick={() => handleSave(rule.id)}
                    disabled={!changed || saving === rule.id}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      changed
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="Save changes"
                  >
                    {saving === rule.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-mono truncate">
                  {rule.event_key}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
