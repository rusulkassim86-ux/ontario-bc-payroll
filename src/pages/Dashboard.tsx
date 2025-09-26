import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Calendar, AlertTriangle, Clock, TrendingUp, Building2, FileText, UserCheck, Calculator, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        description="Overview of your payroll operations"
        badge="Current Pay Period: Dec 16-29, 2024"
      />
      
      <div className="px-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Employees"
            value="247"
            description="Across ON & BC"
            icon={<Users className="w-5 h-5 text-primary" />}
            trend={{ value: "12", isPositive: true }}
          />
          <StatCard
            title="Last Payroll"
            value="$384,250"
            description="Bi-weekly gross"
            icon={<DollarSign className="w-5 h-5 text-success" />}
            trend={{ value: "2.3%", isPositive: true }}
          />
          <StatCard
            title="Next Pay Date"
            value="Jan 3"
            description="7 days remaining"
            icon={<Calendar className="w-5 h-5 text-accent" />}
          />
          <StatCard
            title="CRA Remittance Due"
            value="Jan 15"
            description="Next deadline"
            icon={<Receipt className="w-5 h-5 text-warning" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/payroll")}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Run Payroll
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/employees")}
              >
                <Users className="w-4 h-4 mr-2" />
                Add New Employee
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/timesheets")}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Approve Timesheets
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/reports")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Reports
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate("/cra-remittances")}
              >
                <Receipt className="w-4 h-4 mr-2" />
                CRA Remittances
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Payroll Run Completed</p>
                    <p className="text-sm text-muted-foreground">247 employees processed</p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Dec 20
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">New Employee Added</p>
                    <p className="text-sm text-muted-foreground">Sarah Chen - BC Worksite</p>
                  </div>
                  <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                    Dec 19
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Tax Tables Updated</p>
                    <p className="text-sm text-muted-foreground">2025 rates applied</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Dec 18
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Notifications */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <div>
                    <p className="font-medium">Pending Timesheet Approvals</p>
                    <p className="text-sm text-muted-foreground">12 timesheets require manager approval</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/timesheets")}>Review</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <div>
                    <p className="font-medium">CRA Remittance Due</p>
                    <p className="text-sm text-muted-foreground">January remittance due in 8 days</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/cra-remittances")}>View</Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                  <div>
                    <p className="font-medium">Missing TD1 Forms</p>
                    <p className="text-sm text-muted-foreground">3 employees need to complete tax forms</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/employees")}>Review</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}