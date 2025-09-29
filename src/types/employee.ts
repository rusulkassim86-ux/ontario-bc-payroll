// Employee interface matching the database schema
export interface Employee {
  id: string;
  company_id: string;
  worksite_id: string;
  union_id?: string;
  cba_id?: string;
  step?: number;
  hire_date: string;
  termination_date?: string;
  address: any;
  td1_federal: any;
  td1_provincial: any;
  cpp_exempt: boolean;
  ei_exempt: boolean;
  created_at: string;
  updated_at: string;
  fte_hours_per_week?: number;
  reports_to_id?: string;
  overtime_eligible?: boolean;
  ot_multiplier?: number;
  vacation_policy_id?: string;
  seniority_date?: string;
  permit_expiry?: string;
  probation_end?: string;
  management_position?: boolean;
  salary?: number;
  annual_salary?: number;
  rate2?: number;
  standard_hours?: number;
  premium_rate_factor?: number;
  fte?: number;
  scheduled_hours?: number;
  accrual_date?: string;
  default_request_hours?: number;
  position_start_date?: string;
  rehire_date?: string;
  leave_return_date?: string;
  job_function?: string;
  worker_category?: string;
  pay_grade?: string;
  pay_frequency?: string;
  business_unit?: string;
  location?: string;
  benefits_eligibility_class?: string;
  union_code?: string;
  union_local?: string;
  home_department?: string;
  home_cost_number?: string;
  assigned_shift?: string;
  default_start_time?: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  sin_encrypted?: string;
  province_code: string;
  classification?: string;
  leave_return_reason?: string;
  email?: string;
  phone?: string;
  rehire_reason?: string;
  banking_info_encrypted?: string;
  status: string;
  gl_cost_center?: string;
  work_eligibility?: string;
  td1_federal_status?: string;
  td1_provincial_status?: string;
  company_code?: string;
  job_title?: string;
}

// Legacy Employee interface for backward compatibility
export interface LegacyEmployee {
  // Basic Information
  id: string;
  company_id: string;
  worksite_id: string;
  union_id?: string;
  cba_id?: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  sin_encrypted?: string;
  province_code: string;
  classification?: string;
  
  // Employment Details
  step?: number;
  hire_date: string;
  termination_date?: string;
  address: any; // JSON object for address
  
  // Tax Information
  td1_federal: any; // JSON object
  td1_provincial: any; // JSON object
  cpp_exempt: boolean;
  ei_exempt: boolean;
  
  // Employment Status & Structure
  fte_hours_per_week?: number;
  reports_to_id?: string;
  overtime_eligible?: boolean;
  ot_multiplier?: number;
  vacation_policy_id?: string;
  seniority_date?: string;
  permit_expiry?: string;
  probation_end?: string;
  
  // Job Details (ADP-like fields)
  job_title?: string;
  management_position?: boolean;
  salary?: number;
  annual_salary?: number;
  rate2?: number;
  standard_hours?: number;
  premium_rate_factor?: number;
  fte?: number;
  scheduled_hours?: number;
  accrual_date?: string;
  default_request_hours?: number;
  position_start_date?: string;
  rehire_date?: string;
  leave_return_date?: string;
  leave_return_reason?: string;
  rehire_reason?: string;
  job_function?: string;
  worker_category?: string;
  pay_grade?: string;
  pay_frequency?: string;
  business_unit?: string;
  location?: string;
  benefits_eligibility_class?: string;
  union_code?: string;
  union_local?: string;
  home_department?: string;
  home_cost_number?: string;
  assigned_shift?: string;
  default_start_time?: string;
  
  // Status fields
  status: 'active' | 'inactive' | 'terminated';
  company_code?: string;
  gl_cost_center?: string;
  td1_federal_status?: string;
  td1_provincial_status?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
  };
  vacation_policy?: {
    id: string;
    name: string;
    accrual_rate_pct: number;
  };
}

export interface AdditionalEarning {
  id: string;
  type: string;
  amount: number;
  frequency: 'one-time' | 'recurring' | 'annual';
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  userId: string;
  userRole: string;
}

export interface EmployeeFilter {
  status?: string[];
  department?: string[];
  location?: string[];
  search?: string;
}

export interface UserRole {
  role: 'HR_Admin' | 'Manager' | 'Employee';
  permissions: {
    canEditPay: boolean;
    canRevealSIN: boolean;
    canEditStatus: boolean;
    canViewAll: boolean;
  };
}

export interface EmployeeExportOptions {
  format: 'pdf' | 'excel';
  includeFields: string[];
  maskSensitive: boolean;
}

// Legacy interfaces for backward compatibility
export interface EmployeeAdditionalEarning {
  id: string;
  employee_id: string;
  earning_type: string;
  amount: number;
  frequency: 'one-time' | 'recurring' | 'annual';
  start_date?: string;
  end_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCustomField {
  id: string;
  employee_id: string;
  field_name: string;
  field_value?: string;
  field_type: 'text' | 'number' | 'date' | 'boolean';
  created_at: string;
  updated_at: string;
}

export interface EmployeeRate {
  id: string;
  employee_id: string;
  rate_type: string;
  base_rate: number;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PayRunLine {
  id: string;
  employee_id: string;
  pay_run_id: string;
  gross_pay: number;
  net_pay: number;
  taxes: any;
  deductions: any;
  ytd_totals: any;
  created_at: string;
  pay_run?: {
    pay_calendar?: {
      period_start: string;
      period_end: string;
    };
  };
}

export interface YearEndSummary {
  id: string;
  employee_id: string;
  tax_year: number;
  total_employment_income: number;
  total_cpp_pensionable: number;
  total_ei_insurable: number;
  total_cpp_contributions: number;
  total_ei_premiums: number;
  total_income_tax: number;
  total_rpp_contributions: number;
  total_union_dues: number;
  other_income: any;
  other_deductions: any;
  is_finalized: boolean;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
}

export interface T4Summary {
  box14_employment_income: number;
  box16_cpp_contributions: number;
  box18_ei_premiums: number;
  box22_income_tax: number;
  box24_ei_insurable_earnings: number;
  box26_cpp_pensionable_earnings: number;
  box44_union_dues: number;
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  includeFields: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}