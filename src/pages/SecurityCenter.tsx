import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Clock, Search, Download, Mail, Webhook } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
  actor_id?: string;
}

interface SecurityMetrics {
  failedLogins24h: number;
  accountLockouts: number;
  rateLimitEvents: number;
  privilegeChanges: number;
  fileDownloadAnomalies: number;
}

export default function SecurityCenter() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    failedLogins24h: 0,
    accountLockouts: 0,
    rateLimitEvents: 0,
    privilegeChanges: 0,
    fileDownloadAnomalies: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  useEffect(() => {
    if (profile?.role === 'org_admin') {
      loadSecurityData();
    }
  }, [profile]);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load recent security events
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .in('action', [
          'LOGIN_FAILED', 
          'ACCOUNT_LOCKED', 
          'TWO_FA_FAILED',
          'ROLE_CHANGE',
          'PASSWORD_RESET',
          'FILE_DOWNLOAD_ATTEMPT',
          'VIEW_BANKING_INFO',
          'UPDATE_BANKING'
        ])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      setEvents(auditLogs || []);

      // Calculate metrics
      const now = Date.now();
      const last24h = now - 24 * 60 * 60 * 1000;
      const last7d = now - 7 * 24 * 60 * 60 * 1000;

      const recentEvents = auditLogs?.filter(log => 
        new Date(log.created_at).getTime() >= last24h
      ) || [];

      setMetrics({
        failedLogins24h: recentEvents.filter(e => e.action === 'LOGIN_FAILED').length,
        accountLockouts: recentEvents.filter(e => e.action === 'ACCOUNT_LOCKED').length,
        rateLimitEvents: 0, // Would be populated from rate limiting service
        privilegeChanges: auditLogs?.filter(e => 
          e.action === 'ROLE_CHANGE' && 
          new Date(e.created_at).getTime() >= last7d
        ).length || 0,
        fileDownloadAnomalies: 0 // Would be calculated based on download patterns
      });

    } catch (error) {
      console.error('Failed to load security data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load security data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestAlert = async () => {
    try {
      // In a real implementation, this would trigger your alerting system
      toast({
        title: 'Test Alert Sent',
        description: 'Security test alert has been sent to configured endpoints',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test alert',
        variant: 'destructive'
      });
    }
  };

  const exportSecurityReport = () => {
    const csvData = events.map(event => ({
      timestamp: event.created_at,
      action: event.action,
      ip_address: event.metadata?.ip_address || 'N/A',
      user_agent: event.metadata?.user_agent || 'N/A',
      details: JSON.stringify(event.metadata)
    }));

    const csv = [
      ['Timestamp', 'Action', 'IP Address', 'User Agent', 'Details'],
      ...csvData.map(row => [row.timestamp, row.action, row.ip_address, row.user_agent, row.details])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter(event =>
    event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.metadata?.ip_address?.includes(searchTerm) ||
    event.id.includes(searchTerm)
  );

  const getEventSeverity = (action: string) => {
    if (['ACCOUNT_LOCKED', 'LOGIN_FAILED'].includes(action)) return 'high';
    if (['TWO_FA_FAILED', 'PASSWORD_RESET'].includes(action)) return 'medium';
    return 'low';
  };

  const getEventBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (profile?.role !== 'org_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only Organization Administrators can access the Security Center.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Security Center" 
        description="Monitor security events, alerts, and compliance status"
      />
      
      <div className="px-6 space-y-6">
        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.failedLogins24h}</p>
                  <p className="text-xs text-muted-foreground">Failed Logins (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.accountLockouts}</p>
                  <p className="text-xs text-muted-foreground">Account Lockouts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.rateLimitEvents}</p>
                  <p className="text-xs text-muted-foreground">Rate Limit Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.privilegeChanges}</p>
                  <p className="text-xs text-muted-foreground">Privilege Changes (7d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.fileDownloadAnomalies}</p>
                  <p className="text-xs text-muted-foreground">Download Anomalies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Security Events</TabsTrigger>
            <TabsTrigger value="alerts">Alert Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Security Events</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button onClick={exportSecurityReport} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => {
                      const severity = getEventSeverity(event.action);
                      return (
                        <TableRow key={event.id}>
                          <TableCell>
                            {new Date(event.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {event.action.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getEventBadgeVariant(severity)}>
                              {severity.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {event.metadata?.ip_address || 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {event.metadata?.error || event.metadata?.reason || 'Security event logged'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Email Alerts</p>
                      <p className="text-sm text-muted-foreground">Send alerts to admin@company.com</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Webhook Alerts</p>
                      <p className="text-sm text-muted-foreground">Send to Slack/Teams webhook</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={sendTestAlert}>
                    Send Test Alert
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}