import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { LegacyEmployee, EmployeeAdditionalEarning } from '@/types/employee';

interface PayProfileTabProps {
  employee: LegacyEmployee;
  isEditing: boolean;
  editData: any;
  onFieldChange: (field: string, value: any) => void;
  additionalEarnings: EmployeeAdditionalEarning[];
  rates: any[];
}

export function PayProfileTab({ employee, isEditing, editData, onFieldChange, additionalEarnings, rates }: PayProfileTabProps) {
  const currentData = isEditing ? editData : employee;
  const [showBankingDetails, setShowBankingDetails] = useState(false);

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  };

  const maskBankAccount = (account: string) => {
    if (!account || account.length < 4) return 'XXXX';
    return `XXXX${account.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Regular Pay Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Regular Pay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pay Type</Label>
              {isEditing ? (
                <Select value={currentData.pay_type || 'salary'} onValueChange={(value) => onFieldChange('pay_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.pay_type || 'Salary'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Annual Salary</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={currentData.annual_salary || ''}
                  onChange={(e) => onFieldChange('annual_salary', parseFloat(e.target.value) || 0)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{formatCurrency(employee.annual_salary)}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={currentData.salary || ''}
                  onChange={(e) => onFieldChange('salary', parseFloat(e.target.value) || 0)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{formatCurrency(employee.salary)}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pay Frequency</Label>
              {isEditing ? (
                <Select value={currentData.pay_frequency || 'biweekly'} onValueChange={(value) => onFieldChange('pay_frequency', value)}>
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
                <div className="p-2 bg-muted rounded text-sm">{employee.pay_frequency || 'Biweekly'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Standard Hours</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.5"
                  value={currentData.standard_hours || 40}
                  onChange={(e) => onFieldChange('standard_hours', parseFloat(e.target.value) || 40)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.standard_hours || 40} hours/week</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pay Grade</Label>
              {isEditing ? (
                <Input
                  value={currentData.pay_grade || ''}
                  onChange={(e) => onFieldChange('pay_grade', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.pay_grade || 'Not specified'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overtime and Premium Pay Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overtime & Premium Pay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Overtime Eligible</Label>
              {isEditing ? (
                <Select value={currentData.overtime_eligible ? 'yes' : 'no'} onValueChange={(value) => onFieldChange('overtime_eligible', value === 'yes')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.overtime_eligible ? 'Yes' : 'No'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Overtime Multiplier</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.1"
                  value={currentData.ot_multiplier || 1.5}
                  onChange={(e) => onFieldChange('ot_multiplier', parseFloat(e.target.value) || 1.5)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.ot_multiplier || 1.5}x</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Premium Rate Factor</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.1"
                  value={currentData.premium_rate_factor || 1.5}
                  onChange={(e) => onFieldChange('premium_rate_factor', parseFloat(e.target.value) || 1.5)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.premium_rate_factor || 1.5}x</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Earnings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Additional Earnings
            {isEditing && (
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Earning
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {additionalEarnings.length > 0 ? (
              additionalEarnings.map((earning) => (
                <div key={earning.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <div className="font-medium">{earning.earning_type}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <div className="font-medium">{formatCurrency(earning.amount)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Frequency</Label>
                    <Badge variant="secondary">{earning.frequency}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant={earning.is_active ? "default" : "secondary"}>
                      {earning.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No additional earnings configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deductions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Deductions
            {isEditing && (
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Deduction
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CPP Exempt</Label>
              {isEditing ? (
                <Select value={currentData.cpp_exempt ? 'yes' : 'no'} onValueChange={(value) => onFieldChange('cpp_exempt', value === 'yes')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.cpp_exempt ? 'Yes' : 'No'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>EI Exempt</Label>
              {isEditing ? (
                <Select value={currentData.ei_exempt ? 'yes' : 'no'} onValueChange={(value) => onFieldChange('ei_exempt', value === 'yes')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{employee.ei_exempt ? 'Yes' : 'No'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct Deposit Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Direct Deposit Accounts
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBankingDetails(!showBankingDetails)}
              className="h-6 w-6 p-0"
            >
              {showBankingDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Institution</Label>
                <div className="font-medium">Primary Bank</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Transit</Label>
                <div className="font-mono">
                  {showBankingDetails ? '12345' : 'XXXXX'}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Account</Label>
                <div className="font-mono">
                  {showBankingDetails ? '1234567890' : maskBankAccount('1234567890')}
                </div>
              </div>
            </div>
            {isEditing && (
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Bank Account
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}