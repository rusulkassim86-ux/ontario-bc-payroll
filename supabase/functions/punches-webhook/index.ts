import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { hmacSha256 } from "https://deno.land/x/hmac@v2.0.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

interface PunchWebhookPayload {
  device_serial: string
  employee_id?: string
  badge_id: string
  punch_at: string // ISO timestamp
  direction: 'IN' | 'OUT'
  method: 'finger' | 'card' | 'pin'
  raw_data?: any
}

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = hmacSha256(secret, body)
    return signature === `sha256=${expectedSignature}`
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

async function generateDedupeHash(
  deviceSerial: string,
  badgeId: string,
  punchAt: string,
  direction: string
): Promise<string> {
  const data = `${deviceSerial}|${badgeId}|${punchAt}|${direction}`
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get raw body for signature verification
    const rawBody = await req.text()
    const body: PunchWebhookPayload = JSON.parse(rawBody)
    
    console.log('Received punch webhook:', body)

    // Validate required fields
    if (!body.device_serial || !body.badge_id || !body.punch_at || !body.direction) {
      return new Response('Missing required fields', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get or create device
    let { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('serial_number', body.device_serial)
      .single()

    if (deviceError && deviceError.code !== 'PGRST116') {
      console.error('Device lookup error:', deviceError)
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    if (!device) {
      // Create device if it doesn't exist
      const { data: newDevice, error: createError } = await supabase
        .from('devices')
        .insert({
          serial_number: body.device_serial,
          model: 'Unknown',
          location: 'Auto-created',
          status: 'active',
          company_id: '00000000-0000-0000-0000-000000000001', // Will be properly set via company mapping
          last_heartbeat_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Device creation error:', createError)
        return new Response('Failed to create device', { 
          status: 500, 
          headers: corsHeaders 
        })
      }
      device = newDevice
    } else {
      // Update heartbeat
      await supabase
        .from('devices')
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq('id', device.id)
    }

    // Get punch configuration for signature verification
    const { data: config } = await supabase
      .from('punch_config')
      .select('webhook_secret, webhook_enabled')
      .eq('company_id', device.company_id)
      .single()

    // Verify signature if webhook secret is configured
    if (config?.webhook_secret) {
      const signature = req.headers.get('x-signature') || req.headers.get('x-hub-signature-256')
      if (!signature) {
        return new Response('Missing signature', { 
          status: 401, 
          headers: corsHeaders 
        })
      }

      const isValid = await verifySignature(rawBody, signature, config.webhook_secret)
      if (!isValid) {
        console.error('Invalid signature')
        return new Response('Invalid signature', { 
          status: 401, 
          headers: corsHeaders 
        })
      }
    }

    // Map badge to employee
    const { data: mapping } = await supabase
      .from('device_employees')
      .select('employee_id')
      .eq('device_id', device.id)
      .eq('badge_id', body.badge_id)
      .eq('active', true)
      .single()

    let employeeId = body.employee_id || mapping?.employee_id

    if (!employeeId) {
      // Try to find employee by badge_id in employees table (fallback)
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', body.badge_id)
        .single()
      
      employeeId = employee?.id
    }

    if (!employeeId) {
      console.error(`No employee mapping found for badge ${body.badge_id} on device ${body.device_serial}`)
      return new Response('Employee not found for badge', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Generate dedupe hash
    const dedupeHash = await generateDedupeHash(
      body.device_serial,
      body.badge_id,
      body.punch_at,
      body.direction
    )

    // Insert punch (will fail if duplicate due to unique constraint)
    const { data: punch, error: punchError } = await supabase
      .from('punches')
      .insert({
        device_id: device.id,
        employee_id: employeeId,
        badge_id: body.badge_id,
        punch_at: body.punch_at,
        direction: body.direction,
        method: body.method,
        source: 'live',
        raw_payload: body.raw_data || body,
        dedupe_hash: dedupeHash
      })
      .select()
      .single()

    if (punchError) {
      if (punchError.code === '23505') { // Unique constraint violation
        console.log('Duplicate punch ignored:', dedupeHash)
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Duplicate punch ignored',
          dedupe_hash: dedupeHash 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      console.error('Punch insert error:', punchError)
      return new Response('Failed to insert punch', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Log audit trail
    await supabase
      .from('audit_logs')
      .insert({
        action: 'PUNCH_RECEIVED',
        entity_type: 'punch',
        entity_id: punch.id,
        metadata: {
          device_serial: body.device_serial,
          badge_id: body.badge_id,
          direction: body.direction,
          method: body.method,
          source: 'webhook'
        }
      })

    console.log('Punch processed successfully:', punch.id)

    return new Response(JSON.stringify({ 
      success: true, 
      punch_id: punch.id,
      dedupe_hash: dedupeHash 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})