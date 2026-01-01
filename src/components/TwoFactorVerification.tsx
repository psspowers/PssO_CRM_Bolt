import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Mail, Smartphone, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface TwoFactorVerificationProps {
  userId: string;
  email: string;
  method: 'email' | 'authenticator';
  onVerified: () => void;
  onCancel: () => void;
}

const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  userId,
  email,
  method,
  onVerified,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const sendEmailOTP = async () => {
    setSendingEmail(true);
    const { error } = await supabase.functions.invoke('two-factor-auth', {
      body: { action: 'send-email-otp', userId, email }
    });
    setSendingEmail(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to send code', variant: 'destructive' });
      return;
    }
    setEmailSent(true);
    toast({ title: 'Code Sent', description: 'Check your email for the verification code' });
  };

  const handleVerify = async () => {
    if (code.length !== 6 && code.length !== 8) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('two-factor-auth', {
      body: { action: 'verify', userId, code }
    });
    setLoading(false);
    if (error || data?.error) {
      toast({ title: 'Invalid Code', description: 'Please check your code and try again', variant: 'destructive' });
      return;
    }
    onVerified();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-center text-gray-500 mb-6">
            {method === 'email' 
              ? 'Enter the code sent to your email'
              : 'Enter the code from your authenticator app'}
          </p>

          <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-gray-50 rounded-lg">
            {method === 'email' ? (
              <Mail className="w-5 h-5 text-gray-500" />
            ) : (
              <Smartphone className="w-5 h-5 text-gray-500" />
            )}
            <span className="text-sm text-gray-600">
              {method === 'email' ? email : 'Authenticator App'}
            </span>
          </div>

          {method === 'email' && !emailSent && (
            <Button
              className="w-full mb-4 bg-orange-500 hover:bg-orange-600"
              onClick={sendEmailOTP}
              disabled={sendingEmail}
            >
              {sendingEmail && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Verification Code
            </Button>
          )}

          {(method === 'authenticator' || emailSent) && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Enter 6-digit code"
                  className="mt-1 text-center text-2xl tracking-widest"
                  maxLength={8}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Or use a backup code (8 characters)
                </p>
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleVerify}
                disabled={loading || (code.length !== 6 && code.length !== 8)}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify
              </Button>

              {method === 'email' && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={sendEmailOTP}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? 'Sending...' : 'Resend Code'}
                </Button>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={onCancel}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification;
