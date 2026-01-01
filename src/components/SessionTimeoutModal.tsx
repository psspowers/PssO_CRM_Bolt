import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  timeRemaining: number;
  onExtend: () => void;
  onLogout: () => void;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout
}) => {
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    setCountdown(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, onLogout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Session Expiring Soon</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Your session will expire due to inactivity. Any unsaved work may be lost.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3 bg-gray-100 px-6 py-4 rounded-xl">
            <Clock className="w-8 h-8 text-orange-500" />
            <span className="text-3xl font-bold text-gray-900">{formatTime(countdown)}</span>
          </div>
        </div>
        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button variant="outline" onClick={onLogout} className="flex-1">Sign Out</Button>
          <Button onClick={onExtend} className="flex-1 bg-orange-500 hover:bg-orange-600">
            Stay Signed In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionTimeoutModal;
