import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download, 
  MoreVertical,
  FileText,
  Building2,
  Users,
  UserPlus
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { NewHireForm } from "@/components/employees/NewHireForm";
import { BulkEmployeeImport } from "@/components/employees/BulkEmployeeImport";
import { cn } from "@/lib/utils";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUnion, setFilterUnion] = useState("all");
  const [showNewHireForm, setShowNewHireForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { useEmployeesList } = useEmployees();
  const { data: employees = [], isLoading, error } = useEmployeesList();

  // Filter employees based on search and filters
  const filteredEmployees = employees.filter(emp => {
    // Search filter
    const searchMatch = 
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    // Union filter (based on prefix)
    if (filterUnion && filterUnion !== "all") {
      if (filterUnion === "72S" && !emp.company_code?.startsWith('72S')) return false;
      if (filterUnion === "72R" && !emp.company_code?.startsWith('72R')) return false;
      if (filterUnion === "other" && emp.company_code?.startsWith('72')) return false;
    }

    // Province filter
    if (filterProvince && filterProvince !== "all") {
      if (emp.province_code !== filterProvince) return false;
    }

    // Status filter
    if (filterStatus && filterStatus !== "all") {
      if (emp.status !== filterStatus) return false;
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUnionType = (companyCode?: string) => {
    if (companyCode?.startsWith('72S')) return { label: 'Union', color: 'bg-blue-100 text-blue-800' };
    if (companyCode?.startsWith('72R')) return { label: 'Non-Union', color: 'bg-purple-100 text-purple-800' };
    return { label: 'Other', color: 'bg-gray-100 text-gray-800' };
  };

  const formatCurrency = (amount?: number) => 
    amount ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount) : 'N/A';

  const handleExport = (type: 'employees' | 't4') => {
    // Export functionality placeholder
    console.log(`Exporting ${type} data...`);
  };

  const handleRowClick = (employeeId: string) => {
    window.open(`/employees/${employeeId}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employee Directory" />
        <div className="text-center py-8">Loading employees...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employee Directory" />
        <div className="text-center py-8 text-red-600">Error loading employees: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Directory" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Union (72S)</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.company_code?.startsWith('72S')).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Non-Union (72R)</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.company_code?.startsWith('72R')).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employee Directory
            </CardTitle>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowNewHireForm(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                New Hire
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowBulkImport(true)}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Employees
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background border shadow-md z-50">
                  <DropdownMenuItem onClick={() => handleExport('employees')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Employee List (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('t4')}>
                    <FileText className="w-4 h-4 mr-2" />
                    T4-Ready Export (Excel)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterUnion} onValueChange={setFilterUnion}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Union Type" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="72S">Union (72S)</SelectItem>
                  <SelectItem value="72R">Non-Union (72R)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterProvince} onValueChange={setFilterProvince}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Province" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">All Provinces</SelectItem>
                  <SelectItem value="ON">Ontario</SelectItem>
                  <SelectItem value="BC">British Columbia</SelectItem>
                  <SelectItem value="AB">Alberta</SelectItem>
                  <SelectItem value="QC">Quebec</SelectItem>
                  <SelectItem value="MB">Manitoba</SelectItem>
                  <SelectItem value="SK">Saskatchewan</SelectItem>
                  <SelectItem value="NS">Nova Scotia</SelectItem>
                  <SelectItem value="NB">New Brunswick</SelectItem>
                  <SelectItem value="PE">Prince Edward Island</SelectItem>
                  <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                  <SelectItem value="NT">Northwest Territories</SelectItem>
                  <SelectItem value="NU">Nunavut</SelectItem>
                  <SelectItem value="YT">Yukon</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead>
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
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {searchTerm || filterProvince !== "all" || filterStatus !== "all" || filterUnion !== "all" 
                        ? "No employees match your filters." 
                        : "No employees found. Add your first employee to get started."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => {
                    const unionType = getUnionType(employee.company_code);
                    
                    return (
                      <TableRow 
                        key={employee.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(employee.id)}
                      >
                        <TableCell>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {employee.first_name[0]}{employee.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                            <div className="text-sm text-muted-foreground">{employee.job_title || 'No title'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{employee.employee_number}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", unionType.color)}>
                            {employee.company_code}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.province_code}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getStatusColor(employee.status))}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.pay_frequency || 'Biweekly'}</TableCell>
                        <TableCell>{formatCurrency(employee.salary)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background border shadow-md z-50">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(employee.id);
                              }}>
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                // Edit functionality
                              }}>
                                Edit Employee
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                // Export individual functionality
                              }}>
                                Export Data
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredEmployees.length} of {employees.length} employees
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {showNewHireForm && (
        <NewHireForm />
      )}
      
      {showBulkImport && (
        <BulkEmployeeImport 
          open={showBulkImport} 
          onOpenChange={setShowBulkImport} 
        />
      )}
    </div>
  );
}