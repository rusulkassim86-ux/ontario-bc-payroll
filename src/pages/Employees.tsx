import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2
} from "lucide-react";

const mockEmployees = [
  {
    id: 1,
    name: "John Smith",
    employeeId: "EMP001",
    department: "Operations",
    position: "Electrician",
    province: "ON",
    worksite: "Toronto Main",
    union: "IBEW Local 353",
    classification: "Journeyman",
    step: 5,
    status: "Active",
    hireDate: "2022-01-15",
    email: "john.smith@company.com",
    phone: "(416) 555-0123"
  },
  {
    id: 2,
    name: "Sarah Chen",
    employeeId: "EMP002",
    department: "Administration",
    position: "Payroll Coordinator",
    province: "BC",
    worksite: "Vancouver Office",
    union: null,
    classification: "Exempt",
    step: null,
    status: "Active",
    hireDate: "2023-03-20",
    email: "sarah.chen@company.com",
    phone: "(604) 555-0456"
  },
  {
    id: 3,
    name: "Mike Johnson",
    employeeId: "EMP003",
    department: "Operations",
    position: "Apprentice Electrician",
    province: "ON",
    worksite: "Toronto Main",
    union: "IBEW Local 353",
    classification: "1st Year Apprentice",
    step: 1,
    status: "Active",
    hireDate: "2024-09-01",
    email: "mike.johnson@company.com",
    phone: "(416) 555-0789"
  }
];

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredEmployees = mockEmployees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employees" 
        description="Manage your workforce across ON & BC"
        action={
          <Button className="bg-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
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
                  <p className="text-2xl font-bold">247</p>
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
                  <p className="text-2xl font-bold">156</p>
                  <p className="text-sm text-muted-foreground">Union Members</p>
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
                  <p className="text-2xl font-bold">91</p>
                  <p className="text-sm text-muted-foreground">Non-Union</p>
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
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-sm text-muted-foreground">New This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search employees by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="md:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" className="md:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
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
                      <TableHead>ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Union Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{employee.employeeId}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={employee.province === 'ON' ? 'border-primary/50 text-primary' : 'border-accent/50 text-accent'}>
                            {employee.province}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.union ? (
                            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                              {employee.union}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Non-Union</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Employee
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Download Info
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="union">
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Union employees view will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="non-union">
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Non-union employees view will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="inactive">
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Inactive employees view will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}