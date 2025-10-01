import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ADPFileType {
  type: 'payroll_items' | 'gl_report' | 'deduction_codes' | 'unknown';
  detectedHeaders: string[];
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  warnings: string[];
}

interface NormalizedItem {
  company_code: string;
  item_type: 'Earning' | 'Deduction' | 'Benefit' | 'Tax';
  item_code: string;
  item_label: string;
  active: boolean;
}

interface DeductionCodeRecord {
  code: string;
  label: string;
  category: string;
  isEmployerContribution: boolean;
  mapsTo: string;
  active: boolean;
}

export function useADPImport() {
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const normalizeHeader = (header: string): string => {
    return header.trim().toLowerCase().replace(/[\s\-_]/g, '');
  };

  const detectFileType = (headers: string[]): ADPFileType => {
    const normalized = headers.map(normalizeHeader);

    // Check for Payroll Items Report
    if (
      normalized.some(h => h.includes('payrollitem')) &&
      normalized.some(h => h.includes('code')) &&
      normalized.some(h => h.includes('companycode'))
    ) {
      return { type: 'payroll_items', detectedHeaders: headers };
    }

    // Check for GL Report
    if (
      normalized.some(h => h.includes('detail') && h.includes('description')) &&
      normalized.some(h => h.includes('detail') && h.includes('account'))
    ) {
      return { type: 'gl_report', detectedHeaders: headers };
    }

    // Check for Deduction Codes list
    if (
      normalized.some(h => h.includes('code')) &&
      normalized.some(h => h.includes('description')) &&
      !normalized.some(h => h.includes('payroll'))
    ) {
      return { type: 'deduction_codes', detectedHeaders: headers };
    }

    return { type: 'unknown', detectedHeaders: headers };
  };

  const findHeaderMatch = (headers: string[], patterns: string[]): string | null => {
    const normalized = headers.map(h => normalizeHeader(h));
    for (const pattern of patterns) {
      const idx = normalized.findIndex(h => h.includes(normalizeHeader(pattern)));
      if (idx >= 0) return headers[idx];
    }
    return null;
  };

  const inferItemType = (payrollItem: string, label: string): 'Earning' | 'Deduction' | 'Benefit' | 'Tax' => {
    const labelUpper = label.toUpperCase();
    const payrollUpper = payrollItem.toUpperCase();

    // Tax items
    if (labelUpper.includes('CPP') || labelUpper.includes('EI') || 
        labelUpper.includes('TAX') || labelUpper.includes('INCOME TAX') ||
        labelUpper.includes('FEDERAL') || labelUpper.includes('PROVINCIAL')) {
      return 'Tax';
    }

    // Earnings
    if (payrollUpper.includes('EARNING') ||
        labelUpper.match(/BONUS|COMMISSION|OVERTIME|VACATION|ACTING PAY|TRAINING|SEVERANCE|SHIFT PREMIUM|PERS DAY|FLOAT|BEREAVEMENT|RETRO|SALARY|WAGE/)) {
      return 'Earning';
    }

    // Benefits (employer-only)
    if (labelUpper.match(/EHT|EMPLOYER CPP|EMPLOYER EI|EMPLOYER GRSP/)) {
      return 'Benefit';
    }

    // Deductions
    if (payrollUpper.includes('DEDUCTION') ||
        labelUpper.match(/UNION|DPS|DPSP|GRSP|ADVANCE|LTD|STD|HEALTH|BENEFITS/)) {
      return 'Deduction';
    }

    return 'Earning';
  };

  const expandCompanyCodes = (companyCodeStr: string): string[] => {
    if (!companyCodeStr || companyCodeStr.toLowerCase().includes('all')) {
      return ['72R', '72S', 'OZC'];
    }
    const codes = companyCodeStr.split(/[,;]/).map(c => c.trim().toUpperCase());
    return codes.filter(c => ['72R', '72S', 'OZC'].includes(c));
  };

  const cleanLabel = (label: string): string => {
    // Remove company code prefixes like "72R - ", "OZC - "
    return label.replace(/^(72R|72S|OZC)\s*-\s*/i, '').trim();
  };

  const getDefaultCRABox = (itemType: string, label: string): string => {
    const labelUpper = label.toUpperCase();
    
    if (labelUpper.includes('SEVERANCE')) return '66';
    if (labelUpper.includes('LTD') || labelUpper.includes('STD')) return '85';
    if (labelUpper.includes('UNION')) return '44';
    if (labelUpper.includes('PARKING')) return '40';
    if (itemType === 'Earning') return '14';
    
    return '';
  };

  const getDefaultGLAccount = (label: string): string => {
    const labelUpper = label.toUpperCase();
    
    if (labelUpper.match(/SALARY|WAGE|REGULAR/)) return '8000';
    if (labelUpper.match(/BONUS|COMMISSION/)) return '8010';
    if (labelUpper.includes('SEVERANCE')) return '8050';
    if (labelUpper.includes('VACATION')) return '8055';
    if (labelUpper.match(/BANK|NET PAY/)) return '0110';
    if (labelUpper.match(/CPP|EI|BENEFITS/)) return '8030';
    if (labelUpper.match(/GWL|LTD|STD/)) return '2047';
    if (labelUpper.match(/GRSP|MANULIFE/)) return '2042';
    if (labelUpper.includes('UNION')) return '2047';
    
    return '';
  };

  const ensureDeductionCodes = async (companyId: string): Promise<void> => {
    const defaultDeductions: DeductionCodeRecord[] = [
      { code: 'CPP_EE', label: 'CPP Employee', category: 'Tax', isEmployerContribution: false, mapsTo: '16', active: true },
      { code: 'CPP_ER', label: 'CPP Employer', category: 'Benefit', isEmployerContribution: true, mapsTo: '', active: true },
      { code: 'CPP2_EE', label: 'CPP2 Employee', category: 'Tax', isEmployerContribution: false, mapsTo: '16', active: true },
      { code: 'CPP2_ER', label: 'CPP2 Employer', category: 'Benefit', isEmployerContribution: true, mapsTo: '', active: true },
      { code: 'EI_EE', label: 'EI Employee', category: 'Tax', isEmployerContribution: false, mapsTo: '18', active: true },
      { code: 'EI_ER', label: 'EI Employer', category: 'Benefit', isEmployerContribution: true, mapsTo: '', active: true },
      { code: 'TAX_FED', label: 'Federal Income Tax', category: 'Tax', isEmployerContribution: false, mapsTo: '22', active: true },
      { code: 'TAX_PROV', label: 'Provincial Income Tax', category: 'Tax', isEmployerContribution: false, mapsTo: '', active: true },
      { code: 'UNION_DUES', label: 'Union Dues', category: 'Union', isEmployerContribution: false, mapsTo: '44', active: true },
      { code: 'DPSP_EE', label: 'DPSP Employee', category: 'Retirement', isEmployerContribution: false, mapsTo: '20', active: true },
      { code: 'DPSP_ER', label: 'DPSP Employer', category: 'Retirement', isEmployerContribution: true, mapsTo: '', active: true },
      { code: 'GRSP_EE', label: 'GRSP Employee', category: 'Retirement', isEmployerContribution: false, mapsTo: '', active: true },
      { code: 'GRSP_ER', label: 'GRSP Employer', category: 'Retirement', isEmployerContribution: true, mapsTo: '', active: true },
      { code: 'LTD', label: 'Long Term Disability', category: 'Deduction', isEmployerContribution: false, mapsTo: '85', active: true },
      { code: 'STD', label: 'Short Term Disability', category: 'Deduction', isEmployerContribution: false, mapsTo: '85', active: true },
      { code: 'EHT_ER', label: 'Employer Health Tax', category: 'Benefit', isEmployerContribution: true, mapsTo: '', active: true },
      { code: 'PARKING', label: 'Parking Benefit', category: 'Benefit', isEmployerContribution: false, mapsTo: '40', active: true },
    ];

    const { error } = await supabase
      .from('deduction_codes')
      .upsert(defaultDeductions.map(d => ({
        code: d.code,
        description: d.label,
        label: d.label,
        category: d.category,
        company_id: companyId,
        is_employer_contribution: d.isEmployerContribution,
        maps_to: d.mapsTo,
        active: d.active
      })), { onConflict: 'code' });

    if (error) {
      console.error('Error ensuring deduction codes:', error);
    }
  };

  const importPayrollItems = async (data: any[], headers: string[]): Promise<ImportSummary> => {
    const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, warnings: [] };

    const codeCol = findHeaderMatch(headers, ['code', 'payrollcode', 'item code']);
    const descCol = findHeaderMatch(headers, ['description', 'desc', 'label']);
    const companyCol = findHeaderMatch(headers, ['company code', 'companycode', 'company']);
    const payrollItemCol = findHeaderMatch(headers, ['payroll item', 'payrollitem', 'type']);

    if (!codeCol || !descCol) {
      throw new Error('Required columns not found: Code and Description');
    }

    const normalized: NormalizedItem[] = [];

    for (const row of data) {
      const code = row[codeCol]?.toString().trim();
      if (!code) continue;

      const description = row[descCol]?.toString().trim() || code;
      const companyCodes = expandCompanyCodes(row[companyCol]?.toString() || 'All');
      const payrollItem = row[payrollItemCol]?.toString() || '';
      const itemType = inferItemType(payrollItem, description);
      const cleanedLabel = cleanLabel(description);

      for (const companyCode of companyCodes) {
        normalized.push({
          company_code: companyCode,
          item_type: itemType,
          item_code: code,
          item_label: cleanedLabel,
          active: true
        });
      }
    }

    // Upsert to payroll_items
    const { error: itemsError } = await supabase
      .from('payroll_items')
      .upsert(normalized, { onConflict: 'company_code,item_code' });

    if (itemsError) throw itemsError;

    // Create default CRA/GL mappings
    const craGlMappings = normalized.map(item => ({
      company_code: item.company_code,
      item_code: item.item_code,
      cra_box_code: getDefaultCRABox(item.item_type, item.item_label),
      gl_account: getDefaultGLAccount(item.item_label),
      active: true
    }));

    const { error: craGlError } = await supabase
      .from('paycode_to_cra_gl')
      .upsert(craGlMappings, { onConflict: 'company_code,item_code' });

    if (craGlError) throw craGlError;

    summary.created = normalized.length;
    return summary;
  };

  const importGLReport = async (data: any[], headers: string[]): Promise<ImportSummary> => {
    const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, warnings: [] };

    const descCol = findHeaderMatch(headers, ['detail/description', 'description', 'detail']);
    const accountCol = findHeaderMatch(headers, ['detail/account', 'account', 'gl account']);

    if (!descCol || !accountCol) {
      throw new Error('Required GL Report columns not found');
    }

    let updated = 0;

    for (const row of data) {
      const description = row[descCol]?.toString().trim();
      const account = row[accountCol]?.toString().trim();
      if (!description || !account) continue;

      // Fuzzy match to existing payroll_items
      const { data: items } = await supabase
        .from('payroll_items')
        .select('company_code, item_code, item_label')
        .ilike('item_label', `%${description}%`)
        .limit(10);

      if (items && items.length > 0) {
        for (const item of items) {
          const { error } = await supabase
            .from('paycode_to_cra_gl')
            .upsert({
              company_code: item.company_code,
              item_code: item.item_code,
              gl_account: account,
              active: true
            }, { onConflict: 'company_code,item_code' });

          if (!error) updated++;
        }
      } else {
        summary.warnings.push(`No match found for GL item: ${description}`);
      }
    }

    summary.updated = updated;
    return summary;
  };

  const importDeductionCodes = async (data: any[], headers: string[], companyId: string): Promise<ImportSummary> => {
    const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, warnings: [] };

    const codeCol = findHeaderMatch(headers, ['code', 'deduction code']);
    const descCol = findHeaderMatch(headers, ['description', 'label', 'name']);

    if (!codeCol || !descCol) {
      throw new Error('Required columns not found for deduction codes');
    }

    const deductions = data
      .filter(row => row[codeCol])
      .map(row => {
        const desc = row[descCol]?.toString().trim() || row[codeCol].toString().trim();
        return {
          code: row[codeCol].toString().trim(),
          description: desc,
          label: desc,
          category: 'Other',
          company_id: companyId,
          is_employer_contribution: false,
          maps_to: '',
          active: true
        };
      });

    const { error } = await supabase
      .from('deduction_codes')
      .upsert(deductions, { onConflict: 'code' });

    if (error) throw error;

    summary.created = deductions.length;
    return summary;
  };

  const processImport = async (
    data: any[],
    headers: string[]
  ): Promise<{ fileType: ADPFileType; summary: ImportSummary }> => {
    setImporting(true);

    try {
      // Get current user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const companyId = profile?.company_id;
      if (!companyId) throw new Error('Company not found');

      await ensureDeductionCodes(companyId);

      const fileType = detectFileType(headers);
      let summary: ImportSummary;

      switch (fileType.type) {
        case 'payroll_items':
          summary = await importPayrollItems(data, headers);
          break;
        case 'gl_report':
          summary = await importGLReport(data, headers);
          break;
        case 'deduction_codes':
          summary = await importDeductionCodes(data, headers, companyId);
          break;
        default:
          throw new Error('Unable to detect file type. Please check headers.');
      }

      toast({
        title: 'Import Successful',
        description: `Created: ${summary.created}, Updated: ${summary.updated}, Skipped: ${summary.skipped}`,
      });

      return { fileType, summary };
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setImporting(false);
    }
  };

  return {
    processImport,
    detectFileType,
    importing
  };
}
