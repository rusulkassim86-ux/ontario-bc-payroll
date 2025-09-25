import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { maskPII } from '@/lib/security';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import { useAuth } from '@/components/auth/AuthProvider';

interface PIIMaskProps {
  value: string;
  type: 'sin' | 'bankAccount' | 'email' | 'phone' | 'name';
  label?: string;
  className?: string;
  allowUnmask?: boolean;
  require2FA?: boolean;
}

export function PIIMask({ 
  value, 
  type, 
  label, 
  className = '',
  allowUnmask = true,
  require2FA = true 
}: PIIMaskProps) {
  const [isUnmasked, setIsUnmasked] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  const { profile } = useAuth();
  const { verifyCode, isRecentlyVerified, requiresTwoFactor } = useTwoFactor();

  const maskedValue = maskPII[type](value);
  const displayValue = isUnmasked ? value : maskedValue;
  
  const canUnmask = allowUnmask && ['org_admin', 'payroll_admin'].includes(profile?.role || '');
  const needs2FA = require2FA && requiresTwoFactor && !isRecentlyVerified;

  const handleUnmaskClick = async () => {
    if (!canUnmask) return;
    
    if (needs2FA) {
      setShowVerification(true);
      return;
    }
    
    setIsUnmasked(!isUnmasked);
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setVerificationError('Please enter verification code');
      return;
    }

    setVerifying(true);
    setVerificationError('');

    try {
      const isValid = await verifyCode(verificationCode);
      
      if (isValid) {
        setIsUnmasked(true);
        setShowVerification(false);
        setVerificationCode('');
      } else {
        setVerificationError('Invalid verification code');
      }
    } catch (error) {
      setVerificationError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelVerification = () => {
    setShowVerification(false);
    setVerificationCode('');
    setVerificationError('');
  };

  if (showVerification) {
    return (
      <div className={`space-y-3 ${className}`}>
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">2FA Verification Required</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            To view sensitive information, please enter your two-factor authentication code.
          </p>
          
          <div className="space-y-3">
            <Input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="text-center text-lg tracking-widest"
              maxLength={6}
              autoFocus
            />
            
            {verificationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{verificationError}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleVerify} 
                disabled={verifying || verificationCode.length !== 6}
                className="flex-1"
              >
                {verifying ? 'Verifying...' : 'Verify & Show'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelVerification}
                disabled={verifying}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={displayValue}
          readOnly
          className={`font-mono ${isUnmasked ? 'bg-orange-50 border-orange-200' : ''}`}
        />
        
        {canUnmask && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleUnmaskClick}
            className="shrink-0"
            aria-label={isUnmasked ? 'Hide sensitive data' : 'Show sensitive data (requires 2FA)'}
          >
            {isUnmasked ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        
        {needs2FA && canUnmask && (
          <Shield className="h-4 w-4 text-orange-500 shrink-0" aria-label="2FA required to view" />
        )}
      </div>
      
      {isUnmasked && (
        <p className="text-xs text-orange-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Sensitive information is currently visible
        </p>
      )}
    </div>
  );
}

interface MaskedDisplayProps {
  value: string;
  type: 'sin' | 'bankAccount' | 'email' | 'phone' | 'name';
  className?: string;
}

export function MaskedDisplay({ value, type, className = '' }: MaskedDisplayProps) {
  const maskedValue = maskPII[type](value);
  
  return (
    <span className={`font-mono text-muted-foreground ${className}`}>
      {maskedValue}
    </span>
  );
}