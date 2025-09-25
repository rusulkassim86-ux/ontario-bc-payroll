import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Smartphone, 
  Activity, 
  RefreshCw, 
  Settings, 
  Globe, 
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Device {
  id: string;
  serial_number: string;
  model: string;
  location: string;
  status: string;
  last_heartbeat_at: string | null;
  last_sync_at: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
}

interface DeviceStats {
  device_id: string;
  punches_today: number;
  last_punch_at: string | null;
  mapped_employees: number;
}

interface DeviceDetail extends Device {
  webhook_secret?: string;
  allowed_ips?: string[];
  mappings: {
    id: string;
    badge_id: string;
    active: boolean;
    employee: {
      first_name: string;
      last_name: string;
      employee_number: string;
    };
  }[];
  stats: DeviceStats;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [syncingDevice, setSyncingDevice] = useState<string | null>(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const { toast } = useToast();

  const [newDevice, setNewDevice] = useState({
    serial_number: "",
    model: "",
    location: "",
    webhook_secret: "",
    allowed_ips: ""
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      // TODO: Remove this placeholder once migration is approved
      // For now, show placeholder data
      setDevices([
        {
          id: "1",
          serial_number: "DEV001",
          model: "TimeKeeper Pro 3000",
          location: "Main Entrance",
          status: "active",
          last_heartbeat_at: new Date(Date.now() - 300000).toISOString(), // 5 min ago
          last_sync_at: new Date(Date.now() - 120000).toISOString(), // 2 min ago
          company_id: "company1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "2", 
          serial_number: "DEV002",
          model: "TimeKeeper Pro 3000",
          location: "Warehouse Door",
          status: "offline",
          last_heartbeat_at: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
          last_sync_at: new Date(Date.now() - 1800000).toISOString(),
          company_id: "company1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

      setDeviceStats([
        { device_id: "1", punches_today: 24, last_punch_at: new Date().toISOString(), mapped_employees: 12 },
        { device_id: "2", punches_today: 0, last_punch_at: null, mapped_employees: 8 }
      ]);

    } catch (error) {
      console.error('Error loading devices:', error);
      toast({
        title: "Error",
        description: "Failed to load devices. Please approve the database migration first.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceDetails = async (deviceId: string) => {
    try {
      // TODO: Implement after migration - for now show placeholder
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      const mockDetail: DeviceDetail = {
        ...device,
        webhook_secret: "wh_secret_" + deviceId,
        allowed_ips: ["192.168.1.0/24", "10.0.0.0/8"],
        mappings: [
          {
            id: "mapping1",
            badge_id: "BADGE001",
            active: true,
            employee: { first_name: "John", last_name: "Smith", employee_number: "EMP001" }
          },
          {
            id: "mapping2", 
            badge_id: "BADGE002",
            active: true,
            employee: { first_name: "Jane", last_name: "Doe", employee_number: "EMP002" }
          }
        ],
        stats: deviceStats.find(s => s.device_id === deviceId) || {
          device_id: deviceId,
          punches_today: 0,
          last_punch_at: null,
          mapped_employees: 0
        }
      };

      setSelectedDevice(mockDetail);
    } catch (error) {
      console.error('Error loading device details:', error);
      toast({
        title: "Error",
        description: "Failed to load device details.",
        variant: "destructive",
      });
    }
  };

  const testWebhook = async (device: Device) => {
    setTestingWebhook(device.id);
    
    try {
      const samplePayload = {
        device_serial: device.serial_number,
        badge_id: "TEST001",
        punch_at: new Date().toISOString(),
        direction: "IN" as const,
        method: "card",
        raw_data: { test: true }
      };

      const { data, error } = await supabase.functions.invoke('test-webhook', {
        body: { 
          device_id: device.id,
          payload: samplePayload 
        }
      });

      if (error) throw error;

      toast({
        title: "Webhook Test Successful",
        description: `Test punch sent to ${device.serial_number}`,
      });

    } catch (error) {
      console.error('Webhook test error:', error);
      toast({
        title: "Webhook Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  const runSyncNow = async (device: Device) => {
    setSyncingDevice(device.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('device-sync', {
        body: { device_id: device.id }
      });

      if (error) throw error;

      toast({
        title: "Sync Completed",
        description: `Synced ${data?.punches_count || 0} new punches from ${device.serial_number}`,
      });

      // Refresh device list
      loadDevices();

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSyncingDevice(null);
    }
  };

  const addDevice = async () => {
    try {
      toast({
        title: "Migration Required",
        description: "Please approve the database migration first before adding devices.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error adding device:', error);
      toast({
        title: "Error",
        description: "Failed to add device.",
        variant: "destructive",
      });
    }
  };

  const getDeviceStatus = (device: Device) => {
    if (!device.last_heartbeat_at) return { status: 'unknown', color: 'secondary', text: 'Unknown' };
    
    const lastSeen = new Date(device.last_heartbeat_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes > 30) return { status: 'offline', color: 'destructive', text: 'Offline' };
    if (diffMinutes > 15) return { status: 'warning', color: 'outline', text: 'Warning' };
    return { status: 'online', color: 'default', text: 'Online' };
  };

  const getStatsForDevice = (deviceId: string): DeviceStats => {
    return deviceStats.find(s => s.device_id === deviceId) || {
      device_id: deviceId,
      punches_today: 0,
      last_punch_at: null,
      mapped_employees: 0
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Devices" description="Loading..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Devices" 
        description="Manage punch clock devices and connectivity"
        action={
          <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    value={newDevice.serial_number}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, serial_number: e.target.value }))}
                    placeholder="Enter device serial number"
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={newDevice.model}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g., TimeKeeper Pro 3000"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newDevice.location}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Main Entrance, Warehouse Door"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDevice(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addDevice}>Add Device</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="px-6 space-y-6">
        {/* Device Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Punch Clock Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Punches Today</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const deviceStatus = getDeviceStatus(device);
                  const stats = getStatsForDevice(device.id);
                  
                  return (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono font-semibold">
                        {device.serial_number}
                      </TableCell>
                      <TableCell>{device.model}</TableCell>
                      <TableCell>{device.location}</TableCell>
                      <TableCell>
                        <Badge variant={deviceStatus.color as any}>
                          {deviceStatus.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {device.last_heartbeat_at ? 
                          new Date(device.last_heartbeat_at).toLocaleString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        {device.last_sync_at ? 
                          new Date(device.last_sync_at).toLocaleString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{stats.punches_today}</Badge>
                          {stats.punches_today > 0 && (
                            <Activity className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testWebhook(device)}
                            disabled={testingWebhook === device.id}
                          >
                            {testingWebhook === device.id ? (
                              <Clock className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runSyncNow(device)}
                            disabled={syncingDevice === device.id}
                          >
                            {syncingDevice === device.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadDeviceDetails(device.id)}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Smartphone className="w-5 h-5" />
                                  Device Details: {device.serial_number}
                                </DialogTitle>
                              </DialogHeader>
                              
                              {selectedDevice && (
                                <Tabs defaultValue="overview">
                                  <TabsList>
                                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                    <TabsTrigger value="security">Security</TabsTrigger>
                                    <TabsTrigger value="mappings">Employee Mappings</TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="overview" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Model</Label>
                                        <div className="text-sm font-medium">{selectedDevice.model}</div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Location</Label>
                                        <div className="text-sm font-medium">{selectedDevice.location}</div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Badge variant={getDeviceStatus(selectedDevice).color as any}>
                                          {getDeviceStatus(selectedDevice).text}
                                        </Badge>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Punches Today</Label>
                                        <div className="text-sm font-medium flex items-center gap-2">
                                          {selectedDevice.stats.punches_today}
                                          {selectedDevice.stats.punches_today > 0 && (
                                            <Activity className="w-4 h-4 text-green-500" />
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Last Heartbeat</Label>
                                      <div className="text-sm">
                                        {selectedDevice.last_heartbeat_at ? 
                                          new Date(selectedDevice.last_heartbeat_at).toLocaleString()
                                          : 'Never'
                                        }
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Last Sync</Label>
                                      <div className="text-sm">
                                        {selectedDevice.last_sync_at ? 
                                          new Date(selectedDevice.last_sync_at).toLocaleString()
                                          : 'Never'
                                        }
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="security" className="space-y-4">
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                          <Shield className="w-4 h-4" />
                                          Webhook Secret
                                        </Label>
                                        <Input 
                                          type="password" 
                                          value={selectedDevice.webhook_secret || ''} 
                                          readOnly 
                                        />
                                        <p className="text-xs text-muted-foreground">
                                          Used to verify webhook authenticity
                                        </p>
                                      </div>

                                      <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                          <Globe className="w-4 h-4" />
                                          Allowed IP Ranges
                                        </Label>
                                        <Textarea 
                                          value={selectedDevice.allowed_ips?.join('\n') || ''} 
                                          readOnly 
                                          rows={3}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                          IP ranges that can send webhooks to this device
                                        </p>
                                      </div>

                                      <Alert>
                                        <Shield className="h-4 w-4" />
                                        <AlertDescription>
                                          All webhook requests are validated using HMAC-SHA256 signatures
                                        </AlertDescription>
                                      </Alert>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="mappings" className="space-y-4">
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2">
                                          <Users className="w-4 h-4" />
                                          Employee Badge Mappings
                                        </Label>
                                        <Badge variant="outline">
                                          {selectedDevice.mappings.filter(m => m.active).length} Active
                                        </Badge>
                                      </div>

                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Badge ID</TableHead>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Employee #</TableHead>
                                            <TableHead>Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {selectedDevice.mappings.map((mapping) => (
                                            <TableRow key={mapping.id}>
                                              <TableCell className="font-mono">
                                                {mapping.badge_id}
                                              </TableCell>
                                              <TableCell>
                                                {mapping.employee.first_name} {mapping.employee.last_name}
                                              </TableCell>
                                              <TableCell className="font-mono">
                                                {mapping.employee.employee_number}
                                              </TableCell>
                                              <TableCell>
                                                <Badge variant={mapping.active ? 'default' : 'secondary'}>
                                                  {mapping.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>

                                      {selectedDevice.mappings.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                                          <p>No employee mappings configured</p>
                                          <p className="text-sm">Add badge mappings to enable punch tracking</p>
                                        </div>
                                      )}
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {devices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No devices configured</p>
                <p>Add your first punch clock device to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {devices.filter(d => getDeviceStatus(d).status === 'online').length}
              </div>
              <p className="text-xs text-muted-foreground">
                of {devices.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Punches Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {deviceStats.reduce((sum, stat) => sum + stat.punches_today, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                across all devices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Mapped Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {deviceStats.reduce((sum, stat) => sum + stat.mapped_employees, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                with active badges
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}