import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { LegacyEmployee } from '@/types/employee';
import { format } from 'date-fns';

interface StatutoryComplianceTabProps {
  employee: LegacyEmployee;
  isEditing: boolean;
  editData: any;
  onFieldChange: (field: string, value: any) => void;
}

export function StatutoryComplianceTab({ employee, isEditing, editData, onFieldChange }: StatutoryComplianceTabProps) {
  const [showFullSIN, setShowFullSIN] = useState(false);
  const currentData = isEditing ? editData : employee;

  const maskSIN = (sin: string) => {
    if (!sin || sin.length < 9) return 'XXX XXX XXX';
    return `XXX XX${sin.slice(-4)}`;
  };

  const displaySIN = showFullSIN ? employee.sin_encrypted : maskSIN(employee.sin_encrypted || '');

  const handleTD1Change = (type: 'federal' | 'provincial', field: string, value: any) => {
    const currentTD1 = currentData[`td1_${type}`] || {};
    onFieldChange(`td1_${type}`, { ...currentTD1, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Tax Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Federal TD1 */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                Federal TD1 
                <Badge variant={employee.td1_federal_status === 'completed' ? 'default' : 'secondary'}>
                  {employee.td1_federal_status || 'Pending'}
                </Badge>
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Basic Personal Amount</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentData.td1_federal?.basic_personal_amount || 15705}
                      onChange={(e) => handleTD1Change('federal', 'basic_personal_amount', parseFloat(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">
                      ${(currentData.td1_federal?.basic_personal_amount || 15705).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Additional Tax Credits</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentData.td1_federal?.additional_credits || 0}
                      onChange={(e) => handleTD1Change('federal', 'additional_credits', parseFloat(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">
                      ${(currentData.td1_federal?.additional_credits || 0).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Additional Tax to Deduct</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentData.td1_federal?.additional_tax || 0}
                      onChange={(e) => handleTD1Change('federal', 'additional_tax', parseFloat(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">
                      ${(currentData.td1_federal?.additional_tax || 0).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Provincial TD1 */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                Provincial TD1 ({employee.province_code})
                <Badge variant={employee.td1_provincial_status === 'completed' ? 'default' : 'secondary'}>
                  {employee.td1_provincial_status || 'Pending'}
                </Badge>
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Basic Personal Amount</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentData.td1_provincial?.basic_personal_amount || 12298}
                      onChange={(e) => handleTD1Change('provincial', 'basic_personal_amount', parseFloat(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">
                      ${(currentData.td1_provincial?.basic_personal_amount || 12298).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Additional Tax Credits</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentData.td1_provincial?.additional_credits || 0}
                      onChange={(e) => handleTD1Change('provincial', 'additional_credits', parseFloat(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">
                      ${(currentData.td1_provincial?.additional_credits || 0).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Additional Tax to Deduct</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={currentData.td1_provincial?.additional_tax || 0}
                      onChange={(e) => handleTD1Change('provincial', 'additional_tax', parseFloat(e.target.value))}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">
                      ${(currentData.td1_provincial?.additional_tax || 0).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Standards Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employment Standards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Social Insurance Number
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
              {isEditing ? (
                <Select value={currentData.work_eligibility || ''} onValueChange={(value) => onFieldChange('work_eligibility', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select eligibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Citizen">Canadian Citizen</SelectItem>
                    <SelectItem value="PermanentResident">Permanent Resident</SelectItem>
                    <SelectItem value="WorkPermit">Work Permit</SelectItem>
                    <SelectItem value="StudentVisa">Student Visa</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.work_eligibility || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Work Permit Expiry</Label>
              {currentData.work_eligibility === 'WorkPermit' && (
                <>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={currentData.permit_expiry || ''}
                      onChange={(e) => onFieldChange('permit_expiry', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm flex items-center gap-2">
                      {employee.permit_expiry ? (
                        <>
                          {format(new Date(employee.permit_expiry), 'MMM dd, yyyy')}
                          {new Date(employee.permit_expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </>
                      ) : (
                        'Not set'
                      )}
                    </div>
                  )}
                </>
              )}
              {currentData.work_eligibility !== 'WorkPermit' && (
                <div className="p-2 bg-muted rounded text-sm">Not applicable</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers' Compensation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workers' Compensation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>WCB Classification</Label>
              {isEditing ? (
                <Input
                  value={currentData.wcb_classification || ''}
                  onChange={(e) => onFieldChange('wcb_classification', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.wcb_classification || 'Not specified'}</div>
              )}
            </div>
            <div className="space-y-2">
              <Label>WCB Rate</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={currentData.wcb_rate || ''}
                  onChange={(e) => onFieldChange('wcb_rate', parseFloat(e.target.value))}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {currentData.wcb_rate ? `${currentData.wcb_rate}%` : 'Not specified'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>WCB Account</Label>
              {isEditing ? (
                <Input
                  value={currentData.wcb_account || ''}
                  onChange={(e) => onFieldChange('wcb_account', e.target.value)}
                />
              ) : (
                <div className="p-2 bg-muted rounded text-sm">{currentData.wcb_account || 'Not specified'}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Insurance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employment Insurance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>EI Exempt</Label>
              {isEditing ? (
                <Select value={currentData.ei_exempt ? 'yes' : 'no'} onValueChange={(value) => onFieldChange('ei_exempt', value === 'yes')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No - Subject to EI</SelectItem>
                    <SelectItem value="yes">Yes - EI Exempt</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.ei_exempt ? 'Yes - EI Exempt' : 'No - Subject to EI'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>EI Exemption Reason</Label>
              {currentData.ei_exempt && (
                <>
                  {isEditing ? (
                    <Select value={currentData.ei_exemption_reason || ''} onValueChange={(value) => onFieldChange('ei_exemption_reason', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self-employed">Self-employed</SelectItem>
                        <SelectItem value="non-resident">Non-resident</SelectItem>
                        <SelectItem value="under-18">Under 18 hours/week</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">{currentData.ei_exemption_reason || 'Not specified'}</div>
                  )}
                </>
              )}
              {!currentData.ei_exempt && (
                <div className="p-2 bg-muted rounded text-sm">Not applicable</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canada Pension Plan Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Canada Pension Plan</CardTitle>
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
                    <SelectItem value="no">No - Subject to CPP</SelectItem>
                    <SelectItem value="yes">Yes - CPP Exempt</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded text-sm">
                  {employee.cpp_exempt ? 'Yes - CPP Exempt' : 'No - Subject to CPP'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>CPP Exemption Reason</Label>
              {currentData.cpp_exempt && (
                <>
                  {isEditing ? (
                    <Select value={currentData.cpp_exemption_reason || ''} onValueChange={(value) => onFieldChange('cpp_exemption_reason', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-18">Under 18 years old</SelectItem>
                        <SelectItem value="over-70">Over 70 years old</SelectItem>
                        <SelectItem value="disability-pension">Receiving CPP disability pension</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-muted rounded text-sm">{currentData.cpp_exemption_reason || 'Not specified'}</div>
                  )}
                </>
              )}
              {!currentData.cpp_exempt && (
                <div className="p-2 bg-muted rounded text-sm">Not applicable</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}