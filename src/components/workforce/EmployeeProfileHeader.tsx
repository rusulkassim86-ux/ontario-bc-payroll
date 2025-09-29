import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, ChevronDown, Edit, FileText, Printer, Download, UserCheck, Plus } from 'lucide-react';
import { Employee } from '@/types/employee';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EmployeeProfileHeaderProps {
  employee: Employee;
  children?: React.ReactNode;
}

export function EmployeeProfileHeader({
  employee,
  children
}: EmployeeProfileHeaderProps) {
  const [showFullSIN, setShowFullSIN] = useState(false);

  if (!employee) return null;

  // Calculate display names
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const fullLegalName = `${employee.first_name} ${employee.last_name}`;
  
  const subtitle = `${employee.business_unit || 'N/A'} – ${employee.job_title || 'No Title'}`;

  const handleRevealSIN = () => {
    setShowFullSIN(!showFullSIN);
  };

  const maskSIN = (sin: string) => {
    if (!sin || sin.length < 9) return 'XXX XXX XXX';
    return `XXX XX${sin.slice(-4)}`;
  };

  const displaySIN = showFullSIN ? employee.sin_encrypted : maskSIN(employee.sin_encrypted || '');

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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src="" />
              <AvatarFallback className="text-2xl">
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name and Info */}
          <div>
            <h1 className="text-2xl font-bold">{fullName}</h1>
            <div className="text-sm text-muted-foreground">{fullLegalName}</div>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Right side info */}
        <div className="text-right space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Position ID:</span>
            <span className="font-mono">{employee.id}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tax ID (SIN):</span>
            <span className="font-mono">{displaySIN}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevealSIN}
              className="h-6 w-6 p-0"
            >
              {showFullSIN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={cn("text-xs", getStatusColor(employee.status))}>
              {employee.status}
            </Badge>
          </div>

          {employee.rehire_date && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rehire Date:</span>
              <span className="text-sm">
                {employee.rehire_date ? format(new Date(employee.rehire_date), 'MMM dd, yyyy') : 'N/A'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}