import { useState } from 'react';
import { usePortalAuth } from '../auth/PortalAuthProvider';
import { PortalAuthGuard } from '../auth/PortalAuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, Calendar, MessageSquare } from 'lucide-react';

export function Approvals() {
  const { isManager } = usePortalAuth();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Mock pending approvals data
  const timesheetApprovals = [
    {
      id: '1',
      employee: 'Sarah Johnson',
      period: 'Nov 25 - Dec 1, 2024',
      totalHours: 42.5,
      overtimeHours: 2.5,
      submittedDate: '2024-12-02',
      notes: 'Working on urgent project delivery'
    },
    {
      id: '2',
      employee: 'Mike Chen',
      period: 'Nov 25 - Dec 1, 2024',
      totalHours: 40,
      overtimeHours: 0,
      submittedDate: '2024-12-02',
      notes: ''
    },
    {
      id: '3',
      employee: 'Jennifer Davis',
      period: 'Nov 25 - Dec 1, 2024',
      totalHours: 35,
      overtimeHours: 0,
      submittedDate: '2024-12-01',
      notes: 'Part-time schedule'
    }
  ];

  const timeOffApprovals = [
    {
      id: '4',
      employee: 'David Wilson',
      type: 'vacation',
      startDate: '2024-12-23',
      endDate: '2024-12-27',
      days: 5,
      reason: 'Family vacation during holidays',
      submittedDate: '2024-11-20'
    },
    {
      id: '5',
      employee: 'Lisa Thompson',
      type: 'sick',
      startDate: '2024-12-05',
      endDate: '2024-12-05',
      days: 1,
      reason: 'Medical appointment',
      submittedDate: '2024-12-04'
    }
  ];

  const handleApproval = (id: string, action: 'approve' | 'reject') => {
    console.log(`${action} item ${id}`);
    // Handle approval/rejection logic
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    console.log(`${action} items:`, selectedItems);
    // Handle bulk approval/rejection logic
  };

  return (
    <PortalAuthGuard managerOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
            <p className="text-muted-foreground">
              Review and approve timesheet and time-off requests from your team
            </p>
          </div>
          {selectedItems.length > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleBulkAction('approve')}
                className="text-green-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Selected ({selectedItems.length})
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleBulkAction('reject')}
                className="text-red-600"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Selected ({selectedItems.length})
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="timesheets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timesheets" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timesheets
              <Badge variant="destructive" className="ml-1">
                {timesheetApprovals.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="timeoff" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Time Off
              <Badge variant="destructive" className="ml-1">
                {timeOffApprovals.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timesheets" className="space-y-4">
            <Card className="portal-card">
              <CardHeader>
                <CardTitle>Pending Timesheet Approvals</CardTitle>
                <CardDescription>
                  Review timesheet submissions from your team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timesheetApprovals.map((approval) => (
                    <div key={approval.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(approval.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, approval.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== approval.id));
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {approval.employee.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{approval.employee}</div>
                            <div className="text-sm text-muted-foreground">
                              Period: {approval.period}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Total: {approval.totalHours}h</span>
                              {approval.overtimeHours > 0 && (
                                <span className="text-orange-600 ml-2">
                                  Overtime: {approval.overtimeHours}h
                                </span>
                              )}
                            </div>
                            {approval.notes && (
                              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {approval.notes}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              Submitted: {new Date(approval.submittedDate).toLocaleDateString('en-CA')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleApproval(approval.id, 'reject')}
                            className="text-red-600"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleApproval(approval.id, 'approve')}
                            className="text-green-600"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeoff" className="space-y-4">
            <Card className="portal-card">
              <CardHeader>
                <CardTitle>Pending Time Off Requests</CardTitle>
                <CardDescription>
                  Review time off requests from your team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeOffApprovals.map((approval) => (
                    <div key={approval.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(approval.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, approval.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== approval.id));
                              }
                            }}
                            className="mt-1"
                          />
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {approval.employee.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{approval.employee}</div>
                            <div className="text-sm text-muted-foreground">
                              <Badge variant="outline" className="mr-2 capitalize">
                                {approval.type}
                              </Badge>
                              {approval.days} day{approval.days > 1 ? 's' : ''}
                            </div>
                            <div className="text-sm">
                              {new Date(approval.startDate).toLocaleDateString('en-CA')}
                              {approval.startDate !== approval.endDate && 
                                ` - ${new Date(approval.endDate).toLocaleDateString('en-CA')}`
                              }
                            </div>
                            {approval.reason && (
                              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {approval.reason}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              Submitted: {new Date(approval.submittedDate).toLocaleDateString('en-CA')}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleApproval(approval.id, 'reject')}
                            className="text-red-600"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleApproval(approval.id, 'approve')}
                            className="text-green-600"
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common approval management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Export Approvals</div>
                  <div className="text-sm text-muted-foreground">Download approval history</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Team Overview</div>
                  <div className="text-sm text-muted-foreground">View team status</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Approval Settings</div>
                  <div className="text-sm text-muted-foreground">Configure notifications</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalAuthGuard>
  );
}