import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, ChevronDown, Edit, FileText, Printer, Download, UserCheck, Plus } from 'lucide-react';
import { Employee, UserRole } from '@/types/employee';
import { cn } from '@/lib/utils';

interface EmployeeProfileHeaderProps {
  employee: Employee;
  userRole: UserRole;
  onEdit: () => void;
  onChangeStatus: () => void;
  onAddEarning: () => void;
  onAddCustomField: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
}

export function EmployeeProfileHeader({
  employee,
  userRole,
  onEdit,
  onChangeStatus,
  onAddEarning,
  onAddCustomField,
  onExportPDF,
  onPrint
}: EmployeeProfileHeaderProps) {
  const [showFullSIN, setShowFullSIN] = useState(false);

  const displayName = employee.preferredName 
    ? `${employee.preferredName} (${employee.firstName} ${employee.lastName})`
    : `${employee.firstName} ${employee.lastName}`;

  const subtitle = `${employee.department || 'N/A'} – ${employee.jobTitle || 'No Title'}`.toUpperCase();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Terminated': return 'bg-red-100 text-red-800';
      case 'Leave': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canRevealSIN = userRole.permissions.canRevealSIN;
  const displaySIN = showFullSIN && canRevealSIN ? employee.sin : employee.sinMasked;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Left Side - Avatar and Info */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatarUrl} alt={displayName} />
              <AvatarFallback className="text-lg font-semibold">
                {employee.firstName[0]}{employee.lastName[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-semibold text-gray-900">{displayName}</h1>
                <Badge className={cn("text-xs font-medium", getStatusColor(employee.status))}>
                  {employee.status}
                </Badge>
              </div>
              <p className="text-sm font-medium text-gray-600">{subtitle}</p>
            </div>
          </div>

          {/* Right Side - Identifiers and Actions */}
          <div className="flex items-start space-x-8">
            {/* Identifiers */}
            <div className="space-y-3 text-right">
              <div>
                <p className="text-xs text-gray-500 font-medium">Position ID</p>
                <p className="text-sm font-semibold text-gray-900">{employee.positionId}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 font-medium">Tax ID (SIN)</p>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-semibold text-gray-900">{displaySIN}</p>
                  {canRevealSIN && (
                    <button
                      onClick={() => setShowFullSIN(!showFullSIN)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showFullSIN ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
              
              {employee.rehireDate && (
                <div>
                  <p className="text-xs text-gray-500 font-medium">Rehire Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(employee.rehireDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Take Action Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Take action
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit profile
                </DropdownMenuItem>
                {userRole.permissions.canEditStatus && (
                  <DropdownMenuItem onClick={onChangeStatus}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Change status
                  </DropdownMenuItem>
                )}
                {userRole.permissions.canEditPay && (
                  <DropdownMenuItem onClick={onAddEarning}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add earning
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onAddCustomField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add custom field
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}