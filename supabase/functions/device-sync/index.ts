import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { device_id } = await req.json()
    
    console.log('Manual sync requested for device:', device_id)

    // Get device information
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

    // Simulate polling sync - in real implementation this would:
    // 1. Connect to the device's API/SFTP/CSV source
    // 2. Fetch new punches since last sync
    // 3. Process and insert them using the same logic as CSV import
    
    const mockSyncResult = {
      punches_found: Math.floor(Math.random() * 10) + 1,
      punches_imported: Math.floor(Math.random() * 8) + 1,
      duplicates_ignored: Math.floor(Math.random() * 3),
      errors: 0,
      sync_time: new Date().toISOString()
    }

    // Update device's last sync timestamp
    await supabase
      .from('devices')
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString() 
      })
      .eq('id', device_id)

    // Log the sync operation
    await supabase
      .from('audit_logs')
      .insert({
        action: 'DEVICE_SYNC',
        entity_type: 'device',
        entity_id: device_id,
        metadata: {
          device_serial: device.serial_number,
          sync_type: 'manual',
          result: mockSyncResult
        }
      })

    console.log('Device sync completed:', mockSyncResult)

    return new Response(JSON.stringify({
      success: true,
      device_serial: device.serial_number,
      punches_count: mockSyncResult.punches_imported,
      ...mockSyncResult
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Device sync error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})