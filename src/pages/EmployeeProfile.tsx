import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar as CalendarIcon,
  DollarSign,
  FileText,
  Eye,
  EyeOff,
  Building2,
  User,
  CreditCard,
  MoreVertical,
  Download,
  Printer,
  Plus,
  ChevronDown
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmployeeData {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  status: string;
  sin_encrypted?: string;
  hire_date: string;
  rehire_date?: string;
  province_code: string;
  company_code: string;
  email?: string;
  phone?: string;
  address?: any;
  reports_to_id?: string;
  position_start_date?: string;
  job_title?: string;
  job_function?: string;
  worker_category?: string;
  pay_grade?: string;
  management_position?: boolean;
  salary?: number;
  annual_salary?: number;
  pay_frequency?: string;
  rate2?: number;
  standard_hours?: number;
  premium_rate_factor?: number;
  business_unit?: string;
  location?: string;
  benefits_eligibility_class?: string;
  union_code?: string;
  union_local?: string;
  home_department?: string;
  home_cost_number?: string;
  fte?: number;
  assigned_shift?: string;
  scheduled_hours?: number;
  accrual_date?: string;
  default_start_time?: string;
  default_request_hours?: number;
  reports_to?: any;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showSIN, setShowSIN] = useState(false);
  const [activeTab, setActiveTab] = useState("employment");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingSection, setEditingSection] = useState<string | null>(null);

  // Fetch employee details
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) throw new Error('Employee ID required');
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          reports_to:employees!employees_reports_to_id_fkey(
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as EmployeeData;
    },
    enabled: !!id,
  });

  if (employeeLoading || !employee) {
    return (
      <div className="min-h-screen bg-muted/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">Loading employee profile...</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount?: number) => 
    amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount) : 'Not set';

  const formatSIN = (sin?: string) => {
    if (!sin) return 'Not provided';
    if (!showSIN) return 'XXX-XX-' + sin.slice(-3);
    return sin.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'leave': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const EditModal = ({ section, title, children }: { section: string; title: string; children: React.ReactNode }) => (
    <Dialog open={editingSection === section} onOpenChange={() => setEditingSection(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
            <Button onClick={() => setEditingSection(null)}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-xl font-medium">
                    {employee.first_name[0]}{employee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">{employee.first_name} {employee.last_name}</h1>
                    <Badge className={cn("text-xs", getStatusColor(employee.status))}>
                      {employee.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{employee.job_title || 'Position'} – {employee.home_department || 'Department'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div><span className="text-muted-foreground">Position ID:</span> {employee.employee_number}</div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax ID (SIN):</span>
                  <span className="font-mono">{formatSIN(employee.sin_encrypted)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSIN(!showSIN)}
                    className="h-6 w-6 p-0"
                  >
                    {showSIN ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </div>
                <div><span className="text-muted-foreground">Rehire Date:</span> {employee.rehire_date ? format(new Date(employee.rehire_date), 'MMM dd, yyyy') : 'N/A'}</div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    Take action
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <User className="w-4 h-4 mr-2" />
                    Change status
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Add earning
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Plus className="w-4 h-4 mr-2" />
                    Add custom field
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select defaultValue="active">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">People with active status</SelectItem>
                  <SelectItem value="all">All people</SelectItem>
                  <SelectItem value="inactive">Inactive people</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Search people..." className="w-64" />
            </div>
            <div className="text-sm text-muted-foreground">1 of 1</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="sticky top-[140px] bg-muted/20 z-10 -mx-6 px-6 py-2">
            <TabsList className="grid w-full grid-cols-5 max-w-2xl">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
              <TabsTrigger value="talent">Talent</TabsTrigger>
              <TabsTrigger value="compliance">Statutory Compliance</TabsTrigger>
            </TabsList>
          </div>

          {/* Employment Tab */}
          <TabsContent value="employment" className="space-y-6">
            {/* Show as of Date */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Show as of</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">(default today)</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Position */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Position</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSection('position')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Job Title</Label>
                    <p className="text-sm">{employee.job_title || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Reports To</Label>
                    <p className="text-sm">
                      {employee.reports_to ? 
                        `${employee.reports_to.first_name} ${employee.reports_to.last_name}` : 
                        'Not specified'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Position Start Date</Label>
                    <p className="text-sm">
                      {employee.position_start_date ? 
                        format(new Date(employee.position_start_date), 'MMM dd, yyyy') : 
                        format(new Date(employee.hire_date), 'MMM dd, yyyy')
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Management Position</Label>
                    <p className="text-sm">{employee.management_position ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Job Function</Label>
                    <p className="text-sm">{employee.job_function || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Worker Category</Label>
                    <p className="text-sm">{employee.worker_category || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Pay Grade</Label>
                    <p className="text-sm">{employee.pay_grade || 'Not specified'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Status */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Status</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSection('status')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div>
                      <Badge className={cn("text-xs", getStatusColor(employee.status))}>
                        {employee.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hire Date</Label>
                    <p className="text-sm">{format(new Date(employee.hire_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Leave Return Date</Label>
                    <p className="text-sm">Not applicable</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Leave Return Reason</Label>
                    <p className="text-sm">Not applicable</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rehire Date</Label>
                    <p className="text-sm">
                      {employee.rehire_date ? 
                        format(new Date(employee.rehire_date), 'MMM dd, yyyy') : 
                        'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rehire Reason</Label>
                    <p className="text-sm">N/A</p>
                  </div>
                </CardContent>
              </Card>

              {/* Regular Pay */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Regular Pay</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSection('pay')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Salary</Label>
                    <p className="text-sm">{formatCurrency(employee.salary)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Annual Salary</Label>
                    <p className="text-sm">{formatCurrency(employee.annual_salary)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Premium Rate Factors</Label>
                    <p className="text-sm">{employee.premium_rate_factor || '1.5'} × 1.0</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Pay Frequency</Label>
                    <p className="text-sm">{employee.pay_frequency || 'Biweekly'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rate 2</Label>
                    <p className="text-sm">{formatCurrency(employee.rate2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Standard Hours</Label>
                    <p className="text-sm">{employee.standard_hours || 'Not specified'}</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2">
                    More Rates
                  </Button>
                </CardContent>
              </Card>

              {/* Corporate Groups */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Corporate Groups</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSection('corporate')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Change Reason</Label>
                    <p className="text-sm">New Hire</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Business Unit</Label>
                    <p className="text-sm">{employee.business_unit || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="text-sm">{employee.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Benefits Eligibility Class</Label>
                    <p className="text-sm">{employee.benefits_eligibility_class || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Union Code</Label>
                    <p className="text-sm">{employee.union_code || employee.company_code || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Union Local</Label>
                    <p className="text-sm">{employee.union_local || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Home Department</Label>
                    <p className="text-sm">{employee.home_department || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Home Cost Number</Label>
                    <p className="text-sm">{employee.home_cost_number || 'Not specified'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Work Schedule */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Work Schedule</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSection('schedule')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">FTE</Label>
                    <p className="text-sm">{employee.fte || '1.0'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Assigned Shift</Label>
                    <p className="text-sm">{employee.assigned_shift || 'Day Shift'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Scheduled Hours</Label>
                    <p className="text-sm">{employee.scheduled_hours || '40.0'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Time Off */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Time Off</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingSection('timeoff')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Restricted Period Calendar</Label>
                    <p className="text-sm">Standard</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Accrual Date</Label>
                    <p className="text-sm">
                      {employee.accrual_date ? 
                        format(new Date(employee.accrual_date), 'MMM dd, yyyy') : 
                        format(new Date(employee.hire_date), 'MMM dd, yyyy')
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Default Start Time</Label>
                    <p className="text-sm">{employee.default_start_time || '09:00'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Default Request Hours</Label>
                    <p className="text-sm">{employee.default_request_hours || '8.0'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Custom Fields */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Custom Fields</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEditingSection('custom')}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg text-center text-muted-foreground">
                    No custom fields defined
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Field
                </Button>
              </CardContent>
            </Card>

            {/* Additional Earnings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Additional Earnings</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No additional earnings defined
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Tabs - Placeholder */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Personal information tab content coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benefits" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Benefits tab content coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="talent" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Talent tab content coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Statutory compliance tab content coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Modals */}
        <EditModal section="position" title="Position">
          <div className="space-y-4">
            <div>
              <Label>Job Title</Label>
              <Input defaultValue={employee.job_title || ''} />
            </div>
            <div>
              <Label>Management Position</Label>
              <Select defaultValue={employee.management_position ? 'yes' : 'no'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </EditModal>

        <EditModal section="status" title="Status">
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select defaultValue={employee.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="leave">Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </EditModal>

        <EditModal section="pay" title="Regular Pay">
          <div className="space-y-4">
            <div>
              <Label>Salary</Label>
              <Input type="number" defaultValue={employee.salary || ''} />
            </div>
            <div>
              <Label>Annual Salary</Label>
              <Input type="number" defaultValue={employee.annual_salary || ''} />
            </div>
          </div>
        </EditModal>
      </div>
    </div>
  );
}
