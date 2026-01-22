import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CommissionDialogProps {
  user: {
    id: string;
    name: string;
    email: string;
    commission_rate_thb_mw?: number;
    annual_quota_mw?: number;
  };
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CommissionDialog({ user, open, onClose, onSuccess }: CommissionDialogProps) {
  const [commissionRate, setCommissionRate] = useState(user.commission_rate_thb_mw?.toString() || '0');
  const [annualQuota, setAnnualQuota] = useState(user.annual_quota_mw?.toString() || '0');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const rate = parseFloat(commissionRate) || 0;
      const quota = parseFloat(annualQuota) || 0;

      const { error } = await supabase
        .from('crm_users')
        .update({
          commission_rate_thb_mw: rate,
          annual_quota_mw: quota
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Commission settings updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating commission:', error);
      toast.error(error.message || 'Failed to update commission settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Commission Settings - {user.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="commission-rate">Commission Rate (THB per MW)</Label>
            <Input
              id="commission-rate"
              type="number"
              step="0.01"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              placeholder="Enter rate in THB per MW"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Amount earned per MW of capacity closed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annual-quota">Annual Quota (MW)</Label>
            <Input
              id="annual-quota"
              type="number"
              step="0.1"
              value={annualQuota}
              onChange={(e) => setAnnualQuota(e.target.value)}
              placeholder="Enter annual quota in MW"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target capacity to close this year
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Preview</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Rate:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ฿{parseFloat(commissionRate || '0').toLocaleString()}/MW
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Annual Quota:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {parseFloat(annualQuota || '0').toLocaleString()} MW
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">If quota met:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  ฿{(parseFloat(commissionRate || '0') * parseFloat(annualQuota || '0')).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Commission Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
