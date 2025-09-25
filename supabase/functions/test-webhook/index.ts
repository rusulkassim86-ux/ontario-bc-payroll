import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create HMAC signature using Web Crypto API
async function createHmacSignature(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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

    const { device_id, payload } = await req.json()
    
    console.log('Testing webhook for device:', device_id)

    // Get device and webhook configuration
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .single()

    if (deviceError) {
      console.error('Device lookup error:', deviceError)
      return new Response(JSON.stringify({ 
        error: 'Device not found' 
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Get webhook configuration for the device's company
    const { data: config } = await supabase
      .from('punch_config')
      .select('webhook_secret, webhook_enabled')
      .eq('company_id', device.company_id)
      .single()

    if (!config?.webhook_enabled) {
      return new Response(JSON.stringify({ 
        error: 'Webhook not enabled for this company' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Create test payload with signature
    const webhookPayload = {
      device_serial: payload.device_serial,
      badge_id: payload.badge_id,
      punch_at: payload.punch_at,
      direction: payload.direction,
      method: payload.method,
      raw_data: { ...payload.raw_data, test: true }
    }

    const payloadString = JSON.stringify(webhookPayload)
    
    // Generate HMAC signature if secret is configured
    let signature = ''
    if (config.webhook_secret) {
      signature = await createHmacSignature(config.webhook_secret, payloadString)
    }

    // Call the webhook endpoint
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/punches-webhook`
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        ...(signature && { 'x-signature': `sha256=${signature}` })
      },
      body: payloadString
    })

    const webhookResult = await webhookResponse.text()
    
    console.log('Webhook test result:', {
      status: webhookResponse.status,
      response: webhookResult
    })

    // Log the test
    await supabase
      .from('audit_logs')
      .insert({
        action: 'WEBHOOK_TEST',
        entity_type: 'device',
        entity_id: device_id,
        metadata: {
          device_serial: payload.device_serial,
          webhook_status: webhookResponse.status,
          webhook_response: webhookResult,
          test_payload: webhookPayload
        }
      })

    const result = {
      success: webhookResponse.ok,
      status: webhookResponse.status,
      response: webhookResult,
      device_serial: device.serial_number,
      signed: !!signature
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook test error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})