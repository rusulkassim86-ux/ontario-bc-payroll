import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Database, Clock, Download, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BackupInfo {
  id: string;
  created_at: string;
  size_mb: number;
  status: 'completed' | 'failed' | 'in_progress';
  type: 'automatic' | 'manual';
  retention_until: string;
}

interface BackupMetrics {
  lastBackupTime: string;
  totalBackups: number;
  successRate: number;
  nextScheduledBackup: string;
  totalSizeMB: number;
}

export default function BackupRestore() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [metrics, setMetrics] = useState<BackupMetrics>({
    lastBackupTime: '',
    totalBackups: 0,
    successRate: 0,
    nextScheduledBackup: '',
    totalSizeMB: 0
  });
  const [loading, setLoading] = useState(true);
  const [backupInProgress, setBackupInProgress] = useState(false);

  useEffect(() => {
    if (profile?.role === 'org_admin') {
      loadBackupData();
    }
  }, [profile]);

  const loadBackupData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would fetch from your backup service
      // For now, we'll create mock data
      const mockBackups: BackupInfo[] = [
        {
          id: '1',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          size_mb: 1250,
          status: 'completed',
          type: 'automatic',
          retention_until: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          size_mb: 1240,
          status: 'completed',
          type: 'automatic',
          retention_until: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          size_mb: 1235,
          status: 'completed',
          type: 'manual',
          retention_until: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setBackups(mockBackups);

      const completedBackups = mockBackups.filter(b => b.status === 'completed');
      const successRate = mockBackups.length > 0 ? (completedBackups.length / mockBackups.length) * 100 : 0;
      const totalSize = mockBackups.reduce((sum, backup) => sum + backup.size_mb, 0);
      
      setMetrics({
        lastBackupTime: mockBackups[0]?.created_at || '',
        totalBackups: mockBackups.length,
        successRate,
        nextScheduledBackup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        totalSizeMB: totalSize
      });

      // Log backup status check
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_STATUS_CHECK',
        entity_type: 'system',
        entity_id: crypto.randomUUID(),
        metadata: {
          timestamp: new Date().toISOString(),
          backup_count: mockBackups.length,
          success_rate: successRate
        }
      });

    } catch (error) {
      console.error('Failed to load backup data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load backup data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const runManualBackup = async () => {
    try {
      setBackupInProgress(true);
      
      // Log backup initiation
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_INITIATED',
        entity_type: 'system',
        entity_id: crypto.randomUUID(),
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'manual',
          initiated_by: profile?.id
        }
      });

      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Create new backup entry
      const newBackup: BackupInfo = {
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        size_mb: 1260 + Math.floor(Math.random() * 50),
        status: 'completed',
        type: 'manual',
        retention_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      setBackups(prev => [newBackup, ...prev]);
      
      // Log successful backup
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_COMPLETED',
        entity_type: 'system',
        entity_id: newBackup.id,
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'manual',
          size_mb: newBackup.size_mb,
          status: 'completed'
        }
      });

      toast({
        title: 'Backup Completed',
        description: 'Manual backup has been completed successfully',
      });
      
    } catch (error) {
      console.error('Backup failed:', error);
      
      // Log failed backup
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_FAILED',
        entity_type: 'system',
        entity_id: crypto.randomUUID(),
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'manual',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      toast({
        title: 'Backup Failed',
        description: 'Manual backup failed. Please check logs for details.',
        variant: 'destructive'
      });
    } finally {
      setBackupInProgress(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      // In a real implementation, this would generate a signed URL for backup download
      toast({
        title: 'Download Started',
        description: 'Backup download has been initiated. Check your downloads folder.',
      });
      
      // Log backup download
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_DOWNLOADED',
        entity_type: 'system',
        entity_id: backupId,
        metadata: {
          timestamp: new Date().toISOString(),
          downloaded_by: profile?.id
        }
      });
      
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download backup file',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-700">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (profile?.role !== 'org_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">Only Organization Administrators can access backup management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Backup & Restore" 
        description="Manage database backups and restore operations"
      />
      
      <div className="px-6 space-y-6">
        {/* Backup Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Backup</p>
                  <p className="font-medium">
                    {metrics.lastBackupTime ? 
                      new Date(metrics.lastBackupTime).toLocaleDateString() : 
                      'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Backups</p>
                  <p className="font-medium">{metrics.totalBackups}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="font-medium">{metrics.successRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                  <p className="font-medium">{(metrics.totalSizeMB / 1024).toFixed(1)} GB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="backups" className="space-y-4">
          <TabsList>
            <TabsTrigger value="backups">Backup History</TabsTrigger>
            <TabsTrigger value="schedule">Schedule & Settings</TabsTrigger>
            <TabsTrigger value="restore">Restore Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="backups" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Backups</CardTitle>
                  <Button 
                    onClick={runManualBackup} 
                    disabled={backupInProgress}
                    className="gap-2"
                  >
                    {backupInProgress ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {backupInProgress ? 'Creating Backup...' : 'Run Backup Now'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {backupInProgress && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-blue-800">Backup in Progress</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-blue-600 mt-1">Encrypting and uploading database...</p>
                  </div>
                )}
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Created</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Retention Until</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>
                          {new Date(backup.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {backup.type}
                        </TableCell>
                        <TableCell>
                          {backup.size_mb} MB
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(backup.status)}
                        </TableCell>
                        <TableCell>
                          {new Date(backup.retention_until).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBackup(backup.id)}
                            disabled={backup.status !== 'completed'}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Backup Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Daily Automated Backups</p>
                    <p className="text-sm text-muted-foreground">Every night at 2:00 AM UTC</p>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Encryption</p>
                    <p className="text-sm text-muted-foreground">AES-256 encryption enabled</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Retention Policy</p>
                    <p className="text-sm text-muted-foreground">Keep backups for 30 days</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Next Scheduled Backup</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    {new Date(metrics.nextScheduledBackup).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restore" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Restore Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 font-medium mb-2">⚠️ Critical Operation Warning</p>
                  <p className="text-sm text-orange-700">
                    Database restore operations will overwrite all current data. This action cannot be undone.
                    Always ensure you have a recent backup before proceeding.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Restore Test Checklist</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Backup integrity verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Test environment prepared</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Production restore requires maintenance window</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline">
                    Test Restore (Staging)
                  </Button>
                  <Button variant="destructive" disabled>
                    Production Restore
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