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

    const { timecardId, entries } = await req.json();

    if (!timecardId || !entries || !Array.isArray(entries)) {
      return new Response(JSON.stringify({ error: 'Invalid request: timecardId and entries required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate user has access to this timecard
    const { data: timecard, error: tcError } = await supabase
      .from('timecards')
      .select('id, employee_id, pay_calendar_id, employees!inner(company_id)')
      .eq('id', timecardId)
      .single();

    if (tcError || !timecard) {
      return new Response(JSON.stringify({ error: 'Timecard not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!timecard.pay_calendar_id) {
      return new Response(JSON.stringify({ error: 'Cannot save timecard without a pay calendar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user access
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.company_id !== timecard.employees.company_id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert entries
    const updates = [];
    for (const entry of entries) {
      const { workDate, hours, payCode, timeIn, timeOut } = entry;
      
      const { data, error } = await supabase
        .from('timesheet_entries')
        .upsert({
          timecard_id: timecardId,
          work_date: workDate,
          manual_hours: hours !== null && hours !== undefined ? parseFloat(hours) : null,
          pay_code: payCode || null,
          time_in: timeIn || null,
          time_out: timeOut || null,
        }, {
          onConflict: 'timecard_id,work_date'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting entry:', error);
        return new Response(JSON.stringify({ error: `Failed to save entry for ${workDate}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      updates.push(data);
    }

    // Recompute the timecard totals
    const { error: recomputeError } = await supabase.rpc('recompute_timecard', {
      p_timecard_id: timecardId
    });

    if (recomputeError) {
      console.error('Error recomputing timecard:', recomputeError);
    }

    // Fetch updated timecard and entries
    const { data: updatedTimecard } = await supabase
      .from('timecards')
      .select('id, status, total_hours')
      .eq('id', timecardId)
      .single();

    const { data: days } = await supabase
      .from('timesheet_entries')
      .select('work_date, daily_hours, manual_hours, source, pay_code, time_in, time_out')
      .eq('timecard_id', timecardId)
      .order('work_date');

    return new Response(JSON.stringify({
      ok: true,
      timecard: updatedTimecard,
      days: days || [],
      savedAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in save-timecard-v2:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
