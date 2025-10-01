import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employeeId');

    if (!employeeId) {
      return new Response(JSON.stringify({ error: 'Employee ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get company_id from employee if employeeId provided
    let targetCompanyId = null;
    if (employeeId) {
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', employeeId)
        .single();
      
      if (employee) {
        targetCompanyId = employee.company_id;
      }
    }

    // Get earning codes for this company that allow timesheets
    const { data: earningCodes, error } = await supabase
      .from('earning_codes')
      .select('id, code, label, description, is_overtime, overtime_multiplier, active, allow_in_timesheets, company_id')
      .eq('active', true)
      .eq('allow_in_timesheets', true)
      .eq('company_id', targetCompanyId)
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching pay codes:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch pay codes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      payCodes: earningCodes || [],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-timesheet-pay-codes:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
