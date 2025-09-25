import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Settings, Smartphone, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Device {
  id: string;
  serial_number: string;
  model: string;
  location: string;
  status: string;
  last_heartbeat_at: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
}

interface DeviceMapping {
  id: string;
  device_id: string;
  employee_id: string;
  badge_id: string;
  active: boolean;
  device?: Device;
  employee?: Employee;
}

export default function DeviceMapping() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mappings, setMappings] = useState<DeviceMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const { toast } = useToast();

  const [newMapping, setNewMapping] = useState({
    device_id: "",
    employee_id: "",
    badge_id: "",
    active: true
  });

  const [newDevice, setNewDevice] = useState({
    serial_number: "",
    model: "",
    location: "",
    status: "active"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load employees from existing table
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // TODO: Load devices and mappings after migration is approved
      // Temporarily setting empty arrays to prevent TypeScript errors
      setDevices([]);
      setMappings([]);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load device mapping data. Please approve the database migration first.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
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

  const handleAddMapping = async () => {
    try {
      toast({
        title: "Migration Required",
        description: "Please approve the database migration first before adding mappings.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error adding mapping:', error);
      toast({
        title: "Error",
        description: "Failed to add employee mapping.",
        variant: "destructive",
      });
    }
  };

  const toggleMappingActive = async (mappingId: string, active: boolean) => {
    try {
      toast({
        title: "Migration Required",
        description: "Please approve the database migration first.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast({
        title: "Error",
        description: "Failed to update mapping.",
        variant: "destructive",
      });
    }
  };

  const getDeviceStatus = (device: Device) => {
    if (!device.last_heartbeat_at) return { status: 'unknown', color: 'secondary' };
    
    const lastSeen = new Date(device.last_heartbeat_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes > 15) return { status: 'offline', color: 'destructive' };
    if (diffMinutes > 5) return { status: 'warning', color: 'warning' };
    return { status: 'online', color: 'success' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Device Mapping" description="Loading..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Device Mapping" 
        description="Manage punch clock devices and employee badge mappings"
        action={
          <div className="flex gap-2">
            <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Smartphone className="w-4 h-4 mr-2" />
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
                    <Button variant="outline" onClick={() => setShowDeviceDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddDevice}>Add Device</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mapping
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Employee-Device Mapping</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="device">Device</Label>
                    <Select 
                      value={newMapping.device_id}
                      onValueChange={(value) => setNewMapping(prev => ({ ...prev, device_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map(device => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.serial_number} - {device.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="employee">Employee</Label>
                    <Select 
                      value={newMapping.employee_id}
                      onValueChange={(value) => setNewMapping(prev => ({ ...prev, employee_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.first_name} {employee.last_name} ({employee.employee_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="badge">Badge ID</Label>
                    <Input
                      id="badge"
                      value={newMapping.badge_id}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, badge_id: e.target.value }))}
                      placeholder="Enter badge/card ID"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMapping}>Add Mapping</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="px-6 space-y-6">
        <Tabs defaultValue="mappings">
          <TabsList>
            <TabsTrigger value="mappings">Employee Mappings</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="mappings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee-Device Mappings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Badge ID</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Device Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Please approve the database migration to view employee mappings
                        </TableCell>
                      </TableRow>
                    ) : (
                      mappings.map((mapping) => {
                        const deviceStatus = mapping.device ? getDeviceStatus(mapping.device) : { status: 'unknown', color: 'secondary' };
                        
                        return (
                          <TableRow key={mapping.id}>
                            <TableCell>
                              {mapping.employee ? 
                                `${mapping.employee.first_name} ${mapping.employee.last_name}` 
                                : 'Unknown Employee'
                              }
                            </TableCell>
                            <TableCell className="font-mono">
                              {mapping.employee?.employee_number}
                            </TableCell>
                            <TableCell className="font-mono font-semibold">
                              {mapping.badge_id}
                            </TableCell>
                            <TableCell>
                              {mapping.device ? 
                                `${mapping.device.serial_number} (${mapping.device.location})` 
                                : 'Unknown Device'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={deviceStatus.color as any}>
                                {deviceStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={mapping.active}
                                onCheckedChange={(checked) => toggleMappingActive(mapping.id, checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
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
                      <TableHead>Mapped Employees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Please approve the database migration to view devices
                        </TableCell>
                      </TableRow>
                    ) : (
                      devices.map((device) => {
                        const deviceStatus = getDeviceStatus(device);
                        const mappedCount = mappings.filter(m => m.device_id === device.id && m.active).length;
                        
                        return (
                          <TableRow key={device.id}>
                            <TableCell className="font-mono font-semibold">
                              {device.serial_number}
                            </TableCell>
                            <TableCell>{device.model}</TableCell>
                            <TableCell>{device.location}</TableCell>
                            <TableCell>
                              <Badge variant={deviceStatus.color as any}>
                                {deviceStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {device.last_heartbeat_at ? 
                                new Date(device.last_heartbeat_at).toLocaleString()
                                : 'Never'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{mappedCount} employees</Badge>
                                {mappedCount === 0 && (
                                  <AlertTriangle className="w-4 h-4 text-warning" />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}