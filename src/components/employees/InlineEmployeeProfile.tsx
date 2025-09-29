import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Edit, Save, Eye, EyeOff } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface InlineEmployeeProfileProps {
  employeeId: string;
  onClose: () => void;
}

export function InlineEmployeeProfile({ employeeId, onClose }: InlineEmployeeProfileProps) {
  const { employee, isLoading, updateEmployee } = useEmployeeProfile(employeeId);
  const [isEditing, setIsEditing] = useState(false);
  const [showFullSIN, setShowFullSIN] = useState(false);
  const [editData, setEditData] = useState<any>({});

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!employee) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Employee not found</h3>
            <p className="text-muted-foreground">The requested employee profile could not be found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleEdit = () => {
    setEditData({
      job_title: employee.job_title || '',
      business_unit: employee.business_unit || '',
      pay_frequency: employee.pay_frequency || 'biweekly',
      province_code: employee.province_code || '',
      status: employee.status || 'active',
      classification: employee.classification || '',
      phone: employee.phone || '',
      email: employee.email || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateEmployee(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      case 'leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const maskSIN = (sin: string) => {
    if (!sin || sin.length < 9) return 'XXX XXX XXX';
    return `XXX XX${sin.slice(-4)}`;
  };

  const displaySIN = showFullSIN ? employee.sin_encrypted : maskSIN(employee.sin_encrypted || '');

  return (
    <Card className="w-full border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback>
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{employee.first_name} {employee.last_name}</h2>
              <p className="text-sm text-muted-foreground font-normal">
                {isEditing ? (
                  <Input
                    value={editData.job_title}
                    onChange={(e) => setEditData({...editData, job_title: e.target.value})}
                    className="h-6 text-sm"
                    placeholder="Job Title"
                  />
                ) : (
                  employee.job_title || 'No title'
                )}
              </p>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} className="h-8">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleEdit} className="h-8">
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <div className="font-mono text-sm p-2 bg-muted rounded">
                  {employee.employee_number}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                {isEditing ? (
                  <Input
                    value={editData.email}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    type="email"
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {employee.email || 'Not provided'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                {isEditing ? (
                  <Input
                    value={editData.phone}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {employee.phone || 'Not provided'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Province</Label>
                {isEditing ? (
                  <Select value={editData.province_code} onValueChange={(value) => setEditData({...editData, province_code: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ON">Ontario</SelectItem>
                      <SelectItem value="BC">British Columbia</SelectItem>
                      <SelectItem value="AB">Alberta</SelectItem>
                      <SelectItem value="QC">Quebec</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {employee.province_code}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                {isEditing ? (
                  <Select value={editData.status} onValueChange={(value) => setEditData({...editData, status: value})}>
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
                <Label>Hire Date</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.hire_date ? format(new Date(employee.hire_date), 'MMM dd, yyyy') : 'Not set'}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                {isEditing ? (
                  <Input
                    value={editData.business_unit}
                    onChange={(e) => setEditData({...editData, business_unit: e.target.value})}
                    placeholder="Department"
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {employee.business_unit || 'Not assigned'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Classification</Label>
                {isEditing ? (
                  <Input
                    value={editData.classification}
                    onChange={(e) => setEditData({...editData, classification: e.target.value})}
                    placeholder="Classification"
                  />
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {employee.classification || 'Not set'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Company Code</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.company_code || 'Not set'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.location || 'Not set'}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pay Frequency</Label>
                {isEditing ? (
                  <Select value={editData.pay_frequency} onValueChange={(value) => setEditData({...editData, pay_frequency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-2 bg-muted rounded text-sm">
                    {employee.pay_frequency || 'Biweekly'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Annual Salary</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.annual_salary 
                    ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(employee.annual_salary)
                    : 'Not set'
                  }
                </div>
              </div>

              <div className="space-y-2">
                <Label>Standard Hours</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.standard_hours || 'Not set'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Overtime Eligible</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.overtime_eligible ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  SIN
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFullSIN(!showFullSIN)}
                    className="h-6 w-6 p-0"
                  >
                    {showFullSIN ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                </Label>
                <div className="font-mono text-sm p-2 bg-muted rounded">
                  {displaySIN}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Work Eligibility</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.work_eligibility || 'Not specified'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>TD1 Federal Status</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.td1_federal_status || 'Pending'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>TD1 Provincial Status</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.td1_provincial_status || 'Pending'}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}