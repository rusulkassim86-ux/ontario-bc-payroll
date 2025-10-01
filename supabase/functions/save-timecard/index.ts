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

    const { timecardRows, employeeId, periodStart, periodEnd } = await req.json();

    if (!timecardRows || !employeeId || !periodStart || !periodEnd) {
      return new Response(JSON.stringify({ error: 'Missing required data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if timecard is locked
    const { data: approval } = await supabase
      .from('timesheet_approvals')
      .select('is_locked')
      .eq('employee_id', employeeId)
      .eq('pay_period_start', periodStart)
      .eq('pay_period_end', periodEnd)
      .single();

    if (approval?.is_locked) {
      return new Response(JSON.stringify({ error: 'Timecard is locked and cannot be edited' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get employee to check company access
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.company_id !== employee.company_id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update each timecard row
    const updates = [];
    for (const row of timecardRows) {
      // Default to REG if hours > 0 and no pay code
      const payCode = row.pay_code || (parseFloat(row.hours || 0) > 0 ? 'REG' : null);
      
      const { data, error } = await supabase
        .from('timesheets')
        .update({
          time_in: row.time_in,
          time_out: row.time_out,
          pay_code: payCode,
          hours: row.hours ? parseFloat(row.hours) : null,
          department: row.department,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating timesheet row:', error);
        return new Response(JSON.stringify({ error: `Failed to update row ${row.id}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      updates.push(data);
    }

    return new Response(JSON.stringify({
      success: true,
      updated: updates,
      savedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save-timecard:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
