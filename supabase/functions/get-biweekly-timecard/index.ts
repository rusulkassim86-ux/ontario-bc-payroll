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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employeeId');
    const periodStart = url.searchParams.get('periodStart');
    const periodEnd = url.searchParams.get('periodEnd');
    const createIfMissing = url.searchParams.get('createIfMissing') === 'true';

    if (!employeeId || !periodStart || !periodEnd) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get employee to check company access
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('company_id, company_code, employee_number')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user has access to this company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.company_id !== employee.company_id) {
      return new Response(JSON.stringify({ error: 'Access denied - not in same company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to get existing timesheets for this period
    const { data: existingTimesheets, error: fetchError } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('work_date', periodStart)
      .lte('work_date', periodEnd)
      .order('work_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching timesheets:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch timesheets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check approval status
    const { data: approval } = await supabase
      .from('timesheet_approvals')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('pay_period_start', periodStart)
      .eq('pay_period_end', periodEnd)
      .single();

    let timecardCreated = false;

    // If no timesheets exist and createIfMissing is true, create blank rows
    if ((!existingTimesheets || existingTimesheets.length === 0) && createIfMissing) {
      const start = new Date(periodStart);
      const blankRows = [];
      
      // Create 14 days of blank timesheet entries
      for (let i = 0; i < 14; i++) {
        const workDate = new Date(start);
        workDate.setDate(workDate.getDate() + i);
        
        const dayOfWeek = workDate.getDay();
        const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        
        blankRows.push({
          employee_id: employeeId,
          work_date: workDate.toISOString().split('T')[0],
          weekday,
          time_in: null,
          time_out: null,
          pay_code: null,
          hours: null,
          department: null,
          status: 'pending',
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
      }

      const { data: created, error: createError } = await supabase
        .from('timesheets')
        .insert(blankRows)
        .select();

      if (createError) {
        console.error('Error creating blank timesheets:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create blank timecard' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      timecardCreated = true;
      
      return new Response(JSON.stringify({
        timecard: created,
        approval: null,
        created: true,
        employee: {
          id: employeeId,
          company_code: employee.company_code,
          employee_number: employee.employee_number,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      timecard: existingTimesheets || [],
      approval: approval || null,
      created: false,
      employee: {
        id: employeeId,
        company_code: employee.company_code,
        employee_number: employee.employee_number,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-biweekly-timecard:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
