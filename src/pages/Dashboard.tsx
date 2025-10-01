import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Calendar, AlertTriangle, Clock, TrendingUp, FileText, UserCheck, Calculator, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CRARemittanceWidget } from "@/components/dashboard/CRARemittanceWidget";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, loading } = useDashboardStats();

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Not scheduled";
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (date: string | null) => {
    if (!date) return null;
    const days = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days remaining` : "Overdue";
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        description="Best Theratronics Inc. - OZC Operations"
        badge="BC Operations"
      />
      
      <div className="px-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatCard
                title="Active Employees"
                value={stats.activeEmployees.toString()}
                description="OZC - Kitsault"
                icon={<Users className="w-5 h-5 text-primary" />}
              />
              <StatCard
                title="Last Payroll"
                value={formatCurrency(stats.lastPayrollAmount)}
                description={stats.lastPayrollAmount ? "Gross pay" : "No payroll run yet"}
                icon={<DollarSign className="w-5 h-5 text-success" />}
              />
              <StatCard
                title="Next Pay Date"
                value={formatDate(stats.nextPayDate)}
                description={getDaysUntil(stats.nextPayDate) || "Not scheduled"}
                icon={<Calendar className="w-5 h-5 text-accent" />}
              />
              <StatCard
                title="CRA Remittance Due"
                value={formatDate(stats.craRemittanceDue)}
                description={getDaysUntil(stats.craRemittanceDue) || "No remittance due"}
                icon={<Receipt className="w-5 h-5 text-warning" />}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

          {/* CRA Remittances Widget */}
          <CRARemittanceWidget />

          {/* Recent Activity */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {activity.date}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent activity</p>
                  <p className="text-sm mt-2">Activity will appear here as you use the system</p>
                </div>
              )}
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
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : (
              <div className="space-y-3">
                {stats.pendingTimesheets > 0 && (
                  <div className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <div>
                        <p className="font-medium">Pending Timesheet Approvals</p>
                        <p className="text-sm text-muted-foreground">{stats.pendingTimesheets} timesheets require approval</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/timesheets")}>Review</Button>
                  </div>
                )}
                {stats.craRemittanceDue && getDaysUntil(stats.craRemittanceDue)?.includes('days') && (
                  <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <div>
                        <p className="font-medium">CRA Remittance Due</p>
                        <p className="text-sm text-muted-foreground">Remittance due {getDaysUntil(stats.craRemittanceDue)?.toLowerCase()}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/cra-remittances")}>View</Button>
                  </div>
                )}
                {stats.missingTD1Forms > 0 && (
                  <div className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-destructive rounded-full"></div>
                      <div>
                        <p className="font-medium">Missing TD1 Forms</p>
                        <p className="text-sm text-muted-foreground">{stats.missingTD1Forms} employees need to complete tax forms</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("/employees")}>Review</Button>
                  </div>
                )}
                {stats.pendingTimesheets === 0 && !stats.craRemittanceDue && stats.missingTD1Forms === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No alerts at this time</p>
                    <p className="text-sm mt-2">All systems operational</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}