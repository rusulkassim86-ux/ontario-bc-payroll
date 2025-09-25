import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, CheckCircle, XCircle, Code, ArrowLeft } from "lucide-react";

interface RouteInfo {
  path: string;
  component: string;
  file: string;
  status: 'OK' | '404' | 'Unknown';
  description?: string;
}

export default function DevRoutes() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RouteInfo[]>([]);

  useEffect(() => {
    // Define all registered routes from App.tsx
    const registeredRoutes: RouteInfo[] = [
      {
        path: "/",
        component: "Dashboard",
        file: "src/pages/Dashboard.tsx",
        status: "OK",
        description: "Main dashboard page"
      },
      {
        path: "/company",
        component: "Company", 
        file: "src/pages/Company.tsx",
        status: "OK",
        description: "Company information and settings"
      },
      {
        path: "/employees",
        component: "Employees",
        file: "src/pages/Employees.tsx", 
        status: "OK",
        description: "Employee management"
      },
      {
        path: "/user-management",
        component: "UserManagement",
        file: "src/pages/UserManagement.tsx",
        status: "OK",
        description: "User accounts and roles"
      },
      {
        path: "/timesheets", 
        component: "Timesheets",
        file: "src/pages/Timesheets.tsx",
        status: "OK",
        description: "Timesheet overview and approval"
      },
      {
        path: "/timecard/:employeeId",
        component: "IndividualTimecard",
        file: "src/pages/IndividualTimecard.tsx",
        status: "OK", 
        description: "Individual employee timecard details"
      },
      {
        path: "/payroll",
        component: "Payroll",
        file: "src/pages/Payroll.tsx",
        status: "OK",
        description: "Payroll processing and management"
      },
      {
        path: "/reports",
        component: "Reports", 
        file: "src/pages/Reports.tsx",
        status: "OK",
        description: "Reports and analytics"
      },
      {
        path: "/security-center",
        component: "SecurityCenter",
        file: "src/pages/SecurityCenter.tsx",
        status: "OK",
        description: "Security settings and monitoring"
      },
      {
        path: "/backup-restore",
        component: "BackupRestore",
        file: "src/pages/BackupRestore.tsx", 
        status: "OK",
        description: "Data backup and restore"
      },
      {
        path: "/device-mapping",
        component: "DeviceMapping",
        file: "src/pages/DeviceMapping.tsx",
        status: "OK",
        description: "Device to employee mapping"
      },
      {
        path: "/punch-feed", 
        component: "PunchFeed",
        file: "src/pages/PunchFeed.tsx",
        status: "OK",
        description: "Real-time punch data feed"
      },
      {
        path: "/devices",
        component: "Devices",
        file: "src/pages/Devices.tsx",
        status: "OK",
        description: "Device management and configuration"
      },
      {
        path: "/punch-config",
        component: "PunchConfig", 
        file: "src/pages/PunchConfig.tsx",
        status: "OK",
        description: "Punch configuration settings"
      },
      {
        path: "/dev/routes",
        component: "DevRoutes",
        file: "src/pages/DevRoutes.tsx",
        status: "OK",
        description: "🛠️ Debug: Route registry (this page)"
      },
      {
        path: "*",
        component: "NotFound",
        file: "src/pages/NotFound.tsx",
        status: "OK",
        description: "404 fallback page"
      }
    ];

    setRoutes(registeredRoutes);
  }, []);

  const handleNavigate = (path: string) => {
    // Handle dynamic routes
    if (path.includes(':employeeId')) {
      navigate('/timecard/EMP001'); // Use example employee ID
    } else if (path === '*') {
      navigate('/non-existent-route'); // Trigger 404
    } else {
      navigate(path);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case '404':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Code className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge variant="default" className="bg-success text-success-foreground">OK</Badge>;
      case '404':
        return <Badge variant="destructive">404</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="🛠️ Route Registry"
        description="Debug page showing all registered application routes"
        action={
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Application Routes ({routes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Route Path</TableHead>
                    <TableHead className="w-[150px]">Component</TableHead>
                    <TableHead className="w-[250px]">File Location</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[300px]">Description</TableHead>
                    <TableHead className="w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {route.path}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {route.component}
                      </TableCell>
                      <TableCell>
                        <code className="text-sm text-muted-foreground">
                          {route.file}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(route.status)}
                          {getStatusBadge(route.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {route.description}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNavigate(route.path)}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Route Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Routes</p>
                  <p className="font-bold text-lg">{routes.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Routes</p>
                  <p className="font-bold text-lg text-success">
                    {routes.filter(r => r.status === 'OK').length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dynamic Routes</p>
                  <p className="font-bold text-lg text-primary">
                    {routes.filter(r => r.path.includes(':')).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This debug page is only visible in development/preview mode. 
                Click the "Go" button to navigate to each route and verify it works correctly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}