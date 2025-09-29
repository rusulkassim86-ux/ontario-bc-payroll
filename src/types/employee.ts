// ADP-style Employee Profile TypeScript Interfaces

export interface EmployeeAdditionalEarning {
  id: string;
  employee_id: string;
  earning_type: string;
  amount: number;
  frequency: 'one-time' | 'weekly' | 'biweekly' | 'monthly' | 'annual';
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
  field_type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  hire_date: string;
  termination_date?: string;
  status: 'active' | 'inactive' | 'terminated' | 'leave';
  worksite_id: string;
  company_id: string;
  union_id?: string;
  cba_id?: string;
  classification?: string;
  step?: number;
  province_code: string;
  address: {
    street?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  };
  sin_encrypted?: string;
  banking_info_encrypted?: string;
  td1_federal: Record<string, any>;
  td1_provincial: Record<string, any>;
  cpp_exempt: boolean;
  ei_exempt: boolean;
  fte_hours_per_week: number;
  reports_to_id?: string;
  gl_cost_center?: string;
  overtime_eligible: boolean;
  ot_multiplier: number;
  vacation_policy_id?: string;
  seniority_date?: string;
  work_eligibility?: 'Citizen' | 'PR' | 'WorkPermit' | 'Other';
  permit_expiry?: string;
  td1_federal_status: 'Pending' | 'Received';
  td1_provincial_status: 'Pending' | 'Received';
  probation_end?: string;
  company_code: string;
  
  // ADP-style fields
  job_title?: string;
  job_function?: string;
  worker_category?: string;
  pay_grade?: string;
  management_position?: boolean;
  salary?: number;
  annual_salary?: number;
  pay_frequency?: string;
  rate2?: number;
  standard_hours?: number;
  premium_rate_factor?: number;
  business_unit?: string;
  location?: string;
  benefits_eligibility_class?: string;
  union_code?: string;
  union_local?: string;
  home_department?: string;
  home_cost_number?: string;
  fte?: number;
  assigned_shift?: string;
  scheduled_hours?: number;
  accrual_date?: string;
  default_start_time?: string;
  default_request_hours?: number;
  position_start_date?: string;
  rehire_date?: string;
  leave_return_date?: string;
  leave_return_reason?: string;
  rehire_reason?: string;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  reports_to?: Employee;
  additional_earnings?: EmployeeAdditionalEarning[];
  custom_fields?: EmployeeCustomField[];
}

export interface EmployeeRate {
  id: string;
  employee_id: string;
  base_rate: number;
  rate_type: 'hourly' | 'salary' | 'piece_rate';
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
  taxes: {
    federal_tax?: number;
    provincial_tax?: number;
    cpp_employee?: number;
    ei_employee?: number;
  };
  deductions: {
    union_dues?: number;
    benefits?: number;
    rpp?: number;
    other?: Record<string, number>;
  };
  ytd_totals: {
    gross_pay?: number;
    federal_tax?: number;
    provincial_tax?: number;
    cpp_employee?: number;
    ei_employee?: number;
    cpp_pensionable?: number;
    ei_insurable?: number;
  };
  created_at: string;
  pay_run: {
    pay_calendar: {
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
  other_income: Record<string, any>;
  other_deductions: Record<string, any>;
  is_finalized: boolean;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
}

// T4 Box mappings for Canadian tax forms
export interface T4Summary {
  box14_employment_income: number;
  box16_cpp_contributions: number;
  box18_ei_premiums: number;
  box22_income_tax: number;
  box24_ei_insurable_earnings: number;
  box26_cpp_pensionable_earnings: number;
  box44_union_dues: number;
  box46_charitable_donations?: number;
  box50_other_payments?: number;
  box52_pension_adjustment?: number;
}

// Export functions for generating files
export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  includePersonalInfo: boolean;
  includeSalaryInfo: boolean;
  filterByStatus?: string[];
  filterByDepartment?: string[];
}