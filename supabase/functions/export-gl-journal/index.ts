import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JournalEntry {
  company_code: string;
  employee_number: string;
  account: string;
  debit: number;
  credit: number;
  description: string;
  pay_date: string;
  pay_period_start: string;
  pay_period_end: string;
}

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

    const url = new URL(req.url);
    const payRunId = url.searchParams.get('pay_run_id');

    if (!payRunId) {
      return new Response(
        JSON.stringify({ error: 'pay_run_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch pay run details
    const { data: payRun, error: payRunError } = await supabaseClient
      .from('pay_runs')
      .select(`
        *,
        pay_calendars (
          period_start,
          period_end,
          pay_date
        )
      `)
      .eq('id', payRunId)
      .eq('company_id', profile.company_id)
      .single();

    if (payRunError || !payRun) {
      return new Response(
        JSON.stringify({ error: 'Pay run not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch pay run lines with employee and mapping data
    const { data: payLines, error: payLinesError } = await supabaseClient
      .from('pay_run_lines')
      .select(`
        *,
        employees (
          employee_number,
          company_code
        )
      `)
      .eq('pay_run_id', payRunId);

    if (payLinesError) {
      throw payLinesError;
    }

    // Fetch T4 mappings for GL accounts
    const { data: mappings } = await supabaseClient
      .from('t4_paycode_mapping')
      .select('item_code, gl_account, item_type')
      .eq('company_id', profile.company_id)
      .eq('is_active', true);

    const glMap = new Map(
      mappings?.map((m) => [m.item_code, { gl: m.gl_account, type: m.item_type }]) || []
    );

    const journalEntries: JournalEntry[] = [];
    const summary = new Map<string, { debit: number; credit: number }>();

    // Process each pay line
    for (const line of payLines || []) {
      const employeeNumber = line.employees?.employee_number || 'UNKNOWN';
      const companyCode = line.employees?.company_code || '72R';
      const payDate = payRun.pay_calendars?.pay_date || '';
      const periodStart = payRun.pay_calendars?.period_start || '';
      const periodEnd = payRun.pay_calendars?.period_end || '';

      // Gross earnings - DEBIT expense accounts
      const grossPay = line.gross_pay || 0;
      if (grossPay > 0) {
        const earningsGL = '8000'; // Regular earnings default
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: earningsGL,
          debit: grossPay,
          credit: 0,
          description: 'Gross Pay',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, earningsGL, grossPay, 0);
      }

      // Tax deductions - CREDIT liabilities
      const taxes = line.taxes || {};
      const cppEmployee = taxes.cpp_employee || 0;
      const eiEmployee = taxes.ei_employee || 0;
      const federalTax = taxes.federal_tax || 0;
      const provincialTax = taxes.provincial_tax || 0;

      if (cppEmployee > 0) {
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: '8030',
          debit: 0,
          credit: cppEmployee,
          description: 'CPP Employee',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, '8030', 0, cppEmployee);
      }

      if (eiEmployee > 0) {
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: '8030',
          debit: 0,
          credit: eiEmployee,
          description: 'EI Employee',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, '8030', 0, eiEmployee);
      }

      if (federalTax > 0) {
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: '8030',
          debit: 0,
          credit: federalTax,
          description: 'Federal Tax',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, '8030', 0, federalTax);
      }

      if (provincialTax > 0) {
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: '8030',
          debit: 0,
          credit: provincialTax,
          description: 'Provincial Tax',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, '8030', 0, provincialTax);
      }

      // Employer contributions - DEBIT expense accounts
      const cppEmployer = taxes.cpp_employer || 0;
      const eiEmployer = taxes.ei_employer || 0;

      if (cppEmployer > 0) {
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: '8030',
          debit: cppEmployer,
          credit: 0,
          description: 'CPP Employer',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, '8030', cppEmployer, 0);
      }

      if (eiEmployer > 0) {
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: '8030',
          debit: eiEmployer,
          credit: 0,
          description: 'EI Employer',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, '8030', eiEmployer, 0);
      }

      // Other deductions
      const deductions = line.deductions || {};
      for (const [code, amount] of Object.entries(deductions)) {
        if (typeof amount === 'number' && amount > 0) {
          const mapping = glMap.get(code);
          const glAccount = mapping?.gl || '2046';
          journalEntries.push({
            company_code: companyCode,
            employee_number: employeeNumber,
            account: glAccount,
            debit: 0,
            credit: amount,
            description: code,
            pay_date: payDate,
            pay_period_start: periodStart,
            pay_period_end: periodEnd,
          });
          updateSummary(summary, glAccount, 0, amount);
        }
      }

      // Net pay - CREDIT bank
      const netPay = line.net_pay || 0;
      if (netPay > 0) {
        journalEntries.push({
          company_code: companyCode,
          employee_number: employeeNumber,
          account: '0110',
          debit: 0,
          credit: netPay,
          description: 'Net Pay',
          pay_date: payDate,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
        });
        updateSummary(summary, '0110', 0, netPay);
      }
    }

    // Generate CSV
    const csvRows: string[] = [
      'company_code,employee_number,account,debit,credit,description,pay_date,pay_period_start,pay_period_end',
    ];

    for (const entry of journalEntries) {
      csvRows.push(
        `${entry.company_code},${entry.employee_number},${entry.account},${entry.debit.toFixed(2)},${entry.credit.toFixed(2)},\"${entry.description}\",${entry.pay_date},${entry.pay_period_start},${entry.pay_period_end}`
      );
    }

    // Add summary section
    csvRows.push('');
    csvRows.push('SUMMARY');
    csvRows.push('account,total_debit,total_credit,balance');
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    for (const [account, totals] of summary.entries()) {
      csvRows.push(`${account},${totals.debit.toFixed(2)},${totals.credit.toFixed(2)},${(totals.debit - totals.credit).toFixed(2)}`);
      totalDebit += totals.debit;
      totalCredit += totals.credit;
    }
    
    csvRows.push(`TOTAL,${totalDebit.toFixed(2)},${totalCredit.toFixed(2)},${(totalDebit - totalCredit).toFixed(2)}`);

    const csvContent = csvRows.join('\n');


    console.log(`Generated GL journal for pay run ${payRunId} with ${journalEntries.length} entries`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="GL_Journal_${payRunId}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating GL journal:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function updateSummary(
  summary: Map<string, { debit: number; credit: number }>,
  account: string,
  debit: number,
  credit: number
) {
  const current = summary.get(account) || { debit: 0, credit: 0 };
  summary.set(account, {
    debit: current.debit + debit,
    credit: current.credit + credit,
  });
}
