import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WorkforceProfile() {
  const navigate = useNavigate();

  // Mock employee data for demo
  const mockEmployees = [
    {
      id: '1',
      name: 'Dan Aitkenhead',
      position: 'Global Sales Manager', 
      status: 'Active',
      employeeId: 'EMP001',
      department: 'GLOBSALE'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      position: 'HR Specialist',
      status: 'Active', 
      employeeId: 'EMP002',
      department: 'HR'
    },
    {
      id: '3',
      name: 'Mike Chen',
      position: 'Software Engineer',
      status: 'Active',
      employeeId: 'EMP003', 
      department: 'IT'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">WP</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Workforce Profile</h1>
            </div>
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <CardTitle className="flex items-center text-2xl">
                <Users className="mr-3 h-6 w-6" />
                Employee Management System
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">
                Welcome to the Workforce Profile application. This ADP-style employee management system 
                provides comprehensive employee information, detailed employment records, and powerful 
                search and filtering capabilities.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{mockEmployees.length}</div>
                  <div className="text-sm text-gray-600">Active Employees</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-600">Profile Completion</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">3</div>
                  <div className="text-sm text-gray-600">Departments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Directory */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockEmployees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-500">{employee.position} • {employee.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {employee.status}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/employees/${employee.id}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Employee Profiles</h3>
              <p className="text-sm text-gray-600">
                Comprehensive employee information with ADP-style layout including personal, employment, 
                benefits, and compliance data.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Advanced Search</h3>
              <p className="text-sm text-gray-600">
                Powerful search and filtering capabilities to quickly find employees by name, 
                ID, department, or status.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Role-Based Access</h3>
              <p className="text-sm text-gray-600">
                Secure access controls with HR Admin, Manager, and Employee roles with 
                appropriate permissions and data masking.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}