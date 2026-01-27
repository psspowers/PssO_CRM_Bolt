import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Zap, Loader2, Activity } from 'lucide-react';

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

  const handlePointsChange = (ruleId: string, newPoints: number) => {
    setRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, points: newPoints } : r
    ));
  };

  const handleToggleActive = async (ruleId: string, isActive: boolean) => {
    setSaving(ruleId);
    const { error } = await supabase
      .from('gamification_rules')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', ruleId);

    if (error) {
      toast.error('Failed to update rule');
      console.error(error);
    } else {
      toast.success(isActive ? 'Rule activated' : 'Rule deactivated');
      setRules(prev => prev.map(r =>
        r.id === ruleId
          ? { ...r, is_active: isActive, updated_at: new Date().toISOString() }
          : r
      ));
    }
    setSaving(null);
  };

  const handleSavePoints = async (rule: GamificationRule) => {
    setSaving(rule.id);
    const { error } = await supabase
      .from('gamification_rules')
      .update({
        points: rule.points,
        updated_at: new Date().toISOString()
      })
      .eq('id', rule.id);

    if (error) {
      toast.error('Failed to update points');
      console.error(error);
      await fetchRules();
    } else {
      toast.success('Points updated');
    }
    setSaving(null);
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
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Mission Control</h2>
              <p className="text-xs text-white/80">Gamification Rule Configuration</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-2xl font-black">{activeRulesCount}</span>
              <span className="text-white/70">/</span>
              <span className="text-lg font-semibold text-white/70">{totalRulesCount}</span>
            </div>
            <p className="text-[10px] text-white/70">Active Rules</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`p-4 rounded-xl border transition-all ${
              rule.is_active
                ? 'bg-white border-orange-200 shadow-sm'
                : 'bg-slate-50 border-slate-100 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="font-bold text-sm text-slate-700">{rule.name}</div>
                {rule.multiplier_type && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-[9px] px-1 py-0">
                    {rule.multiplier_type === 'per_mw' ? 'Per MW' : 'Fixed'}
                  </Badge>
                )}
              </div>
              <Switch
                checked={rule.is_active}
                onCheckedChange={(val) => handleToggleActive(rule.id, val)}
                disabled={saving === rule.id}
                className="data-[state=checked]:bg-orange-500 flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-500 leading-tight line-clamp-2 flex-1">
                {rule.description || 'Award for this action'}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Input
                    type="number"
                    className="w-20 h-8 text-right font-bold text-slate-900 border-slate-200 focus:border-orange-500 pr-1"
                    value={rule.points}
                    onChange={(e) => handlePointsChange(rule.id, parseInt(e.target.value) || 0)}
                    onBlur={() => handleSavePoints(rule)}
                    disabled={saving === rule.id}
                    min="0"
                  />
                  {saving === rule.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
                      <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-orange-600">Watts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
