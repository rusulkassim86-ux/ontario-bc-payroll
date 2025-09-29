import { supabase } from '@/integrations/supabase/client';
import { CRAAuditEntry } from './types';

export async function auditCRAOperation(entry: Omit<CRAAuditEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    await supabase.from('cra_audit').insert({
      employee_id: entry.employeeId,
      operation: entry.operation,
      request_data: entry.request,
      response_meta: entry.responseMeta,
      status: entry.status,
      duration_ms: entry.durationMs,
      error_message: entry.error,
    });
  } catch (error) {
    console.error('Failed to audit CRA operation:', error);
  }
}

export async function getCRAAuditLogs(filters?: {
  employeeId?: string;
  operation?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<CRAAuditEntry[]> {
  let query = supabase
    .from('cra_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }
  if (filters?.operation) {
    query = query.eq('operation', filters.operation);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.fromDate) {
    query = query.gte('created_at', filters.fromDate);
  }
  if (filters?.toDate) {
    query = query.lte('created_at', filters.toDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data?.map(row => ({
    id: row.id,
    timestamp: row.created_at,
    employeeId: row.employee_id,
    operation: row.operation,
    request: row.request_data,
    responseMeta: row.response_meta,
    status: row.status,
    durationMs: row.duration_ms,
    error: row.error_message,
  })) || [];
}