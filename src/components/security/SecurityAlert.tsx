import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTwoFactor } from '@/hooks/useTwoFactor';

interface SecurityAlertProps {
  className?: string;
}

export function SecurityAlert({ className = '' }: SecurityAlertProps) {
  const { profile } = useAuth();
  const { requiresTwoFactor, isEnabled: twoFactorEnabled, isRecentlyVerified } = useTwoFactor();

  // Don't show for non-admin users
  if (!requiresTwoFactor) {
    return null;
  }

  const alerts = [];

  // 2FA not enabled for admin user
  if (!twoFactorEnabled) {
    alerts.push({
      type: 'error' as const,
      icon: <XCircle className="h-4 w-4" />,
      title: 'Two-Factor Authentication Required',
      message: 'Your admin role requires 2FA to be enabled for security compliance.',
      action: {
        label: 'Enable 2FA',
        href: '/profile?tab=security'
      }
    });
  }

  // 2FA enabled but not recently verified
  if (twoFactorEnabled && !isRecentlyVerified) {
    alerts.push({
      type: 'warning' as const,
      icon: <Clock className="h-4 w-4" />,
      title: 'Two-Factor Verification Expired',
      message: 'Please verify your identity to access sensitive operations.',
      action: {
        label: 'Verify Now',
        href: '/profile?tab=security&action=verify'
      }
    });
  }

  // Account locked
  if (profile?.account_locked_until) {
    const lockedUntil = new Date(profile.account_locked_until);
    const isStillLocked = lockedUntil > new Date();
    
    if (isStillLocked) {
      alerts.push({
        type: 'error' as const,
        icon: <XCircle className="h-4 w-4" />,
        title: 'Account Temporarily Locked',
        message: `Your account is locked due to security reasons until ${lockedUntil.toLocaleString()}.`,
        action: {
          label: 'Contact Support',
          href: 'mailto:support@besttheratronics.ca'
        }
      });
    }
  }

  // All security requirements met
  if (twoFactorEnabled && isRecentlyVerified && alerts.length === 0) {
    return (
      <Alert className={`border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Security verification active. All admin features available.
        </AlertDescription>
      </Alert>
    );
  }

  // Show the most critical alert
  if (alerts.length === 0) return null;

  const alert = alerts[0]; // Show the first (most critical) alert

  const getAlertVariant = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Alert variant={getAlertVariant(alert.type)} className={className}>
      {alert.icon}
      <div className="flex items-start justify-between w-full">
        <div>
          <div className="font-medium">{alert.title}</div>
          <AlertDescription className="mt-1">
            {alert.message}
          </AlertDescription>
        </div>
        {alert.action && (
          <Button
            variant={alert.type === 'error' ? 'destructive' : 'outline'}
            size="sm"
            className="ml-4 shrink-0"
            onClick={() => {
              if (alert.action?.href.startsWith('mailto:')) {
                window.location.href = alert.action.href;
              } else {
                window.location.href = alert.action?.href || '#';
              }
            }}
          >
            {alert.action.label}
          </Button>
        )}
      </div>
    </Alert>
  );
}

interface SecurityStatusProps {
  compact?: boolean;
  className?: string;
}

export function SecurityStatus({ compact = false, className = '' }: SecurityStatusProps) {
  const { profile } = useAuth();
  const { requiresTwoFactor, isEnabled: twoFactorEnabled, isRecentlyVerified } = useTwoFactor();

  if (!requiresTwoFactor) {
    return null;
  }

  const getStatus = () => {
    if (profile?.account_locked_until && new Date(profile.account_locked_until) > new Date()) {
      return { 
        type: 'locked' as const, 
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        text: 'Account Locked',
        color: 'text-red-600'
      };
    }
    
    if (!twoFactorEnabled) {
      return { 
        type: 'missing' as const, 
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        text: '2FA Required',
        color: 'text-red-600'
      };
    }
    
    if (!isRecentlyVerified) {
      return { 
        type: 'expired' as const, 
        icon: <Clock className="h-4 w-4 text-orange-500" />,
        text: 'Verification Expired',
        color: 'text-orange-600'
      };
    }
    
    return { 
      type: 'verified' as const, 
      icon: <Shield className="h-4 w-4 text-green-500" />,
      text: 'Security Verified',
      color: 'text-green-600'
    };
  };

  const status = getStatus();

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${status.color} ${className}`}>
        {status.icon}
        <span className="text-xs font-medium">{status.text}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${className}`}>
      {status.icon}
      <div>
        <div className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </div>
        {status.type === 'expired' && (
          <div className="text-xs text-muted-foreground">
            Verify to access admin features
          </div>
        )}
      </div>
    </div>
  );
}