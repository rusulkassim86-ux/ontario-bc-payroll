export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      cba_wage_tables: {
        Row: {
          cba_id: string
          classification: string
          created_at: string
          effective_end: string | null
          effective_start: string
          hourly_rate: number
          id: string
          step: number
          updated_at: string
        }
        Insert: {
          cba_id: string
          classification: string
          created_at?: string
          effective_end?: string | null
          effective_start: string
          hourly_rate: number
          id?: string
          step: number
          updated_at?: string
        }
        Update: {
          cba_id?: string
          classification?: string
          created_at?: string
          effective_end?: string | null
          effective_start?: string
          hourly_rate?: number
          id?: string
          step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cba_wage_tables_cba_id_fkey"
            columns: ["cba_id"]
            isOneToOne: false
            referencedRelation: "cbas"
            referencedColumns: ["id"]
          },
        ]
      }
      cbas: {
        Row: {
          company_id: string
          created_at: string
          effective_end: string | null
          effective_start: string
          id: string
          name: string
          overtime_rules: Json
          premium_rules: Json
          stat_holiday_rules: Json
          union_id: string
          updated_at: string
          vacation_rules: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_end?: string | null
          effective_start: string
          id?: string
          name: string
          overtime_rules?: Json
          premium_rules?: Json
          stat_holiday_rules?: Json
          union_id: string
          updated_at?: string
          vacation_rules?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_end?: string | null
          effective_start?: string
          id?: string
          name?: string
          overtime_rules?: Json
          premium_rules?: Json
          stat_holiday_rules?: Json
          union_id?: string
          updated_at?: string
          vacation_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cbas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbas_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: Json
          cra_business_number: string
          created_at: string
          default_pay_frequency: string
          id: string
          legal_name: string
          name: string
          remitter_type: string
          settings: Json
          updated_at: string
        }
        Insert: {
          address?: Json
          cra_business_number: string
          created_at?: string
          default_pay_frequency?: string
          id?: string
          legal_name: string
          name: string
          remitter_type?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          address?: Json
          cra_business_number?: string
          created_at?: string
          default_pay_frequency?: string
          id?: string
          legal_name?: string
          name?: string
          remitter_type?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      company_pay_periods: {
        Row: {
          anchor_date: string
          company_id: string
          created_at: string
          frequency: string
          id: string
          timezone: string
          union_code: string | null
          updated_at: string
          worksite_id: string | null
        }
        Insert: {
          anchor_date: string
          company_id: string
          created_at?: string
          frequency: string
          id?: string
          timezone?: string
          union_code?: string | null
          updated_at?: string
          worksite_id?: string | null
        }
        Update: {
          anchor_date?: string
          company_id?: string
          created_at?: string
          frequency?: string
          id?: string
          timezone?: string
          union_code?: string | null
          updated_at?: string
          worksite_id?: string | null
        }
        Relationships: []
      }
      cpp_ei_rules: {
        Row: {
          cpp_basic_exemption: number
          cpp_max_pensionable: number
          cpp_rate_employee: number
          cpp_rate_employer: number
          created_at: string
          effective_end: string | null
          effective_start: string
          ei_max_insurable: number
          ei_rate_employee: number
          ei_rate_employer: number
          id: string
          is_active: boolean
          tax_year: number
          updated_at: string
        }
        Insert: {
          cpp_basic_exemption: number
          cpp_max_pensionable: number
          cpp_rate_employee: number
          cpp_rate_employer: number
          created_at?: string
          effective_end?: string | null
          effective_start: string
          ei_max_insurable: number
          ei_rate_employee: number
          ei_rate_employer: number
          id?: string
          is_active?: boolean
          tax_year: number
          updated_at?: string
        }
        Update: {
          cpp_basic_exemption?: number
          cpp_max_pensionable?: number
          cpp_rate_employee?: number
          cpp_rate_employer?: number
          created_at?: string
          effective_end?: string | null
          effective_start?: string
          ei_max_insurable?: number
          ei_rate_employee?: number
          ei_rate_employer?: number
          id?: string
          is_active?: boolean
          tax_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      deduction_codes: {
        Row: {
          calc_type: string
          cap: number | null
          code: string
          company_id: string
          created_at: string
          description: string
          id: string
          is_cpp_reduction: boolean
          is_ei_reduction: boolean
          is_taxable_reduction: boolean
          rate: number | null
          updated_at: string
        }
        Insert: {
          calc_type?: string
          cap?: number | null
          code: string
          company_id: string
          created_at?: string
          description: string
          id?: string
          is_cpp_reduction?: boolean
          is_ei_reduction?: boolean
          is_taxable_reduction?: boolean
          rate?: number | null
          updated_at?: string
        }
        Update: {
          calc_type?: string
          cap?: number | null
          code?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          is_cpp_reduction?: boolean
          is_ei_reduction?: boolean
          is_taxable_reduction?: boolean
          rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deduction_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          employee_id: string | null
          file_size: number | null
          filename: string
          id: string
          metadata: Json
          mime_type: string | null
          pay_run_id: string | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type: string
          employee_id?: string | null
          file_size?: number | null
          filename: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          pay_run_id?: string | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          employee_id?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          pay_run_id?: string | null
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      earning_codes: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string
          id: string
          is_cpp_pensionable: boolean
          is_ei_insurable: boolean
          is_overtime: boolean
          is_taxable_federal: boolean
          is_taxable_provincial: boolean
          is_vacation_eligible: boolean
          overtime_multiplier: number | null
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description: string
          id?: string
          is_cpp_pensionable?: boolean
          is_ei_insurable?: boolean
          is_overtime?: boolean
          is_taxable_federal?: boolean
          is_taxable_provincial?: boolean
          is_vacation_eligible?: boolean
          overtime_multiplier?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          is_cpp_pensionable?: boolean
          is_ei_insurable?: boolean
          is_overtime?: boolean
          is_taxable_federal?: boolean
          is_taxable_provincial?: boolean
          is_vacation_eligible?: boolean
          overtime_multiplier?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eht_rules: {
        Row: {
          created_at: string
          effective_end: string | null
          effective_start: string
          id: string
          is_active: boolean
          is_charity_exempt: boolean
          province_code: string
          rate: number
          tax_year: number
          threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_end?: string | null
          effective_start: string
          id?: string
          is_active?: boolean
          is_charity_exempt?: boolean
          province_code: string
          rate: number
          tax_year: number
          threshold: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_end?: string | null
          effective_start?: string
          id?: string
          is_active?: boolean
          is_charity_exempt?: boolean
          province_code?: string
          rate?: number
          tax_year?: number
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: Json
          banking_info_encrypted: string | null
          cba_id: string | null
          classification: string | null
          company_id: string
          cpp_exempt: boolean
          created_at: string
          ei_exempt: boolean
          email: string | null
          employee_number: string
          first_name: string
          hire_date: string
          id: string
          last_name: string
          phone: string | null
          province_code: string
          sin_encrypted: string | null
          status: string
          step: number | null
          td1_federal: Json
          td1_provincial: Json
          termination_date: string | null
          union_id: string | null
          updated_at: string
          worksite_id: string
        }
        Insert: {
          address?: Json
          banking_info_encrypted?: string | null
          cba_id?: string | null
          classification?: string | null
          company_id: string
          cpp_exempt?: boolean
          created_at?: string
          ei_exempt?: boolean
          email?: string | null
          employee_number: string
          first_name: string
          hire_date: string
          id?: string
          last_name: string
          phone?: string | null
          province_code: string
          sin_encrypted?: string | null
          status?: string
          step?: number | null
          td1_federal?: Json
          td1_provincial?: Json
          termination_date?: string | null
          union_id?: string | null
          updated_at?: string
          worksite_id: string
        }
        Update: {
          address?: Json
          banking_info_encrypted?: string | null
          cba_id?: string | null
          classification?: string | null
          company_id?: string
          cpp_exempt?: boolean
          created_at?: string
          ei_exempt?: boolean
          email?: string | null
          employee_number?: string
          first_name?: string
          hire_date?: string
          id?: string
          last_name?: string
          phone?: string | null
          province_code?: string
          sin_encrypted?: string | null
          status?: string
          step?: number | null
          td1_federal?: Json
          td1_provincial?: Json
          termination_date?: string | null
          union_id?: string | null
          updated_at?: string
          worksite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_cba_id_fkey"
            columns: ["cba_id"]
            isOneToOne: false
            referencedRelation: "cbas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_union_id_fkey"
            columns: ["union_id"]
            isOneToOne: false
            referencedRelation: "unions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_worksite_id_fkey"
            columns: ["worksite_id"]
            isOneToOne: false
            referencedRelation: "worksites"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_mappings: {
        Row: {
          account_number: string
          code_id: string
          code_type: string
          company_id: string
          cost_center: string | null
          created_at: string
          department_code: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_number: string
          code_id: string
          code_type: string
          company_id: string
          cost_center?: string | null
          created_at?: string
          department_code?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          code_id?: string
          code_type?: string
          company_id?: string
          cost_center?: string | null
          created_at?: string
          department_code?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_calendars: {
        Row: {
          company_id: string
          created_at: string
          frequency: string
          id: string
          pay_date: string
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          frequency: string
          id?: string
          pay_date: string
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          frequency?: string
          id?: string
          pay_date?: string
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_calendars_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_run_lines: {
        Row: {
          created_at: string
          deductions: Json
          earnings: Json
          employee_id: string
          employer_costs: Json
          gross_pay: number
          id: string
          net_pay: number
          pay_run_id: string
          taxable_income: number
          taxes: Json
          updated_at: string
          ytd_totals: Json
        }
        Insert: {
          created_at?: string
          deductions?: Json
          earnings?: Json
          employee_id: string
          employer_costs?: Json
          gross_pay?: number
          id?: string
          net_pay?: number
          pay_run_id: string
          taxable_income?: number
          taxes?: Json
          updated_at?: string
          ytd_totals?: Json
        }
        Update: {
          created_at?: string
          deductions?: Json
          earnings?: Json
          employee_id?: string
          employer_costs?: Json
          gross_pay?: number
          id?: string
          net_pay?: number
          pay_run_id?: string
          taxable_income?: number
          taxes?: Json
          updated_at?: string
          ytd_totals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pay_run_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_run_lines_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_runs: {
        Row: {
          company_id: string
          created_at: string
          employee_count: number
          id: string
          pay_calendar_id: string
          processed_at: string | null
          processed_by: string | null
          run_type: string
          status: string
          total_deductions: number
          total_gross_pay: number
          total_net_pay: number
          total_taxes: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_count?: number
          id?: string
          pay_calendar_id: string
          processed_at?: string | null
          processed_by?: string | null
          run_type?: string
          status?: string
          total_deductions?: number
          total_gross_pay?: number
          total_net_pay?: number
          total_taxes?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_count?: number
          id?: string
          pay_calendar_id?: string
          processed_at?: string | null
          processed_by?: string | null
          run_type?: string
          status?: string
          total_deductions?: number
          total_gross_pay?: number
          total_net_pay?: number
          total_taxes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_pay_calendar_id_fkey"
            columns: ["pay_calendar_id"]
            isOneToOne: false
            referencedRelation: "pay_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_locked_until: string | null
          avatar_url: string | null
          backup_codes: string[] | null
          company_id: string | null
          created_at: string
          email: string
          employee_id: string | null
          failed_login_attempts: number | null
          first_name: string
          id: string
          is_active: boolean
          last_2fa_verification: string | null
          last_login_at: string | null
          last_name: string
          permissions: Json
          phone: string | null
          role: string
          settings: Json
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_locked_until?: string | null
          avatar_url?: string | null
          backup_codes?: string[] | null
          company_id?: string | null
          created_at?: string
          email: string
          employee_id?: string | null
          failed_login_attempts?: number | null
          first_name: string
          id?: string
          is_active?: boolean
          last_2fa_verification?: string | null
          last_login_at?: string | null
          last_name: string
          permissions?: Json
          phone?: string | null
          role?: string
          settings?: Json
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_locked_until?: string | null
          avatar_url?: string | null
          backup_codes?: string[] | null
          company_id?: string | null
          created_at?: string
          email?: string
          employee_id?: string | null
          failed_login_attempts?: number | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_2fa_verification?: string | null
          last_login_at?: string | null
          last_name?: string
          permissions?: Json
          phone?: string | null
          role?: string
          settings?: Json
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      statutory_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          is_observed: boolean
          name: string
          province_code: string
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          is_observed?: boolean
          name: string
          province_code: string
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          is_observed?: boolean
          name?: string
          province_code?: string
        }
        Relationships: []
      }
      tax_rules: {
        Row: {
          basic_exemption: number
          brackets: Json
          created_at: string
          effective_end: string | null
          effective_start: string
          id: string
          is_active: boolean
          jurisdiction: string
          supplemental_rate: number | null
          tax_year: number
          updated_at: string
        }
        Insert: {
          basic_exemption?: number
          brackets?: Json
          created_at?: string
          effective_end?: string | null
          effective_start: string
          id?: string
          is_active?: boolean
          jurisdiction: string
          supplemental_rate?: number | null
          tax_year: number
          updated_at?: string
        }
        Update: {
          basic_exemption?: number
          brackets?: Json
          created_at?: string
          effective_end?: string | null
          effective_start?: string
          id?: string
          is_active?: boolean
          jurisdiction?: string
          supplemental_rate?: number | null
          tax_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      timesheet_approvals: {
        Row: {
          approval_note: string | null
          approved_at: string
          approved_by: string
          client_ip: string | null
          created_at: string
          employee_id: string
          id: string
          metadata: Json
          pay_period_end: string
          pay_period_start: string
          selected_days: Json
          total_ot_hours: number
          total_reg_hours: number
          total_sick_hours: number
          total_stat_hours: number
          total_vac_hours: number
          updated_at: string
        }
        Insert: {
          approval_note?: string | null
          approved_at?: string
          approved_by: string
          client_ip?: string | null
          created_at?: string
          employee_id: string
          id?: string
          metadata?: Json
          pay_period_end: string
          pay_period_start: string
          selected_days?: Json
          total_ot_hours?: number
          total_reg_hours?: number
          total_sick_hours?: number
          total_stat_hours?: number
          total_vac_hours?: number
          updated_at?: string
        }
        Update: {
          approval_note?: string | null
          approved_at?: string
          approved_by?: string
          client_ip?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          metadata?: Json
          pay_period_end?: string
          pay_period_start?: string
          selected_days?: Json
          total_ot_hours?: number
          total_reg_hours?: number
          total_sick_hours?: number
          total_stat_hours?: number
          total_vac_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_approvals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          hours_ot1: number
          hours_ot2: number
          hours_regular: number
          hours_stat: number
          id: string
          locked_at: string | null
          notes: string | null
          pay_calendar_id: string
          pay_period_end: string | null
          pay_period_start: string | null
          project_code: string | null
          status: string
          updated_at: string
          work_date: string
        }
        Insert: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          hours_ot1?: number
          hours_ot2?: number
          hours_regular?: number
          hours_stat?: number
          id?: string
          locked_at?: string | null
          notes?: string | null
          pay_calendar_id: string
          pay_period_end?: string | null
          pay_period_start?: string | null
          project_code?: string | null
          status?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          hours_ot1?: number
          hours_ot2?: number
          hours_regular?: number
          hours_stat?: number
          id?: string
          locked_at?: string | null
          notes?: string | null
          pay_calendar_id?: string
          pay_period_end?: string | null
          pay_period_start?: string | null
          project_code?: string | null
          status?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_pay_calendar_id_fkey"
            columns: ["pay_calendar_id"]
            isOneToOne: false
            referencedRelation: "pay_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      unions: {
        Row: {
          benefit_trust_rate: number | null
          company_id: string
          created_at: string
          dues_cap: number | null
          dues_rate: number | null
          dues_type: string
          id: string
          initiation_fee: number | null
          local_number: string | null
          name: string
          updated_at: string
        }
        Insert: {
          benefit_trust_rate?: number | null
          company_id: string
          created_at?: string
          dues_cap?: number | null
          dues_rate?: number | null
          dues_type?: string
          id?: string
          initiation_fee?: number | null
          local_number?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          benefit_trust_rate?: number | null
          company_id?: string
          created_at?: string
          dues_cap?: number | null
          dues_rate?: number | null
          dues_type?: string
          id?: string
          initiation_fee?: number | null
          local_number?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wcb_rules: {
        Row: {
          base_rate: number
          class_code: string
          created_at: string
          description: string
          effective_end: string | null
          effective_start: string
          id: string
          is_active: boolean
          max_assessable: number | null
          province_code: string
          updated_at: string
        }
        Insert: {
          base_rate: number
          class_code: string
          created_at?: string
          description: string
          effective_end?: string | null
          effective_start: string
          id?: string
          is_active?: boolean
          max_assessable?: number | null
          province_code: string
          updated_at?: string
        }
        Update: {
          base_rate?: number
          class_code?: string
          created_at?: string
          description?: string
          effective_end?: string | null
          effective_start?: string
          id?: string
          is_active?: boolean
          max_assessable?: number | null
          province_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      worksites: {
        Row: {
          address: Json
          company_id: string
          created_at: string
          eht_settings: Json
          id: string
          name: string
          province_code: string
          updated_at: string
          wcb_settings: Json
        }
        Insert: {
          address?: Json
          company_id: string
          created_at?: string
          eht_settings?: Json
          id?: string
          name: string
          province_code: string
          updated_at?: string
          wcb_settings?: Json
        }
        Update: {
          address?: Json
          company_id?: string
          created_at?: string
          eht_settings?: Json
          id?: string
          name?: string
          province_code?: string
          updated_at?: string
          wcb_settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "worksites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_timesheet: {
        Args: {
          p_approval_note: string
          p_employee_id: string
          p_end_date: string
          p_selected_days: Json
          p_start_date: string
          p_totals: Json
        }
        Returns: string
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_after_data?: Json
          p_before_data?: Json
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: string
      }
      get_current_user_company: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      log_sensitive_action: {
        Args: {
          action_type: string
          entity_id: string
          entity_type: string
          sensitive_fields?: Json
        }
        Returns: string
      }
      require_2fa_for_admin_action: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
