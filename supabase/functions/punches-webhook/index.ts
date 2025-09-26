import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

interface PunchWebhookPayload {
  deviceSerial: string;
  records: Array<{
    badgeId: string;
    timestamp: string;
    direction: 'IN' | 'OUT' | 'I' | 'O';
  }>;
}

// HMAC signature verification
async function createHmacSignature(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await createHmacSignature(secret, body);
  return signature === expectedSignature;
}

// Generate deduplication hash
async function generateDedupeHash(deviceSerial: string, badgeId: string, punchAt: string, direction: string): Promise<string> {
  const data = `${deviceSerial}-${badgeId}-${punchAt}-${direction}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.text();
    const payload: PunchWebhookPayload = JSON.parse(body);
    console.log('Received punch webhook:', payload);

    // Validate payload
    if (!payload.deviceSerial || !payload.records || !Array.isArray(payload.records)) {
      return new Response(JSON.stringify({
        error: 'Invalid payload format',
        message: 'Missing required fields: deviceSerial, records'
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Look up device and update heartbeat
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('serial_number', payload.deviceSerial)
      .single();

    let deviceCompanyId = device?.company_id;
    
    if (deviceError || !device) {
      // Create new device if it doesn't exist
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .limit(1);

      if (!companies || companies.length === 0) {
        return new Response(JSON.stringify({
          error: 'No company found',
          message: 'Cannot create device without a company'
        }), {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      deviceCompanyId = companies[0].id;
      
      const { data: newDevice } = await supabase
        .from('devices')
        .insert({
          name: `Auto-created: ${payload.deviceSerial}`,
          serial_number: payload.deviceSerial,
          location: 'Unknown',
          company_id: deviceCompanyId,
          last_heartbeat_at: new Date().toISOString()
        })
        .select()
        .single();

      console.log('Created new device:', newDevice);
    } else {
      // Update device heartbeat
      await supabase
        .from('devices')
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', device.id);
    }

    // Get punch configuration for webhook secret
    const { data: punchConfig } = await supabase
      .from('punch_config')
      .select('webhook_secret, duplicate_window_seconds')
      .limit(1)
      .single();

    // Verify signature if provided
    const signature = req.headers.get('x-signature');
    if (signature && punchConfig?.webhook_secret) {
      const isValid = await verifySignature(body, signature, punchConfig.webhook_secret);
      if (!isValid) {
        return new Response(JSON.stringify({
          error: 'Invalid signature',
          message: 'Webhook signature verification failed'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const results = [];
    const duplicateWindow = punchConfig?.duplicate_window_seconds || 60;

    // Process each punch record
    for (const record of payload.records) {
      try {
        // Normalize direction
        let direction: 'IN' | 'OUT';
        if (record.direction === 'I' || record.direction === 'IN') {
          direction = 'IN';
        } else if (record.direction === 'O' || record.direction === 'OUT') {
          direction = 'OUT';
        } else {
          results.push({
            badgeId: record.badgeId,
            status: 'error',
            message: `Invalid direction: ${record.direction}`
          });
          continue;
        }

        // Map badge ID to employee
        const { data: mapping } = await supabase
          .from('device_employees')
          .select('employee_id, employees!inner(company_id)')
          .eq('device_serial', payload.deviceSerial)
          .eq('badge_id', record.badgeId)
          .eq('active', true)
          .single();

        if (!mapping) {
          results.push({
            badgeId: record.badgeId,
            status: 'error',
            message: 'Unknown badge ID - please map in Device Mapping'
          });

          // Log unknown badge
          await supabase
            .from('punch_import_logs')
            .insert({
              file_name: 'webhook',
              import_type: 'webhook',
              company_id: deviceCompanyId,
              rows_total: 1,
              rows_error: 1,
              errors: [{
                badgeId: record.badgeId,
                error: 'Unknown badge ID',
                deviceSerial: payload.deviceSerial
              }],
              status: 'completed'
            });

          continue;
        }

        // Generate deduplication hash
        const dedupeHash = await generateDedupeHash(
          payload.deviceSerial,
          record.badgeId,
          record.timestamp,
          direction
        );

        // Check for recent duplicates within the window
        const windowStart = new Date(new Date(record.timestamp).getTime() - (duplicateWindow * 1000));
        const windowEnd = new Date(new Date(record.timestamp).getTime() + (duplicateWindow * 1000));

        const { data: existingPunch } = await supabase
          .from('punches')
          .select('id')
          .eq('device_serial', payload.deviceSerial)
          .eq('badge_id', record.badgeId)
          .eq('direction', direction)
          .gte('punch_timestamp', windowStart.toISOString())
          .lte('punch_timestamp', windowEnd.toISOString())
          .limit(1)
          .single();

        if (existingPunch) {
          results.push({
            badgeId: record.badgeId,
            status: 'duplicate',
            message: `Duplicate punch within ${duplicateWindow}s window`
          });
          continue;
        }

        // Insert punch
        const { data: punch, error: punchError } = await supabase
          .from('punches')
          .insert({
            device_serial: payload.deviceSerial,
            badge_id: record.badgeId,
            employee_id: mapping.employee_id,
            punch_timestamp: record.timestamp,
            direction,
            source: 'device',
            raw_data: record,
            deduped_hash: dedupeHash,
            company_id: (mapping.employees as any)?.company_id
          })
          .select()
          .single();

        if (punchError) {
          if (punchError.code === '23505') { // Unique constraint violation
            results.push({
              badgeId: record.badgeId,
              status: 'duplicate',
              message: 'Duplicate punch detected'
            });
          } else {
            results.push({
              badgeId: record.badgeId,
              status: 'error',
              message: `Database error: ${punchError.message}`
            });
          }
          continue;
        }

        // Log successful punch
        await supabase
          .from('audit_logs')
          .insert({
            action: 'PUNCH_RECEIVED',
            entity_type: 'punch',
            entity_id: punch.id,
            metadata: {
              device_serial: payload.deviceSerial,
              badge_id: record.badgeId,
              direction,
              timestamp: record.timestamp,
              source: 'webhook'
            }
          });

        results.push({
          badgeId: record.badgeId,
          status: 'success',
          message: 'Punch recorded successfully',
          punchId: punch.id
        });

      } catch (recordError: any) {
        console.error('Error processing punch record:', recordError);
        results.push({
          badgeId: record.badgeId,
          status: 'error',
          message: `Processing error: ${recordError?.message || 'Unknown error'}`
        });
      }
    }

    // Return results
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const duplicateCount = results.filter(r => r.status === 'duplicate').length;

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total: payload.records.length,
        successful: successCount,
        errors: errorCount,
        duplicates: duplicateCount
      },
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});