import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { AUDIT_EVENTS } from '@/lib/security';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

interface TwoFactorVerification {
  isRequired: boolean;
  isVerified: boolean;
  lastVerification?: Date;
}

export function useTwoFactor() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresTwoFactor = useCallback((): boolean => {
    return profile?.role === 'org_admin' || profile?.role === 'payroll_admin';
  }, [profile?.role]);

  const isRecentlyVerified = useCallback((): boolean => {
    if (!profile?.last_2fa_verification) return false;
    const lastVerification = new Date(profile.last_2fa_verification);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return lastVerification > thirtyMinutesAgo;
  }, [profile?.last_2fa_verification]);

  const setupTwoFactor = useCallback(async (): Promise<TwoFactorSetup | null> => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Generate secret and backup codes
      const secret = generateSecret();
      const backupCodes = generateBackupCodes();
      const qrCodeUrl = generateQRCodeUrl(user.email || '', secret);

      // Store secret temporarily (not activated until verified)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_secret: secret,
          backup_codes: backupCodes
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Log audit event
      await logAuditEvent(AUDIT_EVENTS.TWO_FA_ENABLED, {
        setup_initiated: true
      });

      return {
        secret,
        qrCodeUrl,
        backupCodes
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to setup 2FA';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const verifyAndEnable = useCallback(async (code: string): Promise<boolean> => {
    if (!user || !profile?.two_factor_secret) {
      throw new Error('2FA setup not initiated');
    }

    setLoading(true);
    setError(null);

    try {
      // Verify TOTP code
      const isValid = verifyTOTP(code, profile.two_factor_secret);
      
      if (!isValid) {
        setError('Invalid verification code');
        await logAuditEvent(AUDIT_EVENTS.TWO_FA_FAILED, {
          reason: 'invalid_code_during_setup'
        });
        return false;
      }

      // Enable 2FA
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: true,
          last_2fa_verification: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      await logAuditEvent(AUDIT_EVENTS.TWO_FA_ENABLED, {
        setup_completed: true
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify 2FA';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, profile?.two_factor_secret, refreshProfile]);

  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    if (!user || !profile?.two_factor_enabled) {
      throw new Error('2FA not enabled');
    }

    setLoading(true);
    setError(null);

    try {
      let isValid = false;

      // First try TOTP verification
      if (profile.two_factor_secret) {
        isValid = verifyTOTP(code, profile.two_factor_secret);
      }

      // If TOTP fails, try backup codes
      if (!isValid && profile.backup_codes) {
        const codeIndex = profile.backup_codes.indexOf(code);
        if (codeIndex !== -1) {
          isValid = true;
          
          // Remove used backup code
          const updatedCodes = [...profile.backup_codes];
          updatedCodes.splice(codeIndex, 1);
          
          await supabase
            .from('profiles')
            .update({ backup_codes: updatedCodes })
            .eq('user_id', user.id);
        }
      }

      if (isValid) {
        // Update last verification time
        await supabase
          .from('profiles')
          .update({
            last_2fa_verification: new Date().toISOString(),
            failed_login_attempts: 0
          })
          .eq('user_id', user.id);

        await refreshProfile();

        await logAuditEvent(AUDIT_EVENTS.TWO_FA_VERIFIED, {
          method: profile.backup_codes?.includes(code) ? 'backup_code' : 'totp'
        });

        return true;
      } else {
        // Increment failed attempts
        const failedAttempts = (profile.failed_login_attempts || 0) + 1;
        const updates: any = { failed_login_attempts: failedAttempts };

        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          updates.account_locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          await logAuditEvent(AUDIT_EVENTS.ACCOUNT_LOCKED, {
            reason: 'too_many_2fa_failures'
          });
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id);

        await logAuditEvent(AUDIT_EVENTS.TWO_FA_FAILED, {
          failed_attempts: failedAttempts
        });

        setError(failedAttempts >= 5 ? 'Account locked due to too many failed attempts' : 'Invalid verification code');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify 2FA';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, profile, refreshProfile]);

  const disable = useCallback(async (currentCode: string): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');

    // Verify current code before disabling
    const isValid = await verifyCode(currentCode);
    if (!isValid) return false;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null,
          last_2fa_verification: null
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      await logAuditEvent(AUDIT_EVENTS.TWO_FA_DISABLED, {});

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable 2FA';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, verifyCode, refreshProfile]);

  const getVerificationStatus = useCallback((): TwoFactorVerification => {
    const isRequired = requiresTwoFactor();
    const isVerified = isRecentlyVerified();
    
    return {
      isRequired,
      isVerified,
      lastVerification: profile?.last_2fa_verification ? new Date(profile.last_2fa_verification) : undefined
    };
  }, [requiresTwoFactor, isRecentlyVerified, profile?.last_2fa_verification]);

  return {
    isEnabled: profile?.two_factor_enabled || false,
    requiresTwoFactor: requiresTwoFactor(),
    isRecentlyVerified: isRecentlyVerified(),
    loading,
    error,
    setupTwoFactor,
    verifyAndEnable,
    verifyCode,
    disable,
    getVerificationStatus
  };
}

// Helper functions
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

function generateBackupCodes(): string[] {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
}

function generateQRCodeUrl(email: string, secret: string): string {
  const issuer = 'Best Theratronics';
  const label = encodeURIComponent(`${issuer}:${email}`);
  const issuerParam = encodeURIComponent(issuer);
  
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuerParam}`;
}

function verifyTOTP(token: string, secret: string): boolean {
  // This is a simplified TOTP verification
  // In a real implementation, you would use a proper TOTP library
  const time = Math.floor(Date.now() / 30000);
  
  // Check current time window and previous/next windows for clock skew
  for (let i = -1; i <= 1; i++) {
    const expectedToken = generateTOTP(secret, time + i);
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

function generateTOTP(secret: string, time: number): string {
  // Simplified TOTP generation - use proper crypto library in production
  const hash = simpleHash(secret + time.toString());
  return (hash % 1000000).toString().padStart(6, '0');
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

async function logAuditEvent(event: string, metadata: Record<string, any>) {
  try {
    await supabase.from('audit_logs').insert({
      action: event,
      entity_type: 'authentication',
      entity_id: crypto.randomUUID(),
      metadata
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}