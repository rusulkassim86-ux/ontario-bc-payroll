import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Eye, 
  Download,
  Users,
  MapPin,
  Building2,
  Upload,
  FileText,
  DollarSign
} from "lucide-react";
import { NewHireForm } from "@/components/employees/NewHireForm";
import { BulkEmployeeImport } from "@/components/employees/BulkEmployeeImport";
import { useEmployees } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterProvince, setFilterProvince] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showNewHireForm, setShowNewHireForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { useEmployeesList } = useEmployees();
  const { data: employees, isLoading } = useEmployeesList();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Enhanced filtering logic
  const filteredEmployees = useMemo(() => {
    let filtered = employees || [];

    // Text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.first_name.toLowerCase().includes(search) ||
        emp.last_name.toLowerCase().includes(search) ||
        emp.employee_number.toLowerCase().includes(search) ||
        (emp.company_code && emp.company_code.toLowerCase().includes(search))
      );
    }

    // Province filter
    if (filterProvince) {
      filtered = filtered.filter(emp => emp.province_code === filterProvince);
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(emp => emp.status === filterStatus);
    }

    // Tab filter
    if (activeTab === "union") {
      filtered = filtered.filter(emp => emp.company_code?.startsWith('72S'));
    } else if (activeTab === "non-union") {
      filtered = filtered.filter(emp => !emp.company_code?.startsWith('72S'));
    } else if (activeTab === "inactive") {
      filtered = filtered.filter(emp => emp.status !== 'active');
    }

    return filtered;
  }, [employees, searchTerm, filterProvince, filterStatus, activeTab]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = employees?.length || 0;
    const union = employees?.filter(emp => emp.company_code?.startsWith('72S')).length || 0;
    const nonUnion = total - union;
    const inactive = employees?.filter(emp => emp.status !== 'active').length || 0;
    const newThisMonth = employees?.filter(emp => {
      const hireDate = new Date(emp.hire_date);
      const now = new Date();
      return hireDate.getMonth() === now.getMonth() && hireDate.getFullYear() === now.getFullYear();
    }).length || 0;

    return { total, union, nonUnion, inactive, newThisMonth };
  }, [employees]);

  const handleRowClick = (employeeId: string) => {
    navigate(`/employees/${employeeId}`);
  };

  const handleExport = async (type: 'employees' | 't4') => {
    try {
      if (type === 'employees') {
        // Export employee list
        const csvData = filteredEmployees.map(emp => ({
          'Employee ID': emp.employee_number,
          'Name': `${emp.first_name} ${emp.last_name}`,
          'Prefix Code': emp.company_code,
          'Province': emp.province_code,
          'Status': emp.status,
          'Hire Date': emp.hire_date,
          'Email': emp.email,
          'Phone': emp.phone
        }));
        
        const csv = [
          Object.keys(csvData[0]).join(','),
          ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        toast({ title: "Export Complete", description: "Employee list exported successfully" });
      } else {
        toast({ title: "T4 Export", description: "T4-ready export will be implemented with year-end functionality" });
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Export Failed", 
        description: "Failed to export data" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employees" 
        description="Manage your workforce across ON & BC"
        action={
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowBulkImport(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Employees
            </Button>
            <Button 
              className="bg-gradient-primary"
              onClick={() => setShowNewHireForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Employee Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Building2 className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.union}</p>
                  <p className="text-sm text-muted-foreground">Union Members (72S)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.nonUnion}</p>
                  <p className="text-sm text-muted-foreground">Non-Union (72R/OZC)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Users className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.newThisMonth}</p>
                  <p className="text-sm text-muted-foreground">New This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, ID, or prefix code (72R, 72S, OZC)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterProvince} onValueChange={setFilterProvince}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Provinces</SelectItem>
                  <SelectItem value="ON">Ontario</SelectItem>
                  <SelectItem value="BC">British Columbia</SelectItem>
                  <SelectItem value="AB">Alberta</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('employees')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Employee List (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('t4')}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    T4-Ready Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Employee Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Employees</TabsTrigger>
            <TabsTrigger value="union">Union</TabsTrigger>
            <TabsTrigger value="non-union">Non-Union</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Employee Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Prefix Code</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pay Frequency</TableHead>
                      <TableHead>Latest Gross</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading employees...
                        </TableCell>
                      </TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <TableRow 
                          key={employee.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(employee.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {employee.first_name[0]}{employee.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{employee.employee_number}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={employee.company_code?.startsWith('72S') ? 'default' : 'secondary'}
                              className={employee.company_code?.startsWith('72S') ? 'bg-success/10 text-success border-success/20' : ''}
                            >
                              {employee.company_code || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={employee.province_code === 'ON' ? 'border-primary/50 text-primary' : 'border-accent/50 text-accent'}>
                              {employee.province_code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            Biweekly
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <span className="text-muted-foreground">$</span>0.00
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(employee.id);
                                }}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Employee
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download Info
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="union">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Union Employees (72S)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Union employees are automatically filtered. Use the "All Employees" tab to see all union members.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="non-union">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Non-Union Employees (72R, OZC)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Non-union employees are automatically filtered. Use the "All Employees" tab to see all non-union members.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="inactive">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Inactive Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Inactive employees are automatically filtered. Use the "All Employees" tab to see all inactive employees.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Hire Form Dialog */}
        <Dialog open={showNewHireForm} onOpenChange={setShowNewHireForm}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Employee Onboarding</DialogTitle>
            </DialogHeader>
            <NewHireForm 
              onSuccess={() => setShowNewHireForm(false)}
              onCancel={() => setShowNewHireForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <BulkEmployeeImport 
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
        />
      </div>
    </div>
  );
}