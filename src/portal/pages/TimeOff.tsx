import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

export function TimeOff() {
  const [selectedType, setSelectedType] = useState('vacation');

  // Mock data
  const balances = {
    vacation: { accrued: 120, used: 80, available: 40 },
    sick: { accrued: 60, used: 16, available: 44 },
    personal: { accrued: 24, used: 8, available: 16 }
  };

  const requests = [
    {
      id: '1',
      type: 'vacation',
      startDate: '2024-12-20',
      endDate: '2024-12-24',
      days: 3,
      status: 'pending',
      submittedDate: '2024-11-15'
    },
    {
      id: '2',
      type: 'sick',
      startDate: '2024-11-28',
      endDate: '2024-11-28',
      days: 1,
      status: 'approved',
      submittedDate: '2024-11-28'
    },
    {
      id: '3',
      type: 'vacation',
      startDate: '2024-11-11',
      endDate: '2024-11-11',
      days: 1,
      status: 'approved',
      submittedDate: '2024-11-01'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Off</h1>
          <p className="text-muted-foreground">
            Manage your vacation, sick leave, and personal time
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Request Time Off
        </Button>
      </div>

      {/* Balances */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacation Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{balances.vacation.available}</div>
            <p className="text-xs text-muted-foreground">
              Available • {balances.vacation.used} used of {balances.vacation.accrued} accrued
            </p>
          </CardContent>
        </Card>

        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sick Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{balances.sick.available}</div>
            <p className="text-xs text-muted-foreground">
              Available • {balances.sick.used} used of {balances.sick.accrued} accrued
            </p>
          </CardContent>
        </Card>

        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{balances.personal.available}</div>
            <p className="text-xs text-muted-foreground">
              Available • {balances.personal.used} used of {balances.personal.accrued} accrued
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Off Requests */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle>Time Off Requests</CardTitle>
          <CardDescription>Your recent and upcoming time off requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getStatusIcon(request.status)}
                  </div>
                  <div>
                    <div className="font-medium capitalize">
                      {request.type} • {request.days} day{request.days > 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(request.startDate).toLocaleDateString('en-CA')}
                      {request.startDate !== request.endDate && 
                        ` - ${new Date(request.endDate).toLocaleDateString('en-CA')}`
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Submitted: {new Date(request.submittedDate).toLocaleDateString('en-CA')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(request.status) as any}>
                    {request.status}
                  </Badge>
                  {request.status === 'pending' && (
                    <Button size="sm" variant="outline">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Holidays */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle>Upcoming Holidays</CardTitle>
          <CardDescription>Statutory holidays for Ontario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Christmas Day</div>
                <div className="text-sm text-muted-foreground">December 25, 2024</div>
              </div>
              <Badge variant="outline">Statutory</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Boxing Day</div>
                <div className="text-sm text-muted-foreground">December 26, 2024</div>
              </div>
              <Badge variant="outline">Statutory</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">New Year's Day</div>
                <div className="text-sm text-muted-foreground">January 1, 2025</div>
              </div>
              <Badge variant="outline">Statutory</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}