import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get company_code from query params
    const url = new URL(req.url);
    const companyCode = url.searchParams.get('company');

    if (!companyCode || !['OZC', '72R', '72S'].includes(companyCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid company code. Must be OZC, 72R, or 72S' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['org_admin', 'payroll_admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch earning codes
    const { data: earningCodes } = await supabaseClient
      .from('earning_codes')
      .select('code, description')
      .eq('company_id', profile.company_id)
      .order('code');

    // Fetch deduction codes
    const { data: deductionCodes } = await supabaseClient
      .from('deduction_codes')
      .select('code, description, category')
      .eq('company_id', profile.company_id)
      .order('code');

    // Build CSV rows with auto-assignment logic
    const rows: string[][] = [
      [
        'company_code',
        'item_type',
        'item_code',
        'item_name',
        'contributes_box14',
        'insurable_ei',
        'pensionable_cpp',
        'cra_box_code',
        'cra_other_info',
        'notes',
      ],
    ];

    // Process earning codes
    if (earningCodes) {
      for (const earning of earningCodes) {
        const boxCode = '14'; // All earnings go to box 14
        rows.push([
          companyCode,
          'EARNING',
          earning.code,
          earning.description || earning.code,
          'Y',
          'Y',
          'Y',
          boxCode,
          '',
          'Employment income',
        ]);
      }
    }

    // Process deduction codes
    if (deductionCodes) {
      for (const deduction of deductionCodes) {
        let boxCode = '';
        let notes = '';
        let contributesBox14 = 'N';
        let insurableEI = 'N';
        let pensionableCPP = 'N';

        // Auto-assign CRA boxes based on code patterns
        const code = deduction.code.toUpperCase();
        if (code.includes('CPP') || code.includes('C.P.P')) {
          boxCode = '16';
          notes = 'CPP contributions';
        } else if (code.includes('EI') || code.includes('E.I')) {
          boxCode = '18';
          notes = 'EI premiums';
        } else if (code.includes('TAX') || code.includes('FED') || code.includes('PROV')) {
          boxCode = '22';
          notes = 'Income tax deducted';
        } else if (code.includes('UNION') || code.includes('DUES')) {
          boxCode = '44';
          notes = 'Union dues';
        } else if (
          deduction.category?.toUpperCase().includes('BENEFIT') ||
          code.includes('BEN') ||
          code.includes('TAXABLE')
        ) {
          boxCode = '40';
          notes = 'Other taxable allowances and benefits';
        } else if (code.includes('RPP') || code.includes('PENSION')) {
          boxCode = '20';
          notes = 'RPP contributions';
        }

        const itemType =
          deduction.category?.toUpperCase() === 'TAX'
            ? 'TAX'
            : deduction.category?.toUpperCase() === 'BENEFIT'
            ? 'BENEFIT'
            : 'DEDUCTION';

        rows.push([
          companyCode,
          itemType,
          deduction.code,
          deduction.description || deduction.code,
          contributesBox14,
          insurableEI,
          pensionableCPP,
          boxCode,
          '',
          notes,
        ]);
      }
    }

    // Convert to CSV
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    console.log(`Generated T4 mapping CSV for company ${companyCode} with ${rows.length - 1} items`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="T4_Mapping_${companyCode}_${
          new Date().toISOString().split('T')[0]
        }.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating T4 mapping CSV:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
