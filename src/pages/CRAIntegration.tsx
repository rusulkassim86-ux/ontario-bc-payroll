import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Database, Download, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCRAProvider, getCRAAuditLogs, CRAAuditEntry } from '@/cra';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';

const CRAIntegration: React.FC = () => {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [timeout, setTimeout] = useState('8000');
  const [enableFallback, setEnableFallback] = useState('false');
  const [isTesting, setIsTesting] = useState(false);
  const [auditLogs, setAuditLogs] = useState<CRAAuditEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logFilters, setLogFilters] = useState({
    operation: '',
    status: '',
    fromDate: '',
    toDate: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load current settings from environment variables
    setApiUrl(import.meta.env.VITE_CRA_API_URL || '');
    setApiKey(import.meta.env.VITE_CRA_API_KEY || '');
    setTimeout(import.meta.env.VITE_CRA_API_TIMEOUT_MS || '8000');
    setEnableFallback(import.meta.env.VITE_ENABLE_LOCAL_FALLBACK || 'false');
    loadAuditLogs();
  }, []);

  const saveSettings = async () => {
    // In a real implementation, this would save to secure environment variables
    toast({
      title: "Settings Saved",
      description: "CRA API settings have been updated. Note: These would be saved to secure environment variables in production.",
    });
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const provider = getCRAProvider();
      const status = await provider.ping();
      
      if (status.connected) {
        toast({
          title: "Connection Successful",
          description: `Connected to CRA API for year ${status.year}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: status.error || "Failed to connect to CRA API",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await getCRAAuditLogs({
        operation: logFilters.operation || undefined,
        status: logFilters.status || undefined,
        fromDate: logFilters.fromDate || undefined,
        toDate: logFilters.toDate || undefined,
      });
      setAuditLogs(logs);
    } catch (error) {
      toast({
        title: "Failed to load audit logs",
        description: "Could not retrieve CRA audit logs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const exportAuditLogs = () => {
    if (auditLogs.length === 0) {
      toast({
        title: "No data to export",
        description: "No audit logs available for export",
        variant: "destructive",
      });
      return;
    }

    // Convert to CSV format
    const headers = ['Timestamp', 'Employee ID', 'Operation', 'Status', 'Duration (ms)', 'Error'];
    const rows = auditLogs.map(log => [
      log.timestamp,
      log.employeeId,
      log.operation,
      log.status,
      log.durationMs.toString(),
      log.error || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cra-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Audit logs exported to CSV file",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="CRA Integration"
          description="Configure CRA API settings and monitor audit logs for tax calculations"
        />

        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <strong>Production Note:</strong> In a production environment, these settings would be stored as secure environment variables. 
            This interface is for demonstration purposes.
          </AlertDescription>
        </Alert>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="api-url">CRA API URL</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.cra-provider.com"
                />
              </div>
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                  placeholder="8000"
                />
              </div>
              <div>
                <Label htmlFor="fallback">Enable Local Fallback</Label>
                <Select value={enableFallback} onValueChange={setEnableFallback}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button onClick={saveSettings}>
                Save Settings
              </Button>
              <Button 
                onClick={testConnection} 
                disabled={isTesting}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="operation-filter">Operation</Label>
                <Select value={logFilters.operation} onValueChange={(value) => 
                  setLogFilters(prev => ({ ...prev, operation: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All operations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All operations</SelectItem>
                    <SelectItem value="calc">Calculation</SelectItem>
                    <SelectItem value="t4">T4 Generation</SelectItem>
                    <SelectItem value="roe">ROE Generation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={logFilters.status} onValueChange={(value) =>
                  setLogFilters(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={logFilters.fromDate}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={logFilters.toDate}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, toDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={loadAuditLogs} disabled={isLoadingLogs}>
                {isLoadingLogs ? "Loading..." : "Apply Filters"}
              </Button>
              <Button onClick={exportAuditLogs} variant="outline" disabled={auditLogs.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Logs Table */}
            {auditLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-sm">{log.employeeId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.operation}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            log.status === 'success' ? 'default' : 
                            log.status === 'error' ? 'destructive' : 
                            'secondary'
                          }>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{log.durationMs}ms</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.error || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found. Try adjusting the filters or performing some CRA operations.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CRAIntegration;