import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Smartphone, Mail, Loader2, Copy, Check, Info, QrCode, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { QRCodeSVG } from 'qrcode.react';

const TwoFactorSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [method, setMethod] = useState<'email' | 'authenticator'>('authenticator');
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpUrl, setOtpUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [showBackupWarning, setShowBackupWarning] = useState(false);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'check', userId: user?.id }
      });
      
      if (error) {
        if (error.message?.includes('not found') || error.message?.includes('404') || error.message?.includes('FunctionNotFound')) {
          setServiceUnavailable(true);
        } else {
          console.error('2FA check error:', error);
        }
      } else if (data) {
        setEnabled(data.enabled);
        setMethod(data.method || 'authenticator');
        setServiceUnavailable(false);
      }
    } catch (err: any) {
      console.error('2FA fetch error:', err);
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('not found')) {
        setServiceUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'setup', userId: user?.id, email: profile?.email, method }
      });
      
      if (error) {
        toast({ title: 'Error', description: 'Failed to setup 2FA', variant: 'destructive' });
        return;
      }
      
      setSecret(data.secret);
      setOtpUrl(data.otpAuthUrl);
      setBackupCodes(data.backupCodes);
      setSetupMode(true);
      setShowBackupWarning(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to setup 2FA', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!showBackupWarning) {
      setShowBackupWarning(true);
      toast({ 
        title: 'Save Your Backup Codes!', 
        description: 'Please copy and save your backup codes before continuing. You will need them if you lose access to your authenticator.',
      });
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'enable', userId: user?.id, code: verifyCode }
      });
      
      if (error || data?.error) {
        toast({ title: 'Invalid code', description: 'Please check your authenticator app and try again', variant: 'destructive' });
        return;
      }
      
      setEnabled(true);
      setSetupMode(false);
      setVerifyCode('');
      toast({ title: '2FA Enabled', description: 'Two-factor authentication is now active on your account' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to verify code', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    
    setLoading(true);
    try {
      await supabase.functions.invoke('two-factor-auth', { body: { action: 'disable', userId: user?.id } });
      setEnabled(false);
      setSetupMode(false);
      setSecret('');
      setOtpUrl('');
      setBackupCodes([]);
      toast({ title: '2FA Disabled', description: 'Two-factor authentication has been turned off' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to disable 2FA', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!', description: 'Backup codes copied to clipboard' });
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast({ title: 'Copied!', description: 'Secret key copied to clipboard' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  if (serviceUnavailable) {
    return (
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-orange-500" />
          <div>
            <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">2FA Service Unavailable</p>
            <p className="text-xs text-orange-600 mt-1">
              The two-factor authentication service is currently being set up. Please check back later or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
        </div>
      </div>

      {!setupMode ? (
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-lg ${enabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div>
                <p className="font-medium">{enabled ? '2FA is enabled' : '2FA is disabled'}</p>
                <p className="text-sm text-gray-500">
                  {enabled ? `Using ${method === 'authenticator' ? 'Authenticator App' : 'Email'}` : 'Protect your account with 2FA'}
                </p>
              </div>
            </div>
            {enabled ? (
              <Button variant="destructive" size="sm" onClick={handleDisable}>
                Disable 2FA
              </Button>
            ) : (
              <Button className="bg-orange-500 hover:bg-orange-600" size="sm" onClick={handleSetup}>
                Enable 2FA
              </Button>
            )}
          </div>

          {!enabled && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Choose verification method:</p>
                <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'email' | 'authenticator')}>
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${method === 'authenticator' ? 'border-orange-300 bg-orange-50' : 'hover:bg-gray-50'}`}>
                    <RadioGroupItem value="authenticator" id="auth" />
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-purple-600" />
                    </div>
                    <Label htmlFor="auth" className="flex-1 cursor-pointer">
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-gray-500">Use Google Authenticator, Authy, or similar apps</p>
                    </Label>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Recommended</span>
                  </div>
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${method === 'email' ? 'border-orange-300 bg-orange-50' : 'hover:bg-gray-50'}`}>
                    <RadioGroupItem value="email" id="email" />
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <Label htmlFor="email" className="flex-1 cursor-pointer">
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-gray-500">Receive verification codes via email</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span className="text-gray-500">Set up authenticator</span>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="w-6 h-6 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span className="text-gray-400">Verify code</span>
          </div>

          {method === 'authenticator' && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="p-6 bg-gray-50 rounded-lg text-center">
                {otpUrl ? (
                  <div className="w-52 h-52 mx-auto bg-white p-3 rounded-lg border shadow-sm mb-4">
                    <QRCodeSVG 
                      value={otpUrl} 
                      size={184}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Scan with your<br />authenticator app</p>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-600 mb-2">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm bg-white px-3 py-2 rounded border font-mono break-all max-w-xs">
                    {secret}
                  </code>
                  <Button variant="outline" size="sm" onClick={copySecret}>
                    {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}


          {method === 'email' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <p className="font-medium text-blue-800">Email Verification</p>
              </div>
              <p className="text-sm text-blue-700">
                When you log in, we'll send a 6-digit code to <strong>{profile?.email}</strong>
              </p>
            </div>
          )}

          {/* Backup Codes */}
          <div className={`p-4 rounded-lg border-2 ${showBackupWarning ? 'border-amber-400 bg-amber-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${showBackupWarning ? 'text-amber-600' : 'text-amber-500'}`} />
              <div>
                <p className="font-medium text-amber-800">Save your backup codes</p>
                <p className="text-sm text-amber-700">
                  Store these codes in a safe place. You can use them to access your account if you lose your authenticator.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {backupCodes.map((code, i) => (
                <div key={i} className="bg-white px-3 py-2 rounded border text-center font-mono text-sm">
                  {code}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={copyBackupCodes} className="w-full">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy all backup codes'}
            </Button>
          </div>

          {/* Verification */}
          <div className="space-y-3">
            <Label htmlFor="verify-code" className="text-sm font-medium">
              Enter the 6-digit code from your {method === 'authenticator' ? 'authenticator app' : 'email'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="verify-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setSetupMode(false);
                setVerifyCode('');
                setShowBackupWarning(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-orange-500 hover:bg-orange-600" 
              onClick={handleVerifyAndEnable} 
              disabled={verifying || verifyCode.length !== 6}
            >
              {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {showBackupWarning ? 'Confirm & Enable' : 'Verify & Enable'}
            </Button>
          </div>
        </div>
      )}

      {/* Security tip */}
      {!setupMode && !enabled && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Why enable 2FA?</p>
            <p className="text-xs text-blue-600 mt-1">
              Two-factor authentication adds an extra layer of security. Even if someone gets your password, they won't be able to access your account without the second factor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSettings;
