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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
    const weekStart = url.searchParams.get('weekStart');
    const weekEnd = url.searchParams.get('weekEnd');

    if (!employeeId || !weekStart || !weekEnd) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user access
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employeeId)
      .single();

    if (!employee) {
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

    // Get or create timecard
    const { data: timecardId, error: createError } = await supabase.rpc('get_or_create_timecard', {
      p_employee_id: employeeId,
      p_week_start: weekStart,
      p_week_end: weekEnd
    });

    if (createError || !timecardId) {
      console.error('Error getting/creating timecard:', createError);
      return new Response(JSON.stringify({ error: 'Failed to get timecard' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch timecard header
    const { data: timecard, error: tcError } = await supabase
      .from('timecards')
      .select('id, employee_id, company_code, week_start, week_end, status, total_hours, pay_calendar_id')
      .eq('id', timecardId)
      .single();

    if (tcError || !timecard) {
      return new Response(JSON.stringify({ error: 'Failed to fetch timecard' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all entries
    const { data: days, error: daysError } = await supabase
      .from('timesheet_entries')
      .select('work_date, daily_hours, manual_hours, source, pay_code, time_in, time_out')
      .eq('timecard_id', timecardId)
      .order('work_date');

    if (daysError) {
      console.error('Error fetching entries:', daysError);
    }

    // Check if user can see source column
    const showSource = profile.role === 'org_admin' || profile.role === 'payroll_admin';

    return new Response(JSON.stringify({
      timecard,
      days: (days || []).map(day => ({
        ...day,
        source: showSource ? day.source : 'hidden'
      })),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-timecard-v2:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
