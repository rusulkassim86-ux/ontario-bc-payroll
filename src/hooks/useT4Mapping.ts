import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface T4Mapping {
  id: string;
  company_code: string;
  item_type: string;
  item_code: string;
  item_name: string;
  contributes_box14: boolean;
  insurable_ei: boolean;
  pensionable_cpp: boolean;
  cra_box_code: string | null;
  cra_other_info: string | null;
  notes: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useT4Mapping() {
  const [mappings, setMappings] = useState<T4Mapping[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMappings = async (companyCode?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('t4_paycode_mapping')
        .select('*')
        .eq('is_active', true)
        .order('item_code');

      if (companyCode) {
        query = query.eq('company_code', companyCode);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMappings(data || []);
    } catch (error) {
      console.error('Error fetching T4 mappings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch T4 mappings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadMapping = async (companyCode: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-t4-mapping?company=${companyCode}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download mapping');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `T4_Mapping_${companyCode}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'T4 mapping CSV downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to download T4 mapping',
        variant: 'destructive',
      });
    }
  };

  const uploadMapping = async (file: File, companyCode: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_code', companyCode);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-t4-mapping`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast({
        title: 'Success',
        description: result.message || 'T4 mappings uploaded successfully',
      });

      // Refresh mappings
      await fetchMappings(companyCode);

      return result;
    } catch (error: any) {
      console.error('Error uploading mapping:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload T4 mapping',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadDefaults = async (companyCode: string) => {
    try {
      toast({
        title: 'Info',
        description: 'Download the current mapping to see auto-generated defaults based on your pay codes',
      });
      await downloadMapping(companyCode);
    } catch (error) {
      console.error('Error loading defaults:', error);
      toast({
        title: 'Error',
        description: 'Failed to load defaults',
        variant: 'destructive',
      });
    }
  };

  return {
    mappings,
    loading,
    fetchMappings,
    downloadMapping,
    uploadMapping,
    loadDefaults,
  };
}
