import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DeductionCodesListProps {
  employeeId: string;
}

export const DeductionCodesList: React.FC<DeductionCodesListProps> = ({ employeeId }) => {
  const { data: employeeCodes = [] } = useQuery({
    queryKey: ['employee-deduction-codes', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_deduction_codes')
        .select(`
          deduction_code,
          deduction_codes!inner (
            code,
            label,
            category
          )
        `)
        .eq('employee_id', employeeId)
        .is('effective_to', null);
      
      if (error) throw error;
      return data;
    }
  });

  if (employeeCodes.length === 0) {
    return <p className="text-sm text-muted-foreground">No codes assigned</p>;
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Tax': return 'bg-red-100 text-red-800';
      case 'Benefit': return 'bg-blue-100 text-blue-800';
      case 'Retirement': return 'bg-green-100 text-green-800';
      case 'Union': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {employeeCodes.map((employeeCode) => (
        <Badge 
          key={employeeCode.deduction_code} 
          className={`font-mono text-xs ${getCategoryColor((employeeCode.deduction_codes as any).category)}`}
          title={(employeeCode.deduction_codes as any).label}
        >
          {employeeCode.deduction_code}
        </Badge>
      ))}
    </div>
  );
};