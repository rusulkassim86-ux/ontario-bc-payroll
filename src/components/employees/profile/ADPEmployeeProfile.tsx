import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Edit, Save } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { PersonalTab } from './tabs/PersonalTab';
import { EmploymentTab } from './tabs/EmploymentTab';
import { PayProfileTab } from './tabs/PayProfileTab';
import { BenefitsTab } from './tabs/BenefitsTab';
import { StatutoryComplianceTab } from './tabs/StatutoryComplianceTab';
import { AccumulatorsTab } from './tabs/AccumulatorsTab';
import { ADPTimecardModule } from '@/components/timecards/ADPTimecardModule';

interface ADPEmployeeProfileProps {
  employeeId: string;
  onClose: () => void;
}

export function ADPEmployeeProfile({ employeeId, onClose }: ADPEmployeeProfileProps) {
  const { employee, isLoading, updateEmployee, additionalEarnings, rates, payHistory, yearEndSummary } = useEmployeeProfile(employeeId);
  const [isEditing, setIsEditing] = useState(false);
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
    setEditData({ ...employee });
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

  const handleFieldChange = (field: string, value: any) => {
    setEditData({ ...editData, [field]: value });
  };

  // Determine union and employee group info
  const getEmployeeGroupInfo = () => {
    const companyCode = employee.company_code || '';
    let group = 'Unknown';
    let unionStatus = 'Non-union';
    
    if (companyCode.startsWith('72S')) {
      group = '72S - UNIFOR Union';
      unionStatus = 'UNIFOR';
    } else if (companyCode.startsWith('72R')) {
      group = '72R - Federal';
      unionStatus = employee.union_code === 'PSAC' ? 'PSAC Union' : 'Non-union';
    } else if (companyCode.startsWith('OZC')) {
      group = 'OZC - Kitsault Group (BC)';
      unionStatus = 'Non-union';
    }
    
    return { group, unionStatus };
  };

  const { group, unionStatus } = getEmployeeGroupInfo();

  return (
    <Card className="w-full border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="text-lg">
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{employee.first_name} {employee.last_name}</h2>
              <p className="text-sm text-muted-foreground">{employee.job_title || 'No title'}</p>
              <p className="text-xs text-muted-foreground">Employee ID: {employee.employee_number}</p>
              <p className="text-xs text-muted-foreground">{group} • {unionStatus}</p>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} className="h-8">
                  <Save className="w-4 h-4 mr-1" />
                  Save All Changes
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleEdit} className="h-8">
                <Edit className="w-4 h-4 mr-1" />
                Edit Profile
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-7 h-auto p-1">
            <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
            <TabsTrigger value="employment" className="text-xs">Employment</TabsTrigger>
            <TabsTrigger value="pay-profile" className="text-xs">Pay Profile</TabsTrigger>
            <TabsTrigger value="benefits" className="text-xs">Benefits</TabsTrigger>
            <TabsTrigger value="statutory" className="text-xs">Statutory Compliance</TabsTrigger>
            <TabsTrigger value="accumulators" className="text-xs">Accumulators</TabsTrigger>
            <TabsTrigger value="timecards" className="text-xs">Timecards</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <PersonalTab 
              employee={employee} 
              isEditing={isEditing} 
              editData={editData} 
              onFieldChange={handleFieldChange} 
            />
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <EmploymentTab 
              employee={employee} 
              isEditing={isEditing} 
              editData={editData} 
              onFieldChange={handleFieldChange} 
            />
          </TabsContent>

          <TabsContent value="pay-profile" className="space-y-4">
            <PayProfileTab 
              employee={employee} 
              isEditing={isEditing} 
              editData={editData} 
              onFieldChange={handleFieldChange}
              additionalEarnings={additionalEarnings}
              rates={rates}
            />
          </TabsContent>

          <TabsContent value="benefits" className="space-y-4">
            <BenefitsTab 
              employee={employee} 
              isEditing={isEditing} 
              editData={editData} 
              onFieldChange={handleFieldChange} 
            />
          </TabsContent>

          <TabsContent value="statutory" className="space-y-4">
            <StatutoryComplianceTab 
              employee={employee} 
              isEditing={isEditing} 
              editData={editData} 
              onFieldChange={handleFieldChange} 
            />
          </TabsContent>

          <TabsContent value="accumulators" className="space-y-4">
            <AccumulatorsTab 
              employee={employee} 
              payHistory={payHistory} 
              yearEndSummary={yearEndSummary} 
            />
          </TabsContent>

          <TabsContent value="timecards" className="space-y-4">
            <ADPTimecardModule employeeId={employee.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}