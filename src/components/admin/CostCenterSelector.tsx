import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CostCenterSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CostCenterSelector: React.FC<CostCenterSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select cost center"
}) => {
  const { data: costCenters = [] } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('code, name')
        .eq('active', true)
        .order('code');
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <Select value={value || "none"} onValueChange={(val) => onChange(val === "none" ? "" : val)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {costCenters.map((center) => (
          <SelectItem key={center.code} value={center.code}>
            <span className="font-mono">{center.code}</span> - {center.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};