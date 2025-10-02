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

    const { employeeId, punches } = await req.json();

    if (!employeeId || !punches || !Array.isArray(punches)) {
      return new Response(JSON.stringify({ error: 'Missing required data' }), {
        status: 400,
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

    // Import punches
    const importedPunches = [];
    for (const punch of punches) {
      const { data, error } = await supabase
        .from('punches')
        .insert({
          employee_id: employeeId,
          punch_timestamp: punch.timestamp,
          direction: punch.direction,
          device_serial: punch.deviceSerial || null,
          source: 'import',
          processed: true,
          company_id: employee.company_id,
        })
        .select()
        .single();

      if (!error) {
        importedPunches.push(data);
      }
    }

    // Create audit log
    await supabase.rpc('create_audit_log', {
      p_action: 'IMPORT_PUNCHES',
      p_entity_type: 'punches',
      p_entity_id: employeeId,
      p_after_data: {
        imported_count: importedPunches.length,
        total_submitted: punches.length,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      imported: importedPunches.length,
      total: punches.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import-punches:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
