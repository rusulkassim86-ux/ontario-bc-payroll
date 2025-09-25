import { useState } from 'react';
import { usePortalAuth } from '../auth/PortalAuthProvider';
import { PortalAuthGuard } from '../auth/PortalAuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  Download, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export function Team() {
  const { isManager } = usePortalAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock team data
  const teamMembers = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@besttheratronics.ca',
      phone: '(416) 555-0101',
      position: 'Senior Technician',
      department: 'Manufacturing',
      status: 'active',
      currentHours: 82.5,
      targetHours: 80,
      lastTimesheet: '2024-12-02',
      timesheetStatus: 'submitted'
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike.chen@besttheratronics.ca',
      phone: '(416) 555-0102',
      position: 'Quality Analyst',
      department: 'Quality Assurance',
      status: 'active',
      currentHours: 78,
      targetHours: 80,
      lastTimesheet: '2024-12-02',
      timesheetStatus: 'approved'
    },
    {
      id: '3',
      name: 'Jennifer Davis',
      email: 'jennifer.davis@besttheratronics.ca',
      phone: '(416) 555-0103',
      position: 'Lab Technician',
      department: 'Research & Development',
      status: 'active',
      currentHours: 70,
      targetHours: 70,
      lastTimesheet: '2024-12-01',
      timesheetStatus: 'pending'
    },
    {
      id: '4',
      name: 'David Wilson',
      email: 'david.wilson@besttheratronics.ca',
      phone: '(416) 555-0104',
      position: 'Maintenance Tech',
      department: 'Facilities',
      status: 'vacation',
      currentHours: 65,
      targetHours: 80,
      lastTimesheet: '2024-11-28',
      timesheetStatus: 'approved'
    }
  ];

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'vacation': return 'secondary';
      case 'sick': return 'destructive';
      default: return 'outline';
    }
  };

  const getTimesheetStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'submitted': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'outline';
    }
  };

  const teamStats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.status === 'active').length,
    pendingTimesheets: teamMembers.filter(m => m.timesheetStatus === 'pending').length,
    avgHours: teamMembers.reduce((sum, m) => sum + m.currentHours, 0) / teamMembers.length
  };

  return (
    <PortalAuthGuard managerOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
            <p className="text-muted-foreground">
              Manage and view your direct reports
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Team Data
          </Button>
        </div>

        {/* Team Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="portal-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                {teamStats.activeMembers} active
              </p>
            </CardContent>
          </Card>

          <Card className="portal-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{teamStats.pendingTimesheets}</div>
              <p className="text-xs text-muted-foreground">
                Timesheets to review
              </p>
            </CardContent>
          </Card>

          <Card className="portal-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.avgHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                This pay period
              </p>
            </CardContent>
          </Card>

          <Card className="portal-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">98%</div>
              <p className="text-xs text-muted-foreground">
                On-time submissions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="portal-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search team members..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="portal-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-lg">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.position}</div>
                          <div className="text-sm text-muted-foreground">{member.department}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusColor(member.status) as any} className="mb-2">
                          {member.status}
                        </Badge>
                        <div className="text-sm">
                          <span className="font-medium">{member.currentHours}h</span>
                          <span className="text-muted-foreground"> / {member.targetHours}h</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last: {new Date(member.lastTimesheet).toLocaleDateString('en-CA')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timesheets" className="space-y-4">
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="portal-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Current Period: {member.currentHours}h
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm">
                            Last Submitted: {new Date(member.lastTimesheet).toLocaleDateString('en-CA')}
                          </div>
                          <Badge variant={getTimesheetStatusColor(member.timesheetStatus) as any}>
                            {member.timesheetStatus}
                          </Badge>
                        </div>
                        {member.timesheetStatus === 'pending' && (
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMembers.map((member) => (
                <Card key={member.id} className="portal-card">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground mb-2">{member.position}</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${member.email}`} className="text-primary hover:underline">
                              {member.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${member.phone}`} className="text-primary hover:underline">
                              {member.phone}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PortalAuthGuard>
  );
}