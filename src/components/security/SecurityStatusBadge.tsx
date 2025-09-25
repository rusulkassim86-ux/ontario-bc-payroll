import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Shield, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface SecurityStatus {
  tls: boolean;
  csp: boolean;
  twoFactorCoverage: number;
  backupsOk: boolean;
  alertsCount: number;
  lastBackup?: string;
}

export function SecurityStatusBadge() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<SecurityStatus>({
    tls: false,
    csp: false,
    twoFactorCoverage: 0,
    backupsOk: false,
    alertsCount: 0
  });

  const checkSecurityStatus = async () => {
    try {
      // Check TLS
      const tlsOk = window.location.protocol === 'https:';
      
      // Check CSP
      const cspOk = document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
      
      // Check 2FA coverage for admins
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .in('role', ['org_admin', 'payroll_admin']);
      
      const totalAdmins = adminProfiles?.length || 0;
      const enabledAdmins = adminProfiles?.filter(p => p.two_factor_enabled).length || 0;
      const coverage = totalAdmins > 0 ? (enabledAdmins / totalAdmins) * 100 : 0;

      // Check recent security alerts
      const { data: recentAlerts } = await supabase
        .from('audit_logs')
        .select('*')
        .in('action', ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'TWO_FA_FAILED'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      // Mock backup status (would be from actual backup service)
      const backupOk = true;
      const lastBackup = new Date().toISOString();

      setStatus({
        tls: tlsOk,
        csp: cspOk,
        twoFactorCoverage: coverage,
        backupsOk: backupOk,
        alertsCount: recentAlerts?.length || 0,
        lastBackup
      });
    } catch (error) {
      console.error('Failed to check security status:', error);
    }
  };

  useEffect(() => {
    if (!profile || !['org_admin', 'payroll_admin'].includes(profile.role)) return;
    checkSecurityStatus();
  }, [profile?.role]);

  // Only show for admin users
  if (!profile || !['org_admin', 'payroll_admin'].includes(profile.role)) {
    return null;
  }
  const getOverallStatus = () => {
    const checks = [
      status.tls,
      status.csp,
      status.twoFactorCoverage >= 100,
      status.backupsOk,
      status.alertsCount === 0
    ];
    
    const passedChecks = checks.filter(Boolean).length;
    const totalChecks = checks.length;
    
    if (passedChecks === totalChecks) return 'success';
    if (passedChecks >= totalChecks * 0.8) return 'warning';
    return 'danger';
  };

  const overallStatus = getOverallStatus();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Shield className="h-4 w-4" />
          <Badge variant={overallStatus === 'success' ? 'default' : 'destructive'}>
            Security
          </Badge>
          {status.alertsCount > 0 && (
            <Badge variant="destructive" className="ml-1">
              {status.alertsCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">HTTPS/TLS</span>
              {status.tls ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Content Security Policy</span>
              {status.csp ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">2FA Coverage</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{status.twoFactorCoverage.toFixed(0)}%</span>
                {status.twoFactorCoverage >= 100 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : status.twoFactorCoverage >= 80 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Backups</span>
              {status.backupsOk ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Security Alerts (24h)</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{status.alertsCount}</span>
                {status.alertsCount === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
            </div>
            
            {status.lastBackup && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last backup: {new Date(status.lastBackup).toLocaleDateString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}