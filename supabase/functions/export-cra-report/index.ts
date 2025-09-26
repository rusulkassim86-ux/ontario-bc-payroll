import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  format: 'pdf' | 'excel' | 'csv' | 'xml';
  reportData: any;
  filename: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { format, reportData, filename }: ExportRequest = await req.json();

    console.log(`Exporting report as ${format}: ${filename}`);

    let content: string;
    let contentType: string;

    switch (format) {
      case 'csv':
        content = generateCSV(reportData);
        contentType = 'text/csv';
        break;
      
      case 'xml':
        content = generateXML(reportData);
        contentType = 'application/xml';
        break;
      
      case 'pdf':
        // For PDF generation, we'd typically use a library like jsPDF or puppeteer
        // For now, returning a placeholder
        content = generatePDFPlaceholder(reportData);
        contentType = 'application/pdf';
        break;
      
      case 'excel':
        // For Excel generation, we'd use a library like ExcelJS
        // For now, returning CSV format as a placeholder
        content = generateCSV(reportData);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return new Response(content, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('Error exporting report:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Export failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateCSV(data: any): string {
  if (Array.isArray(data)) {
    // Handle array of objects (like T4 slips)
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  } else {
    // Handle single object (like remittance report)
    const headers = Object.keys(data);
    const values = Object.values(data);
    return headers.join(',') + '\n' + values.join(',');
  }
}

function generateXML(data: any): string {
  // Generate CRA-compliant XML format
  if (data.report_type) {
    // Remittance report XML
    return generateRemittanceXML(data);
  } else if (Array.isArray(data) && data[0]?.box_14_employment_income !== undefined) {
    // T4 slips XML
    return generateT4XML(data);
  } else if (Array.isArray(data) && data[0]?.box_20_self_employed_commissions !== undefined) {
    // T4A slips XML
    return generateT4AXML(data);
  }
  
  // Generic XML
  return `<?xml version="1.0" encoding="UTF-8"?>
<CRAReport>
  <Data>${JSON.stringify(data)}</Data>
</CRAReport>`;
}

function generateRemittanceXML(report: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<RemittanceReport>
  <ReportInfo>
    <TaxYear>${new Date(report.report_period_start).getFullYear()}</TaxYear>
    <PeriodStart>${report.report_period_start}</PeriodStart>
    <PeriodEnd>${report.report_period_end}</PeriodEnd>
    <ReportType>${report.report_type}</ReportType>
    <DueDate>${report.due_date}</DueDate>
  </ReportInfo>
  <Totals>
    <CPPEmployee>${report.total_cpp_employee}</CPPEmployee>
    <CPPEmployer>${report.total_cpp_employer}</CPPEmployer>
    <EIEmployee>${report.total_ei_employee}</EIEmployee>
    <EIEmployer>${report.total_ei_employer}</EIEmployer>
    <FederalTax>${report.total_federal_tax}</FederalTax>
    <ProvincialTax>${report.total_provincial_tax}</ProvincialTax>
    <TotalRemittanceDue>${report.total_remittance_due}</TotalRemittanceDue>
  </Totals>
</RemittanceReport>`;
}

function generateT4XML(t4Slips: any[]): string {
  const slipsXML = t4Slips.map(slip => `
    <T4Slip>
      <EmployeeInfo>
        <EmployeeNumber>${slip.employee?.employee_number || ''}</EmployeeNumber>
        <FirstName>${slip.employee?.first_name || ''}</FirstName>
        <LastName>${slip.employee?.last_name || ''}</LastName>
      </EmployeeInfo>
      <Boxes>
        <Box14>${slip.box_14_employment_income}</Box14>
        <Box16>${slip.box_16_cpp_contributions}</Box16>
        <Box17>${slip.box_17_cpp_pensionable_earnings}</Box17>
        <Box18>${slip.box_18_ei_premiums}</Box18>
        <Box19>${slip.box_19_ei_insurable_earnings}</Box19>
        <Box22>${slip.box_22_income_tax_deducted}</Box22>
        <Box24>${slip.box_24_ei_insurable_earnings}</Box24>
        <Box26>${slip.box_26_cpp_pensionable_earnings}</Box26>
      </Boxes>
    </T4Slip>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<T4Summary>
  <TaxYear>${t4Slips[0]?.tax_year || new Date().getFullYear()}</TaxYear>
  <SlipCount>${t4Slips.length}</SlipCount>
  <T4Slips>${slipsXML}
  </T4Slips>
</T4Summary>`;
}

function generateT4AXML(t4aSlips: any[]): string {
  const slipsXML = t4aSlips.map(slip => `
    <T4ASlip>
      <RecipientInfo>
        <Name>${slip.recipient_name}</Name>
        <SIN>${slip.recipient_sin || ''}</SIN>
      </RecipientInfo>
      <Boxes>
        <Box20>${slip.box_20_self_employed_commissions}</Box20>
        <Box22>${slip.box_22_income_tax_deducted}</Box22>
        <Box48>${slip.box_48_fees_services}</Box48>
      </Boxes>
    </T4ASlip>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<T4ASummary>
  <TaxYear>${t4aSlips[0]?.tax_year || new Date().getFullYear()}</TaxYear>
  <SlipCount>${t4aSlips.length}</SlipCount>
  <T4ASlips>${slipsXML}
  </T4ASlips>
</T4ASummary>`;
}

function generatePDFPlaceholder(data: any): string {
  // In a real implementation, you would use a PDF library
  // This is a placeholder returning PDF-like content
  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(CRA Report - ${JSON.stringify(data).substring(0, 50)}...) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000208 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
301
%%EOF`;
}