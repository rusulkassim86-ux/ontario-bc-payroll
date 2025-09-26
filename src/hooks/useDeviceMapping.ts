import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeviceMapping {
  id: string;
  device_serial: string;
  badge_id: string;
  employee_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useDeviceMapping(employeeId?: string) {
  const [mappings, setMappings] = useState<DeviceMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMappings = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('device_employees')
        .select('*')
        .eq('active', true);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching device mappings:', fetchError);
        setError(fetchError.message);
        return;
      }

      setMappings((data || []) as DeviceMapping[]);
    } catch (err) {
      console.error('Error in fetchMappings:', err);
      setError('Failed to fetch device mappings');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIdsForEmployee = (empId: string): string[] => {
    return mappings
      .filter(mapping => mapping.employee_id === empId && mapping.active)
      .map(mapping => mapping.badge_id);
  };

  const getEmployeeFromBadgeId = (badgeId: string): string | null => {
    const mapping = mappings.find(m => m.badge_id === badgeId && m.active);
    return mapping?.employee_id || null;
  };

  useEffect(() => {
    fetchMappings();
  }, [employeeId]);

  return {
    mappings,
    loading,
    error,
    getBadgeIdsForEmployee,
    getEmployeeFromBadgeId,
    refetch: fetchMappings
  };
}