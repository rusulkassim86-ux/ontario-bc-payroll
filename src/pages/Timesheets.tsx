import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockTimesheets = [
  {
    id: 1,
    employee: "John Smith",
    employeeId: "EMP001",
    week: "Dec 16-22, 2024",
    regularHours: 40.0,
    overtimeHours: 8.5,
    status: "Pending Approval",
    approver: "Mike Wilson",
    worksite: "Toronto Main",
    projects: ["Project A", "Project B"]
  },
  {
    id: 2,
    employee: "Sarah Chen",
    employeeId: "EMP002",
    week: "Dec 16-22, 2024",
    regularHours: 37.5,
    overtimeHours: 0,
    status: "Approved",
    approver: "Lisa Johnson",
    worksite: "Vancouver Office",
    projects: ["Admin"]
  },
  {
    id: 3,
    employee: "Mike Johnson",
    employeeId: "EMP003",
    week: "Dec 16-22, 2024",
    regularHours: 40.0,
    overtimeHours: 4.0,
    status: "Submitted",
    approver: "Mike Wilson",
    worksite: "Toronto Main",
    projects: ["Project A"]
  }
];

export default function Timesheets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [directEmployeeId, setDirectEmployeeId] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const getEmployeeId = (timesheet: any): string | null => {
    // Try different possible ID field names in order of preference
    const idFields = ['employeeId', 'associateId', 'empNo', 'id'];
    
    for (const field of idFields) {
      if (timesheet[field]) {
        return timesheet[field].toString();
      }
    }
    return null;
  };

  const handleEmployeeClick = (timesheet: any) => {
    console.log('Row clicked - timesheet object:', timesheet);
    
    const employeeId = getEmployeeId(timesheet);
    
    if (employeeId) {
      const detectedField = ['employeeId', 'associateId', 'empNo', 'id'].find(field => timesheet[field]);
      setDebugInfo(`Using ID: ${employeeId} (from field: ${detectedField})`);
      
      toast({
        title: "Navigation",
        description: `Opening timecard for Employee ID: ${employeeId}`,
      });
      
      navigate(`/timecard/${employeeId}`);
    } else {
      console.error('No valid employee ID found in timesheet:', timesheet);
      setDebugInfo('Error: No valid employee ID found');
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to find employee ID in timesheet data",
      });
    }
  };

  const handleDirectTimecardOpen = () => {
    if (!directEmployeeId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an Employee ID",
      });
      return;
    }
    
    toast({
      title: "Navigation",
      description: `Opening timecard for Employee ID: ${directEmployeeId}`,
    });
    
    navigate(`/timecard/${directEmployeeId.trim()}`);
    setDirectEmployeeId(""); // Clear input after navigation
  };

  return (
    <TooltipProvider>
    <div className="space-y-6">
      {debugInfo && (
        <div className="px-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">Debug: {debugInfo}</p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2"
              onClick={() => setDebugInfo("")}
            >
              Clear
            </Button>
          </div>
        </div>
      )}
      <PageHeader 
        title="Time & Attendance" 
        description="Manage timesheets and approve hours worked"
        action={
          <Button className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Timesheet
          </Button>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Time Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12</p>
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
                  <p className="text-2xl font-bold">235</p>
                  <p className="text-sm text-muted-foreground">Approved This Week</p>
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
                  <p className="text-2xl font-bold">9,847</p>
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
                  <p className="text-2xl font-bold">1,247</p>
                  <p className="text-sm text-muted-foreground">Overtime Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
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
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filter by Week
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timesheet Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="all">All Timesheets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Timesheets Pending Approval</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Direct Employee ID Input */}
                <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-end gap-3 max-w-md">
                    <div className="flex-1">
                      <Label htmlFor="direct-employee-id" className="text-sm font-medium">
                        Quick Access
                      </Label>
                      <Input
                        id="direct-employee-id"
                        placeholder="Enter Employee ID…"
                        value={directEmployeeId}
                        onChange={(e) => setDirectEmployeeId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleDirectTimecardOpen();
                          }
                        }}
                      />
                    </div>
                    <Button onClick={handleDirectTimecardOpen}>
                      Open Timecard
                    </Button>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Regular Hours</TableHead>
                      <TableHead>Overtime Hours</TableHead>
                      <TableHead>Worksite</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Open Timecard</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTimesheets
                      .filter(ts => ts.status === "Pending Approval")
                      .map((timesheet) => {
                        // Debug: Console log the full row object
                        console.log('Row object:', timesheet);
                        
                        // Get the detected employee ID and field name
                        const employeeId = getEmployeeId(timesheet);
                        const detectedField = ['employeeId', 'associateId', 'empNo', 'id'].find(field => timesheet[field]);
                        
                        return (
                      <TableRow 
                        key={timesheet.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleEmployeeClick(timesheet)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{timesheet.employee}</p>
                            <p className="text-sm text-muted-foreground">{timesheet.employeeId}</p>
                            {/* Debug caption showing detected ID */}
                            <p className="text-xs text-muted-foreground/70 italic">
                              Debug: {detectedField} = {employeeId || 'NOT_FOUND'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const employeeId = getEmployeeId(timesheet);
                            return employeeId ? (
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/timecard/${employeeId}`);
                                }}
                              >
                                Open Timecard
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                disabled
                                variant="outline"
                              >
                                Missing ID
                              </Button>
                            );
                          })()}
                        </TableCell>
                        <TableCell>{timesheet.week}</TableCell>
                        <TableCell className="font-mono">{timesheet.regularHours}</TableCell>
                        <TableCell className="font-mono text-accent">
                          {timesheet.overtimeHours > 0 ? timesheet.overtimeHours : '-'}
                        </TableCell>
                        <TableCell>{timesheet.worksite}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                            {timesheet.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEmployeeClick(timesheet);
                                  }}
                                >
                                  Review
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Open Individual Timecard</p>
                              </TooltipContent>
                            </Tooltip>
                            <Button 
                              size="sm" 
                              className="bg-success text-success-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="approved">
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Approved timesheets view will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="submitted">
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Submitted timesheets view will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="all">
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">All timesheets view will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </TooltipProvider>
  );
}