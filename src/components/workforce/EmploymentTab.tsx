import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Edit, 
  CalendarIcon, 
  Clock, 
  DollarSign, 
  Building, 
  Users, 
  Plus,
  MoreHorizontal 
} from 'lucide-react';
import { Employee, UserRole, AdditionalEarning } from '@/types/employee';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmploymentTabProps {
  employee: Employee;
  userRole: UserRole;
  onEditPosition: () => void;
  onEditStatus: () => void;
  onEditPay: () => void;
  onEditCorporateGroups: () => void;
  onEditWorkSchedule: () => void;
  onEditTimeOff: () => void;
  onEditCustomField: (field: string) => void;
  onAddCustomField: () => void;
  onViewEarning: (earning: AdditionalEarning) => void;
  onAddEarning: () => void;
}

export function EmploymentTab({
  employee,
  userRole,
  onEditPosition,
  onEditStatus,
  onEditPay,
  onEditCorporateGroups,
  onEditWorkSchedule,
  onEditTimeOff,
  onEditCustomField,
  onAddCustomField,
  onViewEarning,
  onAddEarning
}: EmploymentTabProps) {
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  const FieldCard = ({ 
    title, 
    icon: Icon, 
    onEdit, 
    children, 
    editable = true 
  }: { 
    title: string; 
    icon: any; 
    onEdit?: () => void; 
    children: React.ReactNode;
    editable?: boolean;
  }) => (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm font-semibold text-gray-900">
            <Icon className="mr-2 h-4 w-4 text-blue-600" />
            {title}
          </CardTitle>
          {editable && onEdit && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onEdit}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );

  const FieldRow = ({ label, value, sensitive = false }: { 
    label: string; 
    value: any; 
    sensitive?: boolean;
  }) => {
    const displayValue = value != null ? String(value) : 'Not specified';
    const shouldHide = sensitive && !userRole.permissions.canEditPay;
    
    return (
      <div className="flex justify-between py-1">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="text-sm text-gray-900 font-medium">
          {shouldHide ? '••••••' : displayValue}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* As Of Date Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700">Show as of</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-40 justify-start text-left font-normal",
                !asOfDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {asOfDate ? format(asOfDate, "MMM d, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={asOfDate}
              onSelect={(date) => date && setAsOfDate(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Employment Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Card */}
        <FieldCard title="Position" icon={Users} onEdit={onEditPosition}>
          <div className="space-y-2">
            <FieldRow label="Job Title" value={employee.jobTitle} />
            <FieldRow label="Reports To" value={employee.reportsTo} />
            <FieldRow label="Position Start Date" value={employee.positionStartDate ? format(new Date(employee.positionStartDate), 'MMM d, yyyy') : null} />
            <FieldRow label="Management Position" value={employee.managementPosition ? 'Yes' : 'No'} />
            <FieldRow label="Job Function" value={employee.jobFunction} />
            <FieldRow label="Worker Category" value={employee.workerCategory} />
            <FieldRow label="Pay Grade" value={employee.payGrade} />
          </div>
        </FieldCard>

        {/* Status Card */}
        <FieldCard title="Status" icon={Users} onEdit={onEditStatus}>
          <div className="space-y-2">
            <div className="flex justify-between py-1">
              <span className="text-xs text-gray-500 font-medium">Status</span>
              <Badge className={cn(
                "text-xs",
                employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              )}>
                {employee.status}
              </Badge>
            </div>
            <FieldRow label="Hire Date" value={format(new Date(employee.hireDate), 'MMM d, yyyy')} />
            <FieldRow label="Leave Return Date" value={employee.leaveReturnDate ? format(new Date(employee.leaveReturnDate), 'MMM d, yyyy') : null} />
            <FieldRow label="Leave Return Reason" value={employee.leaveReturnReason} />
            <FieldRow label="Rehire Date" value={employee.rehireDate ? format(new Date(employee.rehireDate), 'MMM d, yyyy') : null} />
            <FieldRow label="Rehire Reason" value={employee.rehireReason} />
          </div>
        </FieldCard>

        {/* Regular Pay Card */}
        <FieldCard title="Regular Pay" icon={DollarSign} onEdit={userRole.permissions.canEditPay ? onEditPay : undefined} editable={userRole.permissions.canEditPay}>
          <div className="space-y-2">
            <FieldRow label="Salary" value={employee.salary ? `$${employee.salary.toLocaleString()}` : null} sensitive />
            <FieldRow label="Annual Salary" value={employee.annualSalary ? `$${employee.annualSalary.toLocaleString()}` : null} sensitive />
            <FieldRow label="Premium Rate Factor" value={`${employee.premiumRateFactor} × 1.0`} sensitive />
            <FieldRow label="Pay Frequency" value={employee.payFrequency} />
            <FieldRow label="Rate 2" value={employee.rate2 ? `$${employee.rate2}` : null} sensitive />
            <FieldRow label="Standard Hours" value={employee.standardHours} />
            <div className="pt-2">
              <Button variant="outline" size="sm" className="text-xs">
                More Rates
              </Button>
            </div>
          </div>
        </FieldCard>

        {/* Corporate Groups Card */}
        <FieldCard title="Corporate Groups" icon={Building} onEdit={onEditCorporateGroups}>
          <div className="space-y-2">
            <FieldRow label="Business Unit" value={employee.businessUnit} />
            <FieldRow label="Location" value={employee.location} />
            <FieldRow label="Benefits Eligibility Class" value={employee.benefitsEligibilityClass} />
            <FieldRow label="Union Code" value={employee.unionCode} />
            <FieldRow label="Union Local" value={employee.unionLocal} />
            <FieldRow label="Home Department" value={employee.homeDepartment} />
            <FieldRow label="Home Cost Number" value={employee.homeCostNumber} />
          </div>
        </FieldCard>

        {/* Work Schedule Card */}
        <FieldCard title="Work Schedule" icon={Clock} onEdit={onEditWorkSchedule}>
          <div className="space-y-2">
            <FieldRow label="FTE" value={employee.fte} />
            <FieldRow label="Assigned Shift" value={employee.assignedShift} />
            <FieldRow label="Scheduled Hours" value={employee.scheduledHours} />
          </div>
        </FieldCard>

        {/* Time Off Card */}
        <FieldCard title="Time Off" icon={CalendarIcon} onEdit={onEditTimeOff}>
          <div className="space-y-2">
            <FieldRow label="Accrual Date" value={employee.accrualDate ? format(new Date(employee.accrualDate), 'MMM d, yyyy') : null} />
            <FieldRow label="Default Start Time" value={employee.defaultStartTime} />
            <FieldRow label="Default Request Hours" value={employee.defaultRequestHours} />
          </div>
        </FieldCard>
      </div>

      {/* Custom Fields Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">Custom Fields</CardTitle>
            <Button variant="outline" size="sm" onClick={onAddCustomField}>
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {Object.keys(employee.customFields).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(employee.customFields).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-1">
                  <span className="text-xs text-gray-500 font-medium">{key}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900 font-medium">{value}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEditCustomField(key)}
                      className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No custom fields defined</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Earnings Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900">Additional Earnings</CardTitle>
            {userRole.permissions.canEditPay && (
              <Button variant="outline" size="sm" onClick={onAddEarning}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {employee.additionalEarnings.length > 0 ? (
            <div className="space-y-3">
              {employee.additionalEarnings.map((earning) => (
                <div key={earning.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900">{earning.type}</p>
                    <p className="text-xs text-gray-500">
                      ${earning.amount.toLocaleString()} • {earning.frequency}
                      {earning.startDate && ` • Starts ${format(new Date(earning.startDate), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onViewEarning(earning)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No additional earnings defined</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}