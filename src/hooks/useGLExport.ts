import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useGLExport() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportGLJournal = async (payRunId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-gl-journal?pay_run_id=${payRunId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export GL journal');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GL_Journal_${payRunId}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'GL journal exported successfully',
      });

      return true;
    } catch (error: any) {
      console.error('Error exporting GL journal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to export GL journal',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const validateGLMapping = async (companyId: string) => {
    try {
      // Check earning codes
      const { data: earningCodes } = await supabase
        .from('earning_codes')
        .select('code')
        .eq('company_id', companyId);

      // Check deduction codes
      const { data: deductionCodes } = await supabase
        .from('deduction_codes')
        .select('code')
        .eq('company_id', companyId);

      // Check T4 mappings
      const { data: mappings } = await supabase
        .from('t4_paycode_mapping')
        .select('item_code, gl_account')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const mappedCodes = new Set(mappings?.map(m => m.item_code) || []);
      const unmappedEarnings = earningCodes?.filter(e => !mappedCodes.has(e.code)) || [];
      const unmappedDeductions = deductionCodes?.filter(d => !mappedCodes.has(d.code)) || [];

      const missingGL = mappings?.filter(m => !m.gl_account || m.gl_account === 'XXXX') || [];

      return {
        valid: unmappedEarnings.length === 0 && unmappedDeductions.length === 0 && missingGL.length === 0,
        unmappedEarnings,
        unmappedDeductions,
        missingGL,
      };
    } catch (error) {
      console.error('Error validating GL mapping:', error);
      throw error;
    }
  };

  return {
    loading,
    exportGLJournal,
    validateGLMapping,
  };
}
