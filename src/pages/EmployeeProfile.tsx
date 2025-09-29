import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmployeeProfileHeader } from '@/components/workforce/EmployeeProfileHeader';
import { EmploymentTab } from '@/components/workforce/EmploymentTab';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { Employee, LegacyEmployee, UserRole, AdditionalEarning } from '@/types/employee';
import { validateEmployee } from '@/utils/employeeMapper';

// Mock user role - in real app this would come from auth context
const mockUserRole: UserRole = {
  role: 'HR_Admin',
  permissions: {
    canEditPay: true,
    canRevealSIN: true,
    canEditStatus: true,
    canViewAll: true,
  }
};

// Mock current employee index for navigation
const mockCurrentIndex = 1;
const mockTotalEmployees = 125;

export function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const { employee, isLoading } = useEmployeeProfile(id || '');
  const [activeTab, setActiveTab] = useState('employment');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Employee not found</h2>
          <p className="mt-2 text-gray-600">The requested employee profile could not be found.</p>
        </div>
      </div>
    );
  }

  // Convert legacy employee to new format
  const workforceEmployee: Employee = legacyToWorkforceEmployee(employee);

  const handleEditPosition = () => console.log('Edit position');
  const handleEditStatus = () => console.log('Edit status');
  const handleEditPay = () => console.log('Edit pay');
  const handleEditCorporateGroups = () => console.log('Edit corporate groups');
  const handleEditWorkSchedule = () => console.log('Edit work schedule');
  const handleEditTimeOff = () => console.log('Edit time off');
  const handleEditCustomField = (field: string) => console.log('Edit custom field:', field);
  const handleAddCustomField = () => console.log('Add custom field');
  const handleViewEarning = (earning: AdditionalEarning) => console.log('View earning:', earning);
  const handleAddEarning = () => console.log('Add earning');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo and Global Search */}
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">WP</span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                  />
                </div>
              </div>
            </div>

            {/* Right - User Menu */}
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-8">
          {/* Left Sidebar - Controls */}
          <div className="w-64 space-y-4">
            {/* Filter */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter</span>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                    <span className="text-sm text-gray-700">People with active status</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Search */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    {mockCurrentIndex} of {mockTotalEmployees}
                  </span>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Employee Profile Header */}
            <EmployeeProfileHeader
              employee={workforceEmployee}
              userRole={mockUserRole}
              onEdit={() => console.log('Edit profile')}
              onChangeStatus={() => console.log('Change status')}
              onAddEarning={handleAddEarning}
              onAddCustomField={handleAddCustomField}
              onExportPDF={() => console.log('Export PDF')}
              onPrint={() => console.log('Print')}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200 rounded-lg">
                <TabsTrigger value="personal" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  Personal
                </TabsTrigger>
                <TabsTrigger value="employment" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  Employment
                </TabsTrigger>
                <TabsTrigger value="benefits" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  Benefits
                </TabsTrigger>
                <TabsTrigger value="talent" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  Talent
                </TabsTrigger>
                <TabsTrigger value="compliance" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  Statutory Compliance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-6">
                <Card className="shadow-sm">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Personal information tab - Coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="employment" className="mt-6">
                <EmploymentTab
                  employee={workforceEmployee}
                  userRole={mockUserRole}
                  onEditPosition={handleEditPosition}
                  onEditStatus={handleEditStatus}
                  onEditPay={handleEditPay}
                  onEditCorporateGroups={handleEditCorporateGroups}
                  onEditWorkSchedule={handleEditWorkSchedule}
                  onEditTimeOff={handleEditTimeOff}
                  onEditCustomField={handleEditCustomField}
                  onAddCustomField={handleAddCustomField}
                  onViewEarning={handleViewEarning}
                  onAddEarning={handleAddEarning}
                />
              </TabsContent>

              <TabsContent value="benefits" className="mt-6">
                <Card className="shadow-sm">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Benefits information tab - Coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="talent" className="mt-6">
                <Card className="shadow-sm">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Talent management tab - Coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compliance" className="mt-6">
                <Card className="shadow-sm">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Statutory compliance tab - Coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeProfile;