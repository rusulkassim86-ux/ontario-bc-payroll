import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Employee } from '@/hooks/usePayrollData';
import { MapPin, User, Calendar } from 'lucide-react';

interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'terminated':
        return 'destructive';
      case 'leave':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-CA');
  };

  return (
    <Card 
      className="shadow-card hover:shadow-elegant transition-all duration-200 cursor-pointer hover-scale"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(employee.first_name, employee.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground truncate">
                {employee.first_name} {employee.last_name}
              </h3>
              <Badge variant={getStatusVariant(employee.status)}>
                {employee.status}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>#{employee.employee_number}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{employee.province_code}</span>
                {employee.classification && employee.step && (
                  <span className="ml-2">
                    {employee.classification} - Step {employee.step}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Hired {formatDate(employee.hire_date)}</span>
              </div>
              
              {employee.email && (
                <div className="text-xs text-muted-foreground truncate">
                  {employee.email}
                </div>
              )}
            </div>
            
            {employee.union_id && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  Union Member
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}