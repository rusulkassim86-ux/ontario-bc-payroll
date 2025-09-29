import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LegacyEmployee } from '@/types/employee';

interface BenefitsTabProps {
  employee: LegacyEmployee;
  isEditing: boolean;
  editData: any;
  onFieldChange: (field: string, value: any) => void;
}

export function BenefitsTab({ employee, isEditing, editData, onFieldChange }: BenefitsTabProps) {
  const currentData = isEditing ? editData : employee;

  return (
    <div className="space-y-6">
      {/* Benefits Eligibility Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Benefits Eligibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Eligibility Class</Label>
              {isEditing ? (
                <Select value={currentData.benefits_eligibility_class || ''} onValueChange={(value) => onFieldChange('benefits_eligibility_class', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select eligibility class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time Employee</SelectItem>
                    <SelectItem value="part-time">Part-time Employee</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="contract">Contract Worker</SelectItem>
                    <SelectItem value="not-eligible">Not Eligible</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.benefits_eligibility_class || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Benefits Start Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={currentData.benefits_start_date || ''}
                  onChange={(e) => onFieldChange('benefits_start_date', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.benefits_start_date || 'Not set'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Benefits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Health Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <div className="font-medium">Extended Health Care</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <Badge variant="default">Employee + Family</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <div className="font-medium">Prescription Drug</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <Badge variant="default">Employee + Family</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dental Benefits Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dental Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <div className="font-medium">Basic Dental</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <Badge variant="default">Employee + Family</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <div className="font-medium">Orthodontic</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <Badge variant="default">Employee + Family</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pension & Retirement Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pension & Retirement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <div className="font-medium">Public Service Pension Plan</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Employee Rate</Label>
                <div className="font-medium">9.5%</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Employer Rate</Label>
                <div className="font-medium">9.5%</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <div className="font-medium">Group RRSP</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Employee Rate</Label>
                <div className="font-medium">5.0%</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Employer Match</Label>
                <div className="font-medium">3.0%</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="secondary">Eligible</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insurance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div className="font-medium">Life Insurance</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <div className="font-medium">2x Annual Salary</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Premium</Label>
                <div className="font-medium">Employer Paid</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div className="font-medium">Accidental Death & Dismemberment</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <div className="font-medium">$100,000</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Premium</Label>
                <div className="font-medium">Employer Paid</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div className="font-medium">Long Term Disability</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <div className="font-medium">70% of Salary</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Premium</Label>
                <div className="font-medium">Employee Paid</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vacation Policy Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vacation Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Annual Entitlement</Label>
              <div className="p-2 bg-muted rounded text-sm">20 days</div>
            </div>
            <div className="space-y-2">
              <Label>Accrual Rate</Label>
              <div className="p-2 bg-muted rounded text-sm">1.67 days/month</div>
            </div>
            <div className="space-y-2">
              <Label>Accrual Start Date</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {employee.accrual_date || 'On hire date'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Carry Over Limit</Label>
              <div className="p-2 bg-muted rounded text-sm">5 days</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}