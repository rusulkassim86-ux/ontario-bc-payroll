import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PunchData {
  device_serial: string;
  badge_id: string;
  employee_id?: string;
  punch_at: string;
  direction: 'IN' | 'OUT';
  method: string;
  rowIndex: number;
}

interface ImportDetail {
  row: number;
  status: 'imported' | 'ignored' | 'error';
  reason?: string;
  data: PunchData;
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

async function recalculateTimesheets(
  supabase: any,
  employeeIds: string[],
  startDate: string,
  endDate: string
) {
  console.log(`Recalculating timesheets for ${employeeIds.length} employees from ${startDate} to ${endDate}`)
  
  // This would typically involve:
  // 1. Get all punches for affected employees in date range
  // 2. Group by employee and date
  // 3. Calculate total hours, regular/OT splits
  // 4. Update or create timesheet records
  
  // For now, we'll log the operation
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      action: 'TIMESHEET_RECALCULATION',
      entity_type: 'timesheet',
      entity_id: crypto.randomUUID(),
      metadata: {
        employee_ids: employeeIds,
        start_date: startDate,
        end_date: endDate,
        trigger: 'csv_import'
      }
    })

  if (error) {
    console.error('Failed to log timesheet recalculation:', error)
  }
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

    const { punches, timezone } = await req.json()
    
    console.log(`Processing CSV import of ${punches.length} punches`)

    let imported = 0
    let ignored = 0
    let errors = 0
    const details: ImportDetail[] = []
    const affectedEmployees = new Set<string>()
    const dateRange = { min: '', max: '' }

    for (const punchData of punches) {
      try {
        // Get or create device
        let { data: device, error: deviceError } = await supabase
          .from('devices')
          .select('*')
          .eq('serial_number', punchData.device_serial)
          .single()

        if (deviceError && deviceError.code !== 'PGRST116') {
          console.error('Device lookup error:', deviceError)
          details.push({
            row: punchData.rowIndex,
            status: 'error',
            reason: 'Device lookup failed',
            data: punchData
          })
          errors++
          continue
        }

        if (!device) {
          // Create device if it doesn't exist
          const { data: newDevice, error: createError } = await supabase
            .from('devices')
            .insert({
              serial_number: punchData.device_serial,
              model: 'CSV Import',
              location: 'Unknown',
              status: 'active',
              company_id: '00000000-0000-0000-0000-000000000001', // Will be properly set via company mapping
              last_heartbeat_at: new Date().toISOString()
            })
            .select()
            .single()

          if (createError) {
            console.error('Device creation error:', createError)
            details.push({
              row: punchData.rowIndex,
              status: 'error',
              reason: 'Failed to create device',
              data: punchData
            })
            errors++
            continue
          }
          device = newDevice
        }

        // Map badge to employee
        const { data: mapping } = await supabase
          .from('device_employees')
          .select('employee_id')
          .eq('device_id', device.id)
          .eq('badge_id', punchData.badge_id)
          .eq('active', true)
          .single()

        let employeeId = punchData.employee_id || mapping?.employee_id

        if (!employeeId) {
          // Try to find employee by badge_id in employees table (fallback)
          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('employee_number', punchData.badge_id)
            .single()
          
          employeeId = employee?.id
        }

        if (!employeeId) {
          details.push({
            row: punchData.rowIndex,
            status: 'ignored',
            reason: `No employee mapping found for badge ${punchData.badge_id}`,
            data: punchData
          })
          ignored++
          continue
        }

        // Generate dedupe hash
        const dedupeHash = await generateDedupeHash(
          punchData.device_serial,
          punchData.badge_id,
          punchData.punch_at,
          punchData.direction
        )

        // Check if punch already exists
        const { data: existingPunch } = await supabase
          .from('punches')
          .select('id')
          .eq('dedupe_hash', dedupeHash)
          .single()

        if (existingPunch) {
          details.push({
            row: punchData.rowIndex,
            status: 'ignored',
            reason: 'Duplicate punch',
            data: punchData
          })
          ignored++
          continue
        }

        // Insert punch
        const { data: punch, error: punchError } = await supabase
          .from('punches')
          .insert({
            device_id: device.id,
            employee_id: employeeId,
            badge_id: punchData.badge_id,
            punch_at: punchData.punch_at,
            direction: punchData.direction,
            method: punchData.method,
            source: 'csv',
            raw_payload: punchData,
            dedupe_hash: dedupeHash
          })
          .select()
          .single()

        if (punchError) {
          console.error('Punch insert error:', punchError)
          details.push({
            row: punchData.rowIndex,
            status: 'error',
            reason: punchError.message,
            data: punchData
          })
          errors++
          continue
        }

        // Track for timesheet recalculation
        affectedEmployees.add(employeeId)
        const punchDate = new Date(punchData.punch_at).toISOString().split('T')[0]
        if (!dateRange.min || punchDate < dateRange.min) dateRange.min = punchDate
        if (!dateRange.max || punchDate > dateRange.max) dateRange.max = punchDate

        details.push({
          row: punchData.rowIndex,
          status: 'imported',
          data: punchData
        })
        imported++

        // Log audit trail
        await supabase
          .from('audit_logs')
          .insert({
            action: 'PUNCH_IMPORTED',
            entity_type: 'punch',
            entity_id: punch.id,
            metadata: {
              device_serial: punchData.device_serial,
              badge_id: punchData.badge_id,
              direction: punchData.direction,
              method: punchData.method,
              source: 'csv_import',
              row_index: punchData.rowIndex
            }
          })

      } catch (error) {
        console.error('Error processing punch:', error)
        details.push({
          row: punchData.rowIndex,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
          data: punchData
        })
        errors++
      }
    }

    // Recalculate timesheets for affected employees
    if (affectedEmployees.size > 0 && dateRange.min && dateRange.max) {
      await recalculateTimesheets(
        supabase,
        Array.from(affectedEmployees),
        dateRange.min,
        dateRange.max
      )
    }

    const result = {
      imported,
      ignored,
      errors,
      details: details.sort((a, b) => a.row - b.row)
    }

    console.log(`CSV import completed: ${imported} imported, ${ignored} ignored, ${errors} errors`)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('CSV import error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})