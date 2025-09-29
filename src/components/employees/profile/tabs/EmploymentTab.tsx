import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LegacyEmployee } from '@/types/employee';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmploymentTabProps {
  employee: LegacyEmployee;
  isEditing: boolean;
  editData: any;
  onFieldChange: (field: string, value: any) => void;
}

export function EmploymentTab({ employee, isEditing, editData, onFieldChange }: EmploymentTabProps) {
  const currentData = isEditing ? editData : employee;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Job Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              {isEditing ? (
                <Input
                  value={currentData.job_title || ''}
                  onChange={(e) => onFieldChange('job_title', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.job_title || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              {isEditing ? (
                <Input
                  value={currentData.business_unit || ''}
                  onChange={(e) => onFieldChange('business_unit', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.business_unit || 'Not assigned'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Employment Status</Label>
              {isEditing ? (
                <Select value={currentData.status} onValueChange={(value) => onFieldChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={cn("text-xs", getStatusColor(employee.status))}>
                  {employee.status}
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label>Classification</Label>
              {isEditing ? (
                <Input
                  value={currentData.classification || ''}
                  onChange={(e) => onFieldChange('classification', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.classification || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Job Function</Label>
              {isEditing ? (
                <Input
                  value={currentData.job_function || ''}
                  onChange={(e) => onFieldChange('job_function', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.job_function || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Worker Category</Label>
              {isEditing ? (
                <Select value={currentData.worker_category || ''} onValueChange={(value) => onFieldChange('worker_category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.worker_category || 'Not specified'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Dates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employment Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Hire Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.hire_date || ''}
                  onChange={(e) => onFieldChange('hire_date', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.hire_date ? format(new Date(employee.hire_date), 'MMM dd, yyyy') : 'Not set'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Position Start Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.position_start_date || ''}
                  onChange={(e) => onFieldChange('position_start_date', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.position_start_date ? format(new Date(employee.position_start_date), 'MMM dd, yyyy') : 'Not set'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Seniority Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.seniority_date || ''}
                  onChange={(e) => onFieldChange('seniority_date', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.seniority_date ? format(new Date(employee.seniority_date), 'MMM dd, yyyy') : 'Not set'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Probation End Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.probation_end || ''}
                  onChange={(e) => onFieldChange('probation_end', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.probation_end ? format(new Date(employee.probation_end), 'MMM dd, yyyy') : 'Not set'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rehire Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.rehire_date || ''}
                  onChange={(e) => onFieldChange('rehire_date', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.rehire_date ? format(new Date(employee.rehire_date), 'MMM dd, yyyy') : 'Not applicable'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Termination Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.termination_date || ''}
                  onChange={(e) => onFieldChange('termination_date', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.termination_date ? format(new Date(employee.termination_date), 'MMM dd, yyyy') : 'Not applicable'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Structure Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organization Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Company Code</Label>
              <div className="p-2 bg-muted rounded text-sm">{employee.company_code || 'Not set'}</div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              {isEditing ? (
                <Input
                  value={currentData.location || ''}
                  onChange={(e) => onFieldChange('location', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.location || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Home Department</Label>
              {isEditing ? (
                <Input
                  value={currentData.home_department || ''}
                  onChange={(e) => onFieldChange('home_department', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.home_department || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cost Center</Label>
              {isEditing ? (
                <Input
                  value={currentData.home_cost_number || ''}
                  onChange={(e) => onFieldChange('home_cost_number', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.home_cost_number || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>GL Cost Center</Label>
              {isEditing ? (
                <Input
                  value={currentData.gl_cost_center || ''}
                  onChange={(e) => onFieldChange('gl_cost_center', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{(employee as any).gl_cost_center || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Management Position</Label>
              {isEditing ? (
                <Select value={currentData.management_position ? 'yes' : 'no'} onValueChange={(value) => onFieldChange('management_position', value === 'yes')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.management_position ? 'Yes' : 'No'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Union Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Union Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Union Code</Label>
              {isEditing ? (
                <Select value={currentData.union_code || ''} onValueChange={(value) => onFieldChange('union_code', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select union" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Non-union</SelectItem>
                    <SelectItem value="UNIFOR">UNIFOR</SelectItem>
                    <SelectItem value="PSAC">PSAC</SelectItem>
                    <SelectItem value="CUPE">CUPE</SelectItem>
                    <SelectItem value="UFCW">UFCW</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.union_code || 'Non-union'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Union Local</Label>
              {isEditing ? (
                <Input
                  value={currentData.union_local || ''}
                  onChange={(e) => onFieldChange('union_local', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.union_local || 'Not applicable'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Step</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={currentData.step || ''}
                  onChange={(e) => onFieldChange('step', parseInt(e.target.value) || null)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.step || 'Not applicable'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Assigned Shift</Label>
              {isEditing ? (
                <Select value={currentData.assigned_shift || 'Day Shift'} onValueChange={(value) => onFieldChange('assigned_shift', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day Shift">Day Shift</SelectItem>
                    <SelectItem value="Evening Shift">Evening Shift</SelectItem>
                    <SelectItem value="Night Shift">Night Shift</SelectItem>
                    <SelectItem value="Rotating">Rotating</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.assigned_shift || 'Day Shift'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Default Start Time</Label>
              {isEditing ? (
                <Input
                  type="time"
                  value={currentData.default_start_time || '09:00'}
                  onChange={(e) => onFieldChange('default_start_time', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.default_start_time || '09:00'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>FTE Hours Per Week</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.1"
                  value={currentData.fte_hours_per_week || 40}
                  onChange={(e) => onFieldChange('fte_hours_per_week', parseFloat(e.target.value) || 40)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.fte_hours_per_week || 40}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}