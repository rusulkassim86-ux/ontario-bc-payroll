import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CalendarIcon } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Upload,
  Filter,
  Download
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Punch {
  id: string;
  device_id: string;
  employee_id: string;
  badge_id: string;
  punch_at: string;
  direction: 'IN' | 'OUT';
  method: string;
  source: string;
  exception_type: string | null;
  exception_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  devices?: {
    serial_number: string;
    location: string;
  };
  employees?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
}

export default function PunchFeed() {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPunch, setSelectedPunch] = useState<Punch | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadPunches();
  }, [startDate, endDate, filterStatus, filterEmployee]);

  const loadPunches = async () => {
    try {
      let query = supabase
        .from('punches')
        .select(`
          *,
          devices (serial_number, location),
          employees (first_name, last_name, employee_number)
        `)
        .gte('punch_at', startDate.toISOString())
        .lte('punch_at', endDate.toISOString())
        .order('punch_at', { ascending: false });

      if (filterStatus !== 'all') {
        if (filterStatus === 'exceptions') {
          query = query.not('exception_type', 'is', null);
        } else if (filterStatus === 'verified') {
          query = query.not('verified_at', 'is', null);
        } else if (filterStatus === 'unverified') {
          query = query.is('verified_at', null);
        }
      }

      if (filterEmployee) {
        query = query.or(`employees.employee_number.ilike.%${filterEmployee}%,employees.first_name.ilike.%${filterEmployee}%,employees.last_name.ilike.%${filterEmployee}%`);
      }

      const { data, error } = await query.limit(500);

      if (error) throw error;
      setPunches(data || []);
    } catch (error) {
      console.error('Error loading punches:', error);
      toast({
        title: "Error",
        description: "Failed to load punch data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPunch = async (punchId: string) => {
    try {
      const { error } = await supabase
        .from('punches')
        .update({
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', punchId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Punch verified successfully.",
      });

      loadPunches();
    } catch (error) {
      console.error('Error verifying punch:', error);
      toast({
        title: "Error",
        description: "Failed to verify punch.",
        variant: "destructive",
      });
    }
  };

  const handleEditPunch = async () => {
    if (!selectedPunch || !editReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the edit.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Log the edit in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          action: 'PUNCH_EDITED',
          entity_type: 'punch',
          entity_id: selectedPunch.id,
          metadata: {
            reason: editReason,
            original_punch_time: selectedPunch.punch_at,
            original_direction: selectedPunch.direction
          }
        });

      toast({
        title: "Success",
        description: "Punch edit logged successfully.",
      });

      setShowEditDialog(false);
      setSelectedPunch(null);
      setEditReason("");
      loadPunches();
    } catch (error) {
      console.error('Error editing punch:', error);
      toast({
        title: "Error",
        description: "Failed to edit punch.",
        variant: "destructive",
      });
    }
  };

  const getPunchStatusBadge = (punch: Punch) => {
    if (punch.verified_at) {
      return <Badge variant="default" className="bg-success text-success-foreground">Verified</Badge>;
    }
    if (punch.exception_type) {
      return <Badge variant="destructive">Exception</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getExceptionDetails = (punch: Punch) => {
    if (!punch.exception_type) return null;
    
    const types: Record<string, string> = {
      'missing_out': 'Missing OUT punch',
      'missing_in': 'Missing IN punch',
      'duplicate': 'Duplicate punch',
      'out_of_order': 'Out of order',
      'too_long': 'Shift too long',
      'too_short': 'Shift too short'
    };

    return types[punch.exception_type] || punch.exception_type;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Punch Feed & Exceptions" description="Loading..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Punch Feed & Exceptions" 
        description="Monitor and manage punch clock data"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="px-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Punches</SelectItem>
                    <SelectItem value="exceptions">Exceptions Only</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Employee</Label>
                <Input
                  placeholder="Search employee..."
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-[200px]"
                />
              </div>

              <Button>
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Punch Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Punch Records ({punches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Badge ID</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Exception</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punches.map((punch) => (
                  <TableRow key={punch.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">
                          {format(parseISO(punch.punch_at), "MM/dd/yyyy")}
                        </span>
                        <span className="font-mono text-sm font-semibold">
                          {format(parseISO(punch.punch_at), "HH:mm:ss")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {punch.employees ? 
                            `${punch.employees.first_name} ${punch.employees.last_name}` 
                            : 'Unknown'
                          }
                        </span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {punch.employees?.employee_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {punch.badge_id}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={punch.direction === 'IN' ? 'default' : 'secondary'}
                        className={punch.direction === 'IN' ? 'bg-success text-success-foreground' : ''}
                      >
                        {punch.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {punch.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">
                          {punch.devices?.serial_number}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {punch.devices?.location}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPunchStatusBadge(punch)}
                    </TableCell>
                    <TableCell>
                      {punch.exception_type ? (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="text-sm text-destructive">
                            {getExceptionDetails(punch)}
                          </span>
                        </div>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!punch.verified_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyPunch(punch.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPunch(punch);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Punch Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPunch && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Current Punch Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Employee:</strong> {selectedPunch.employees?.first_name} {selectedPunch.employees?.last_name}</p>
                    <p><strong>Time:</strong> {format(parseISO(selectedPunch.punch_at), "MM/dd/yyyy HH:mm:ss")}</p>
                    <p><strong>Direction:</strong> {selectedPunch.direction}</p>
                    <p><strong>Method:</strong> {selectedPunch.method}</p>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="reason">Reason for Edit</Label>
                <Textarea
                  id="reason"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Explain why this punch record needs to be modified..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditPunch}>
                  Log Edit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}