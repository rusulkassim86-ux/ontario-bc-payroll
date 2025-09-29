import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Edit, 
  Plus,
  Eye,
  DollarSign, 
  Building, 
  Users, 
  Clock,
  CalendarIcon,
  FileText 
} from 'lucide-react';
import { Employee } from '@/types/employee';
import { format } from 'date-fns';

interface EmploymentTabProps {
  employee: Employee;
}

export function EmploymentTab({ employee }: EmploymentTabProps) {
  if (!employee) return null;

  return (
    <div className="space-y-6">
      {/* Position Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Position
          </CardTitle>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job Title</label>
              <div className="text-sm">{employee.job_title || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reports To</label>
              <div className="text-sm">{employee.reports_to_id || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Position Start Date</label>
              <div className="text-sm">{employee.position_start_date ? format(new Date(employee.position_start_date), 'MMM dd, yyyy') : 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Management Position</label>
              <div className="text-sm">{employee.management_position ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job Function</label>
              <div className="text-sm">{employee.job_function || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Worker Category</label>
              <div className="text-sm">{employee.worker_category || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pay Grade</label>
              <div className="text-sm">{employee.pay_grade || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Status
          </CardTitle>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="text-sm">{employee.status}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Hire Date</label>
              <div className="text-sm">{employee.hire_date ? format(new Date(employee.hire_date), 'MMM dd, yyyy') : 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Leave Return Date</label>
              <div className="text-sm">{employee.leave_return_date ? format(new Date(employee.leave_return_date), 'MMM dd, yyyy') : 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Leave Return Reason</label>
              <div className="text-sm">{employee.leave_return_reason || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Rehire Date</label>
              <div className="text-sm">{employee.rehire_date ? format(new Date(employee.rehire_date), 'MMM dd, yyyy') : 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Rehire Reason</label>
              <div className="text-sm">{employee.rehire_reason || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regular Pay Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Regular Pay
          </CardTitle>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Salary</label>
              <div className="text-sm">${employee.salary?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Annual Salary</label>
              <div className="text-sm">${employee.annual_salary?.toLocaleString() || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Premium Rate Factors</label>
              <div className="text-sm">{employee.premium_rate_factor || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pay Frequency</label>
              <div className="text-sm">{employee.pay_frequency || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Standard Hours</label>
              <div className="text-sm">{employee.standard_hours || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Corporate Groups Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="w-5 h-5" />
            Corporate Groups
          </CardTitle>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Change Reason</label>
              <div className="text-sm">N/A</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Business Unit</label>
              <div className="text-sm">{employee.business_unit || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <div className="text-sm">{employee.location || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Benefits Eligibility Class</label>
              <div className="text-sm">{employee.benefits_eligibility_class || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Union Code</label>
              <div className="text-sm">{employee.union_code || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Union Local</label>
              <div className="text-sm">{employee.union_local || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Home Department</label>
              <div className="text-sm">{employee.home_department || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Home Cost Number</label>
              <div className="text-sm">{employee.home_cost_number || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Schedule Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Work Schedule
          </CardTitle>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">FTE</label>
              <div className="text-sm">{employee.fte || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Assigned Shift</label>
              <div className="text-sm">{employee.assigned_shift || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Scheduled Hours</label>
              <div className="text-sm">{employee.scheduled_hours || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Off Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Time Off
          </CardTitle>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Accrual Date</label>
              <div className="text-sm">{employee.accrual_date ? format(new Date(employee.accrual_date), 'MMM dd, yyyy') : 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Default Start Time</label>
              <div className="text-sm">{employee.default_start_time || 'N/A'}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Default Request Hours</label>
              <div className="text-sm">{employee.default_request_hours || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Custom Fields</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No custom fields added</p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Earnings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Additional Earnings</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Earning
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No additional earnings configured</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}