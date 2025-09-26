import { usePortalAuth } from '../auth/PortalAuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { user, profile, isManager } = usePortalAuth();

  // Mock data - replace with actual API calls
  const nextPayDate = "December 15, 2024";
  const lastPayAmount = 3247.82;
  const pendingApprovals = 5;
  const teamMembers = 12;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-CA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user?.role === 'manager' ? 'Manager' : 'Employee'} Portal
        </Badge>
      </div>

      {/* Important Alerts */}
      <div className="space-y-3">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Holiday Schedule:</strong> The office will be closed December 25-26 and January 1st. 
            Pay dates remain unchanged.
          </AlertDescription>
        </Alert>
        
        {user?.role === 'employee' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Action Required:</strong> Please update your banking information by December 10th to avoid pay delays.
              <Button variant="link" className="p-0 ml-2 h-auto" asChild>
                <Link to="/profile">Update Now</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Pay Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{nextPayDate}</div>
            <p className="text-xs text-muted-foreground">
              Bi-weekly pay period
            </p>
          </CardContent>
        </Card>

        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Pay Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${lastPayAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Net pay • Dec 1, 2024
            </p>
          </CardContent>
        </Card>

        {isManager && (
          <>
            <Card className="portal-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingApprovals}</div>
                <p className="text-xs text-muted-foreground">
                  Timesheets + time off
                </p>
              </CardContent>
            </Card>

            <Card className="portal-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamMembers}</div>
                <p className="text-xs text-muted-foreground">
                  Direct reports
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/time">
                <Clock className="mr-2 h-4 w-4" />
                View My Timesheet
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/pay">
                <DollarSign className="mr-2 h-4 w-4" />
                Download Pay Stub
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/timeoff">
                <Calendar className="mr-2 h-4 w-4" />
                Request Time Off
              </Link>
            </Button>
            {isManager && (
              <Button asChild className="w-full justify-start" variant="outline">
                <Link to="/approvals">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Review Approvals
                  {pendingApprovals > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {pendingApprovals}
                    </Badge>
                  )}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest payroll activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Pay stub available</p>
                <p className="text-xs text-muted-foreground">December 1, 2024</p>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/pay">View</Link>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Timesheet submitted</p>
                <p className="text-xs text-muted-foreground">November 30, 2024</p>
              </div>
              <Badge variant="outline" className="text-xs">Approved</Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Vacation request</p>
                <p className="text-xs text-muted-foreground">December 20-24, 2024</p>
              </div>
              <Badge variant="outline" className="text-xs">Pending</Badge>
            </div>

            {isManager && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Timesheet requires attention</p>
                  <p className="text-xs text-muted-foreground">John Smith - Nov 29</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/approvals">Review</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle>Company Announcements</CardTitle>
          <CardDescription>Latest updates from Best Theratronics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-primary pl-4">
            <h4 className="font-medium">Year-End Benefits Enrollment</h4>
            <p className="text-sm text-muted-foreground">
              Benefits enrollment for 2025 is now open. Review and update your selections by December 15th.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Posted December 1, 2024</p>
          </div>

          <div className="border-l-4 border-secondary pl-4">
            <h4 className="font-medium">New Parking Procedures</h4>
            <p className="text-sm text-muted-foreground">
              Starting January 2025, all employees will need to register their vehicles for parking access.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Posted November 28, 2024</p>
          </div>

          <div className="border-l-4 border-muted-foreground pl-4">
            <h4 className="font-medium">Portal Maintenance</h4>
            <p className="text-sm text-muted-foreground">
              The employee portal will be offline for maintenance on December 8th from 2:00-4:00 AM EST.
            </p>
            <p className="text-xs text-muted-foreground mt-1">Posted November 25, 2024</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}