import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Download,
  Filter,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PunchCSVImport } from "@/components/punch/PunchCSVImport";
import { useTimesheetsByCompanyCode } from "@/hooks/useTimesheetsByCompanyCode";

const COMPANY_CODES = [
  { code: 'OZC', name: 'Kitsault (OZC)' },
  { code: '72R', name: '72R' },
  { code: '72S', name: '72S' },
];

export default function Timesheets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>("OZC");
  const [directEmployeeId, setDirectEmployeeId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { timesheets, loading, error } = useTimesheetsByCompanyCode(selectedCompanyCode);

  const handleDirectTimecardOpen = () => {
    if (!directEmployeeId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an Employee ID",
      });
      return;
    }
    
    const id = directEmployeeId.trim();
    console.info('[Timesheets] Opening timecard for employee:', id, '-> /timecard/' + id + '/biweekly');
    navigate(`/timecard/${id}/biweekly`, { replace: false });
    setDirectEmployeeId("");
  };

  const handleViewTimecard = (employeeNumber: string) => {
    console.info('[Timesheets] View Timecard clicked for:', employeeNumber, '-> /timecard/' + employeeNumber + '/biweekly');
    navigate(`/timecard/${employeeNumber}/biweekly`, { replace: false });
  };

  // Calculate stats
  const stats = {
    pendingApproval: timesheets.filter(ts => !ts.week1Approved || !ts.week2Approved).length,
    fullyApproved: timesheets.filter(ts => ts.canProcessPayroll).length,
    totalRegularHours: timesheets.reduce((sum, ts) => 
      sum + ts.week1Hours.regular + ts.week2Hours.regular, 0
    ),
    totalOvertimeHours: timesheets.reduce((sum, ts) => 
      sum + ts.week1Hours.overtime + ts.week2Hours.overtime, 0
    ),
  };

  // Filter timesheets by search term
  const filteredTimesheets = timesheets.filter(ts =>
    ts.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ts.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Time & Attendance" 
        description="Manage timesheets and approve bi-weekly hours"
        action={
          <div className="flex gap-2">
            <PunchCSVImport />
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Timesheet
            </Button>
          </div>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Company Code Selector */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Label className="font-semibold">Company Code:</Label>
              <Select value={selectedCompanyCode} onValueChange={setSelectedCompanyCode}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_CODES.map(cc => (
                    <SelectItem key={cc.code} value={cc.code}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading && <Skeleton className="h-6 w-20" />}
            </div>
          </CardContent>
        </Card>

        {/* Time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="w-4 h-4 text-warning" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.pendingApproval}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.fullyApproved}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Fully Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalRegularHours.toFixed(1)}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Regular Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-accent" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.totalOvertimeHours.toFixed(1)}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Overtime Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Quick Access */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by employee name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-end">
                <div>
                  <Label htmlFor="direct-employee-id" className="text-sm font-medium">
                    Quick Access
                  </Label>
                  <Input
                    id="direct-employee-id"
                    placeholder="Employee ID"
                    value={directEmployeeId}
                    onChange={(e) => setDirectEmployeeId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDirectTimecardOpen();
                    }}
                    className="w-40"
                  />
                </div>
                <Button onClick={handleDirectTimecardOpen}>
                  Open
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bi-Weekly Timesheets */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Bi-Weekly Timesheets
                {timesheets.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({timesheets[0].period.periodLabel})
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
                {error}
              </div>
            )}
            
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTimesheets.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {timesheets.length === 0 
                    ? `No employees found for ${selectedCompanyCode}` 
                    : 'No timesheets match your search'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Week 1</TableHead>
                    <TableHead className="text-center">Week 2</TableHead>
                    <TableHead className="text-center">Total Hours</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimesheets.map((ts) => (
                    <TableRow key={ts.employee_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ts.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{ts.employee_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-sm">
                              <div className="font-mono">{(ts.week1Hours.regular + ts.week1Hours.overtime + ts.week1Hours.stat).toFixed(1)}h</div>
                              {ts.week1Hours.overtime > 0 && (
                                <div className="text-xs text-accent">+{ts.week1Hours.overtime.toFixed(1)} OT</div>
                              )}
                            </div>
                            {ts.week1Approved ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="text-sm">
                              <div className="font-mono">{(ts.week2Hours.regular + ts.week2Hours.overtime + ts.week2Hours.stat).toFixed(1)}h</div>
                              {ts.week2Hours.overtime > 0 && (
                                <div className="text-xs text-accent">+{ts.week2Hours.overtime.toFixed(1)} OT</div>
                              )}
                            </div>
                            {ts.week2Approved ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold">{ts.totalHours.toFixed(1)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {ts.canProcessPayroll ? (
                          <Badge variant="default" className="bg-success/10 text-success border-success/20">
                            Ready for Payroll
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                            Pending Approval
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewTimecard(ts.employee_number)}
                        >
                          View Timecard
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Approval Requirements */}
        <Card className="shadow-card bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Bi-Weekly Approval Required</p>
                <p className="text-muted-foreground mt-1">
                  Both Week 1 and Week 2 must be approved before timesheet data can be processed for payroll. 
                  Once approved, hours will automatically feed into the payroll run for {selectedCompanyCode}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
