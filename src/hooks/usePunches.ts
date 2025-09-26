import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Punch {
  id: string;
  device_serial: string;
  badge_id: string;
  employee_id: string;
  punch_timestamp: string;
  direction: 'IN' | 'OUT';
  source: 'device' | 'manual' | 'import';
  raw_data: any;
  processed: boolean;
  created_at: string;
  company_id: string;
}

interface PunchPair {
  date: string;
  timeIn?: string;
  timeOut?: string;
  inPunchId?: string;
  outPunchId?: string;
  hours: number;
  isComplete: boolean;
}

export function usePunches(employeeIdentifier?: string, startDate?: Date, endDate?: Date) {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [punchPairs, setPunchPairs] = useState<PunchPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPunches = async () => {
    if (!employeeIdentifier || !startDate || !endDate) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First get the employee UUID from employee_number
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', employeeIdentifier)
        .maybeSingle();

      if (empError) {
        console.error('Error fetching employee:', empError);
        setError(empError.message);
        return;
      }

      if (!employee) {
        console.warn(`Employee not found for identifier: ${employeeIdentifier}`);
        setPunches([]);
        setPunchPairs([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('punches')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('punch_timestamp', startDate.toISOString())
        .lte('punch_timestamp', endDate.toISOString())
        .order('punch_timestamp');

      if (fetchError) {
        console.error('Error fetching punches:', fetchError);
        setError(fetchError.message);
        return;
      }

      setPunches((data || []) as Punch[]);
      processPunchPairs((data || []) as Punch[]);
    } catch (err) {
      console.error('Error in fetchPunches:', err);
      setError('Failed to fetch punches');
    } finally {
      setLoading(false);
    }
  };

  const processPunchPairs = (punchData: Punch[]) => {
    const pairsByDate: Record<string, PunchPair> = {};

    // Group punches by date
    punchData.forEach(punch => {
      const date = punch.punch_timestamp.split('T')[0];
      
      if (!pairsByDate[date]) {
        pairsByDate[date] = {
          date,
          hours: 0,
          isComplete: false
        };
      }

      const time = punch.punch_timestamp.split('T')[1].substring(0, 5);
      
      if (punch.direction === 'IN') {
        pairsByDate[date].timeIn = time;
        pairsByDate[date].inPunchId = punch.id;
      } else {
        pairsByDate[date].timeOut = time;
        pairsByDate[date].outPunchId = punch.id;
      }
    });

    // Calculate hours and completion status
    Object.values(pairsByDate).forEach(pair => {
      if (pair.timeIn && pair.timeOut) {
        pair.hours = calculateHours(pair.timeIn, pair.timeOut);
        pair.isComplete = true;
      } else {
        pair.isComplete = false;
      }
    });

    setPunchPairs(Object.values(pairsByDate));
  };

  const calculateHours = (timeIn: string, timeOut: string): number => {
    if (!timeIn || !timeOut) return 0;
    
    const [inHour, inMin] = timeIn.split(':').map(Number);
    const [outHour, outMin] = timeOut.split(':').map(Number);
    
    const inTime = inHour + inMin / 60;
    const outTime = outHour + outMin / 60;
    
    let hours = outTime - inTime;
    if (hours < 0) hours += 24; // Handle overnight shifts
    
    // Subtract 1 hour for lunch break if working more than 6 hours
    if (hours > 6) hours -= 1;
    
    return Math.round(hours * 100) / 100;
  };

  const addManualPunch = async (
    date: Date,
    time: string,
    direction: 'IN' | 'OUT'
  ) => {
    if (!employeeIdentifier) return;

    try {
      // Get employee UUID first
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', employeeIdentifier)
        .maybeSingle();

      if (empError || !employee) {
        throw new Error('Employee not found');
      }

      const punchTimestamp = new Date(`${date.toISOString().split('T')[0]}T${time}:00`);
      
      const { data, error } = await supabase
        .from('punches')
        .insert({
          device_serial: 'MANUAL',
          badge_id: 'MANUAL',
          employee_id: employee.id,
          punch_timestamp: punchTimestamp.toISOString(),
          direction,
          source: 'manual',
          raw_data: { manual_entry: true, entered_by: 'user' }
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Manual Punch Added",
        description: `${direction} punch added for ${date.toDateString()} at ${time}`,
      });

      // Refresh punches
      await fetchPunches();
      
      return data;
    } catch (err) {
      console.error('Error adding manual punch:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add manual punch",
      });
      throw err;
    }
  };

  const deletePunch = async (punchId: string) => {
    try {
      const { error } = await supabase
        .from('punches')
        .delete()
        .eq('id', punchId);

      if (error) {
        throw error;
      }

      toast({
        title: "Punch Deleted",
        description: "Punch has been successfully deleted",
      });

      // Refresh punches
      await fetchPunches();
    } catch (err) {
      console.error('Error deleting punch:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete punch",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchPunches();
  }, [employeeIdentifier, startDate, endDate]);

  return {
    punches,
    punchPairs,
    loading,
    error,
    addManualPunch,
    deletePunch,
    refetch: fetchPunches
  };
}