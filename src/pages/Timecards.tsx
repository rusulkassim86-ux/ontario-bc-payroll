import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Calendar, Clock } from 'lucide-react';
import { ADPTimecardModule } from '@/components/timecards/ADPTimecardModule';
import { useEmployees } from '@/hooks/useEmployees';

export default function Timecards() {
  const { data: employees, isLoading } = useEmployees().useEmployeesList();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredEmployees = employees?.filter(employee => {
    const matchesSearch = employee.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_number?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedEmployeeId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Employee Timecard" />
          <Button 
            variant="outline" 
            onClick={() => setSelectedEmployeeId(null)}
          >
            ← Back to Employee List
          </Button>
        </div>
        <ADPTimecardModule employeeId={selectedEmployeeId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Timecards" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold">{filteredEmployees.filter(e => e.status === 'active').length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Pay Period</p>
                <p className="text-lg font-semibold">Week 1 of 2</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold text-orange-600">23</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours (Period)</p>
                <p className="text-2xl font-bold">1,247.5</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Employee for Timecard</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading employees...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No employees found matching your criteria</p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedEmployeeId(employee.id)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="font-semibold">
                        {employee.first_name} {employee.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {employee.employee_number} • {employee.job_title || 'No title'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Department</div>
                      <div className="font-medium">{employee.business_unit || 'Not assigned'}</div>
                    </div>
                    
                    <Badge className={getStatusColor(employee.status)}>
                      {employee.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}