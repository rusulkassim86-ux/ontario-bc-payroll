import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function TimecardRedirect() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      variant: "destructive",
      title: "Employee Not Selected",
      description: "Please select an employee from the timesheets page",
    });
    navigate('/timesheets');
  }, [navigate, toast]);

  return null;
}