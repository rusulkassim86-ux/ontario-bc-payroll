import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Calculator, 
  Play, 
  CheckCircle, 
  DollarSign, 
  Users, 
  FileText,
  AlertTriangle,
  Clock,
  Download
} from "lucide-react";

const mockPayrollRuns = [
  {
    id: 1,
    period: "Dec 16-29, 2024",
    payDate: "Jan 3, 2025",
    status: "In Progress",
    employees: 247,
    grossPay: 412750.00,
    netPay: 298423.50,
    deductions: 114326.50,
    progress: 75
  },
  {
    id: 2,
    period: "Dec 1-15, 2024",
    payDate: "Dec 20, 2024",
    status: "Completed",
    employees: 245,
    grossPay: 384250.00,
    netPay: 278120.30,
    deductions: 106129.70,
    progress: 100
  },
  {
    id: 3,
    period: "Nov 16-30, 2024",
    payDate: "Dec 6, 2024",
    status: "Completed",
    employees: 243,
    grossPay: 396180.00,
    netPay: 287432.10,
    deductions: 108747.90,
    progress: 100
  }
];

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("current");

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Payroll" 
        description="Manage payroll runs and calculations"
        action={
          <Button className="bg-gradient-primary">
            <Play className="w-4 h-4 mr-2" />
            Start New Payroll
          </Button>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Payroll Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calculator className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">$412.8K</p>
                  <p className="text-sm text-muted-foreground">Current Gross Pay</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">$298.4K</p>
                  <p className="text-sm text-muted-foreground">Current Net Pay</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">247</p>
                  <p className="text-sm text-muted-foreground">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">7</p>
                  <p className="text-sm text-muted-foreground">Days to Pay Date</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Payroll Status */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Current Payroll Run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Pay Period: Dec 16-29, 2024</h3>
                <p className="text-muted-foreground">Pay Date: January 3, 2025</p>
              </div>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                In Progress
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Payroll Calculation Progress</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                <p className="text-sm font-medium">Timesheets</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                <p className="text-sm font-medium">Deductions</p>
                <p className="text-xs text-muted-foreground">Calculated</p>
              </div>
              <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
                <p className="text-sm font-medium">Tax Calc</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-medium">Review</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Preview Register
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button className="bg-success text-success-foreground ml-auto">
                Continue Processing
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payroll History Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Period</TabsTrigger>
            <TabsTrigger value="history">Payroll History</TabsTrigger>
            <TabsTrigger value="reports">Tax Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Employee Breakdown - Current Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <h4 className="font-semibold text-primary">Union Employees</h4>
                      <p className="text-2xl font-bold">156</p>
                      <p className="text-sm text-muted-foreground">Gross: $267,890</p>
                    </div>
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                      <h4 className="font-semibold text-accent">Non-Union</h4>
                      <p className="text-2xl font-bold">91</p>
                      <p className="text-sm text-muted-foreground">Gross: $144,860</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-semibold">Total Deductions</h4>
                      <p className="text-2xl font-bold">$114,327</p>
                      <p className="text-sm text-muted-foreground">CPP/EI/Tax/Union</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recent Payroll Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Pay Date</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPayrollRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.period}</TableCell>
                        <TableCell>{run.payDate}</TableCell>
                        <TableCell>{run.employees}</TableCell>
                        <TableCell className="font-mono">${run.grossPay.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">${run.netPay.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={run.status === 'Completed' ? 'default' : 'secondary'} 
                                 className={run.status === 'Completed' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}>
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Tax reports and compliance documents will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}