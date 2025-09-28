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
      balance_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          balance_type: string
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          pay_code: string | null
          reference_date: string
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          balance_type: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          pay_code?: string | null
          reference_date: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          balance_type?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          pay_code?: string | null
          reference_date?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
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
      cra_compliance_log: {
        Row: {
          company_id: string
          compliance_status: string
          compliance_type: string
          cra_confirmation: string | null
          created_at: string
          entity_id: string
          filed_at: string | null
          filed_by: string | null
          id: string
          updated_at: string
          validation_errors: Json | null
        }
        Insert: {
          company_id: string
          compliance_status?: string
          compliance_type: string
          cra_confirmation?: string | null
          created_at?: string
          entity_id: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          updated_at?: string
          validation_errors?: Json | null
        }
        Update: {
          company_id?: string
          compliance_status?: string
          compliance_type?: string
          cra_confirmation?: string | null
          created_at?: string
          entity_id?: string
          filed_at?: string | null
          filed_by?: string | null
          id?: string
          updated_at?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cra_compliance_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cra_filing_records: {
        Row: {
          company_id: string
          cra_confirmation_number: string | null
          created_at: string
          file_format: string
          file_path: string | null
          filed_at: string
          filed_by: string | null
          filing_type: string
          id: string
          period_end: string | null
          period_start: string | null
          submission_status: string
          tax_year: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          cra_confirmation_number?: string | null
          created_at?: string
          file_format: string
          file_path?: string | null
          filed_at?: string
          filed_by?: string | null
          filing_type: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          submission_status?: string
          tax_year?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          cra_confirmation_number?: string | null
          created_at?: string
          file_format?: string
          file_path?: string | null
          filed_at?: string
          filed_by?: string | null
          filing_type?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
          submission_status?: string
          tax_year?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cra_remittance_reports: {
        Row: {
          company_id: string
          created_at: string
          due_date: string
          generated_at: string
          generated_by: string | null
          id: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status: string
          submitted_at: string | null
          total_cpp_employee: number
          total_cpp_employer: number
          total_ei_employee: number
          total_ei_employer: number
          total_federal_tax: number
          total_provincial_tax: number
          total_remittance_due: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_period_end: string
          report_period_start: string
          report_type: string
          status?: string
          submitted_at?: string | null
          total_cpp_employee?: number
          total_cpp_employer?: number
          total_ei_employee?: number
          total_ei_employer?: number
          total_federal_tax?: number
          total_provincial_tax?: number
          total_remittance_due?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          status?: string
          submitted_at?: string | null
          total_cpp_employee?: number
          total_cpp_employer?: number
          total_ei_employee?: number
          total_ei_employer?: number
          total_federal_tax?: number
          total_provincial_tax?: number
          total_remittance_due?: number
          updated_at?: string
        }
        Relationships: []
      }
      cra_submissions: {
        Row: {
          company_id: string
          confirmation_number: string | null
          confirmed_at: string | null
          cra_reference_number: string | null
          created_at: string
          created_by: string | null
          csv_url: string | null
          details_json: Json
          employee_count: number | null
          errors_json: Json
          file_url: string | null
          id: string
          pdf_url: string | null
          status: string
          submission_type: string
          tax_year: number
          transmitted_at: string | null
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          company_id: string
          confirmation_number?: string | null
          confirmed_at?: string | null
          cra_reference_number?: string | null
          created_at?: string
          created_by?: string | null
          csv_url?: string | null
          details_json?: Json
          employee_count?: number | null
          errors_json?: Json
          file_url?: string | null
          id?: string
          pdf_url?: string | null
          status?: string
          submission_type: string
          tax_year: number
          transmitted_at?: string | null
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          company_id?: string
          confirmation_number?: string | null
          confirmed_at?: string | null
          cra_reference_number?: string | null
          created_at?: string
          created_by?: string | null
          csv_url?: string | null
          details_json?: Json
          employee_count?: number | null
          errors_json?: Json
          file_url?: string | null
          id?: string
          pdf_url?: string | null
          status?: string
          submission_type?: string
          tax_year?: number
          transmitted_at?: string | null
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cra_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cra_tax_tables: {
        Row: {
          created_at: string
          effective_end: string | null
          effective_start: string
          id: string
          income_from: number
          income_to: number
          is_active: boolean
          jurisdiction: string
          pay_period_type: string
          tax_amount: number
          tax_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_end?: string | null
          effective_start: string
          id?: string
          income_from: number
          income_to: number
          is_active?: boolean
          jurisdiction: string
          pay_period_type: string
          tax_amount: number
          tax_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_end?: string | null
          effective_start?: string
          id?: string
          income_from?: number
          income_to?: number
          is_active?: boolean
          jurisdiction?: string
          pay_period_type?: string
          tax_amount?: number
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
      device_employees: {
        Row: {
          active: boolean
          badge_id: string
          created_at: string
          device_serial: string
          employee_id: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_id: string
          created_at?: string
          device_serial: string
          employee_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_id?: string
          created_at?: string
          device_serial?: string
          employee_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          allowed_ips: string[] | null
          company_id: string
          created_at: string
          id: string
          last_heartbeat_at: string | null
          location: string
          name: string
          serial_number: string
          status: string
          timezone: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          allowed_ips?: string[] | null
          company_id: string
          created_at?: string
          id?: string
          last_heartbeat_at?: string | null
          location: string
          name: string
          serial_number: string
          status?: string
          timezone?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          allowed_ips?: string[] | null
          company_id?: string
          created_at?: string
          id?: string
          last_heartbeat_at?: string | null
          location?: string
          name?: string
          serial_number?: string
          status?: string
          timezone?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_company_id_fkey"
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
      employee_allowed_paycodes: {
        Row: {
          active: boolean
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          pay_code_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          pay_code_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          pay_code_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_allowed_paycodes_pay_code_id_fkey"
            columns: ["pay_code_id"]
            isOneToOne: false
            referencedRelation: "pay_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_balances: {
        Row: {
          accrued_balance: number
          balance_type: string
          created_at: string
          current_balance: number
          effective_date: string
          employee_id: string
          id: string
          notes: string | null
          policy_annual_accrual: number | null
          policy_max_balance: number | null
          policy_max_carryover: number | null
          updated_at: string
          used_balance: number
        }
        Insert: {
          accrued_balance?: number
          balance_type: string
          created_at?: string
          current_balance?: number
          effective_date?: string
          employee_id: string
          id?: string
          notes?: string | null
          policy_annual_accrual?: number | null
          policy_max_balance?: number | null
          policy_max_carryover?: number | null
          updated_at?: string
          used_balance?: number
        }
        Update: {
          accrued_balance?: number
          balance_type?: string
          created_at?: string
          current_balance?: number
          effective_date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          policy_annual_accrual?: number | null
          policy_max_balance?: number | null
          policy_max_carryover?: number | null
          updated_at?: string
          used_balance?: number
        }
        Relationships: []
      }
      employee_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          employee_id: string
          id: string
          name: string
          phone: string
          relationship: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          employee_id: string
          id?: string
          name: string
          phone: string
          relationship: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          employee_id?: string
          id?: string
          name?: string
          phone?: string
          relationship?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string | null
          doc_type: string
          downloaded_count: number | null
          employee_id: string
          file_size: number | null
          id: string
          last_downloaded_at: string | null
          last_downloaded_by: string | null
          mime_type: string | null
          original_filename: string
          storage_path: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          doc_type: string
          downloaded_count?: number | null
          employee_id: string
          file_size?: number | null
          id?: string
          last_downloaded_at?: string | null
          last_downloaded_by?: string | null
          mime_type?: string | null
          original_filename: string
          storage_path: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          doc_type?: string
          downloaded_count?: number | null
          employee_id?: string
          file_size?: number | null
          id?: string
          last_downloaded_at?: string | null
          last_downloaded_by?: string | null
          mime_type?: string | null
          original_filename?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_rates: {
        Row: {
          base_rate: number
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          rate_type: string
          updated_at: string
        }
        Insert: {
          base_rate: number
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          rate_type: string
          updated_at?: string
        }
        Update: {
          base_rate?: number
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          rate_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_year_end_summary: {
        Row: {
          created_at: string
          employee_id: string
          finalized_at: string | null
          id: string
          is_finalized: boolean
          other_deductions: Json
          other_income: Json
          tax_year: number
          total_cpp_contributions: number
          total_cpp_pensionable: number
          total_ei_insurable: number
          total_ei_premiums: number
          total_employment_income: number
          total_income_tax: number
          total_rpp_contributions: number
          total_union_dues: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          finalized_at?: string | null
          id?: string
          is_finalized?: boolean
          other_deductions?: Json
          other_income?: Json
          tax_year: number
          total_cpp_contributions?: number
          total_cpp_pensionable?: number
          total_ei_insurable?: number
          total_ei_premiums?: number
          total_employment_income?: number
          total_income_tax?: number
          total_rpp_contributions?: number
          total_union_dues?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          finalized_at?: string | null
          id?: string
          is_finalized?: boolean
          other_deductions?: Json
          other_income?: Json
          tax_year?: number
          total_cpp_contributions?: number
          total_cpp_pensionable?: number
          total_ei_insurable?: number
          total_ei_premiums?: number
          total_employment_income?: number
          total_income_tax?: number
          total_rpp_contributions?: number
          total_union_dues?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_year_end_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: Json
          banking_info_encrypted: string | null
          cba_id: string | null
          classification: string | null
          company_code: string | null
          company_id: string
          cpp_exempt: boolean
          created_at: string
          ei_exempt: boolean
          email: string | null
          employee_number: string
          first_name: string
          fte_hours_per_week: number | null
          gl_cost_center: string | null
          hire_date: string
          id: string
          last_name: string
          ot_multiplier: number | null
          overtime_eligible: boolean | null
          permit_expiry: string | null
          phone: string | null
          probation_end: string | null
          province_code: string
          reports_to_id: string | null
          seniority_date: string | null
          sin_encrypted: string | null
          status: string
          step: number | null
          td1_federal: Json
          td1_federal_status: string | null
          td1_provincial: Json
          td1_provincial_status: string | null
          termination_date: string | null
          union_id: string | null
          updated_at: string
          vacation_policy_id: string | null
          work_eligibility: string | null
          worksite_id: string
        }
        Insert: {
          address?: Json
          banking_info_encrypted?: string | null
          cba_id?: string | null
          classification?: string | null
          company_code?: string | null
          company_id: string
          cpp_exempt?: boolean
          created_at?: string
          ei_exempt?: boolean
          email?: string | null
          employee_number: string
          first_name: string
          fte_hours_per_week?: number | null
          gl_cost_center?: string | null
          hire_date: string
          id?: string
          last_name: string
          ot_multiplier?: number | null
          overtime_eligible?: boolean | null
          permit_expiry?: string | null
          phone?: string | null
          probation_end?: string | null
          province_code: string
          reports_to_id?: string | null
          seniority_date?: string | null
          sin_encrypted?: string | null
          status?: string
          step?: number | null
          td1_federal?: Json
          td1_federal_status?: string | null
          td1_provincial?: Json
          td1_provincial_status?: string | null
          termination_date?: string | null
          union_id?: string | null
          updated_at?: string
          vacation_policy_id?: string | null
          work_eligibility?: string | null
          worksite_id: string
        }
        Update: {
          address?: Json
          banking_info_encrypted?: string | null
          cba_id?: string | null
          classification?: string | null
          company_code?: string | null
          company_id?: string
          cpp_exempt?: boolean
          created_at?: string
          ei_exempt?: boolean
          email?: string | null
          employee_number?: string
          first_name?: string
          fte_hours_per_week?: number | null
          gl_cost_center?: string | null
          hire_date?: string
          id?: string
          last_name?: string
          ot_multiplier?: number | null
          overtime_eligible?: boolean | null
          permit_expiry?: string | null
          phone?: string | null
          probation_end?: string | null
          province_code?: string
          reports_to_id?: string | null
          seniority_date?: string | null
          sin_encrypted?: string | null
          status?: string
          step?: number | null
          td1_federal?: Json
          td1_federal_status?: string | null
          td1_provincial?: Json
          td1_provincial_status?: string | null
          termination_date?: string | null
          union_id?: string | null
          updated_at?: string
          vacation_policy_id?: string | null
          work_eligibility?: string | null
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
            foreignKeyName: "employees_reports_to_id_fkey"
            columns: ["reports_to_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          {
            foreignKeyName: "fk_employees_vacation_policy"
            columns: ["vacation_policy_id"]
            isOneToOne: false
            referencedRelation: "vacation_policies"
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
      import_logs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_rows: number | null
          errors: Json | null
          file_name: string
          file_path: string
          id: string
          import_type: string
          imported_by: string | null
          mapping: Json | null
          preview_data: Json | null
          processed_rows: number | null
          started_at: string | null
          status: string
          total_rows: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_rows?: number | null
          errors?: Json | null
          file_name: string
          file_path: string
          id?: string
          import_type: string
          imported_by?: string | null
          mapping?: Json | null
          preview_data?: Json | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_rows?: number | null
          errors?: Json | null
          file_name?: string
          file_path?: string
          id?: string
          import_type?: string
          imported_by?: string | null
          mapping?: Json | null
          preview_data?: Json | null
          processed_rows?: number | null
          started_at?: string | null
          status?: string
          total_rows?: number | null
          updated_at?: string
        }
        Relationships: []
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
      pay_code_gl_map: {
        Row: {
          code: string
          company_scope: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          gl_account: string
          id: string
          mapping_segment: string | null
          updated_at: string
        }
        Insert: {
          code: string
          company_scope?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          gl_account: string
          id?: string
          mapping_segment?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_scope?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          gl_account?: string
          id?: string
          mapping_segment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pay_codes: {
        Row: {
          active: boolean
          category: string
          code: string
          company_id: string
          created_at: string
          default_hourly_rate_source: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          gl_earnings_code: string | null
          id: string
          multiplier: number | null
          name: string
          province: string | null
          rate_type: string
          requires_amount: boolean
          requires_hours: boolean
          stackable: boolean
          taxable_flags: Json
          union_code: string | null
          updated_at: string
          worksite_id: string | null
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          company_id: string
          created_at?: string
          default_hourly_rate_source?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          gl_earnings_code?: string | null
          id?: string
          multiplier?: number | null
          name: string
          province?: string | null
          rate_type?: string
          requires_amount?: boolean
          requires_hours?: boolean
          stackable?: boolean
          taxable_flags?: Json
          union_code?: string | null
          updated_at?: string
          worksite_id?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          company_id?: string
          created_at?: string
          default_hourly_rate_source?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          gl_earnings_code?: string | null
          id?: string
          multiplier?: number | null
          name?: string
          province?: string | null
          rate_type?: string
          requires_amount?: boolean
          requires_hours?: boolean
          stackable?: boolean
          taxable_flags?: Json
          union_code?: string | null
          updated_at?: string
          worksite_id?: string | null
        }
        Relationships: []
      }
      pay_codes_master: {
        Row: {
          code: string
          company_scope: string
          created_at: string
          description: string
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          company_scope?: string
          created_at?: string
          description: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_scope?: string
          created_at?: string
          description?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
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
      paycode_cra_mapping: {
        Row: {
          box_description: string
          company_code: string
          company_id: string
          cost_center: string | null
          cra_box: string
          created_at: string
          deduction_code: string | null
          department_code: string | null
          effective_from: string
          effective_to: string | null
          flags_json: Json
          gl_account: string | null
          id: string
          is_active: boolean
          is_cpp_pensionable: boolean | null
          is_ei_insurable: boolean | null
          is_taxable_federal: boolean | null
          is_taxable_provincial: boolean | null
          is_vacation_eligible: boolean | null
          mapping_type: string
          pay_code: string
          updated_at: string
          version: number
        }
        Insert: {
          box_description: string
          company_code: string
          company_id: string
          cost_center?: string | null
          cra_box: string
          created_at?: string
          deduction_code?: string | null
          department_code?: string | null
          effective_from?: string
          effective_to?: string | null
          flags_json?: Json
          gl_account?: string | null
          id?: string
          is_active?: boolean
          is_cpp_pensionable?: boolean | null
          is_ei_insurable?: boolean | null
          is_taxable_federal?: boolean | null
          is_taxable_provincial?: boolean | null
          is_vacation_eligible?: boolean | null
          mapping_type: string
          pay_code: string
          updated_at?: string
          version?: number
        }
        Update: {
          box_description?: string
          company_code?: string
          company_id?: string
          cost_center?: string | null
          cra_box?: string
          created_at?: string
          deduction_code?: string | null
          department_code?: string | null
          effective_from?: string
          effective_to?: string | null
          flags_json?: Json
          gl_account?: string | null
          id?: string
          is_active?: boolean
          is_cpp_pensionable?: boolean | null
          is_ei_insurable?: boolean | null
          is_taxable_federal?: boolean | null
          is_taxable_provincial?: boolean | null
          is_vacation_eligible?: boolean | null
          mapping_type?: string
          pay_code?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "paycode_cra_mapping_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      punch_config: {
        Row: {
          company_id: string
          created_at: string
          daily_max_hours: number
          duplicate_window_seconds: number
          grace_in_minutes: number
          grace_out_minutes: number
          id: string
          lunch_auto_minutes: number
          rounding_interval_minutes: number
          updated_at: string
          webhook_enabled: boolean
          webhook_secret: string | null
          worksite_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          daily_max_hours?: number
          duplicate_window_seconds?: number
          grace_in_minutes?: number
          grace_out_minutes?: number
          id?: string
          lunch_auto_minutes?: number
          rounding_interval_minutes?: number
          updated_at?: string
          webhook_enabled?: boolean
          webhook_secret?: string | null
          worksite_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          daily_max_hours?: number
          duplicate_window_seconds?: number
          grace_in_minutes?: number
          grace_out_minutes?: number
          id?: string
          lunch_auto_minutes?: number
          rounding_interval_minutes?: number
          updated_at?: string
          webhook_enabled?: boolean
          webhook_secret?: string | null
          worksite_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_config_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_config_worksite_id_fkey"
            columns: ["worksite_id"]
            isOneToOne: false
            referencedRelation: "worksites"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_import_logs: {
        Row: {
          company_id: string
          errors: Json | null
          file_name: string
          id: string
          import_type: string
          imported_at: string
          imported_by: string | null
          rows_error: number
          rows_success: number
          rows_total: number
          status: string
          summary: Json | null
        }
        Insert: {
          company_id: string
          errors?: Json | null
          file_name: string
          id?: string
          import_type?: string
          imported_at?: string
          imported_by?: string | null
          rows_error?: number
          rows_success?: number
          rows_total?: number
          status?: string
          summary?: Json | null
        }
        Update: {
          company_id?: string
          errors?: Json | null
          file_name?: string
          id?: string
          import_type?: string
          imported_at?: string
          imported_by?: string | null
          rows_error?: number
          rows_success?: number
          rows_total?: number
          status?: string
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_import_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      punches: {
        Row: {
          badge_id: string
          company_id: string | null
          created_at: string
          deduped_hash: string | null
          device_serial: string
          direction: string
          employee_id: string | null
          id: string
          processed: boolean
          punch_timestamp: string
          raw_data: Json | null
          source: string
        }
        Insert: {
          badge_id: string
          company_id?: string | null
          created_at?: string
          deduped_hash?: string | null
          device_serial: string
          direction: string
          employee_id?: string | null
          id?: string
          processed?: boolean
          punch_timestamp: string
          raw_data?: Json | null
          source?: string
        }
        Update: {
          badge_id?: string
          company_id?: string | null
          created_at?: string
          deduped_hash?: string | null
          device_serial?: string
          direction?: string
          employee_id?: string | null
          id?: string
          processed?: boolean
          punch_timestamp?: string
          raw_data?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "punches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      remittance_periods: {
        Row: {
          company_id: string
          created_at: string
          due_date: string
          eft_file_url: string | null
          filed_date: string | null
          id: string
          paid_date: string | null
          pd7a_url: string | null
          period_end: string
          period_start: string
          period_type: string
          status: string
          total_cpp_employee: number
          total_cpp_employer: number
          total_ei_employee: number
          total_ei_employer: number
          total_income_tax: number
          total_remittance: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date: string
          eft_file_url?: string | null
          filed_date?: string | null
          id?: string
          paid_date?: string | null
          pd7a_url?: string | null
          period_end: string
          period_start: string
          period_type: string
          status?: string
          total_cpp_employee?: number
          total_cpp_employer?: number
          total_ei_employee?: number
          total_ei_employer?: number
          total_income_tax?: number
          total_remittance?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string
          eft_file_url?: string | null
          filed_date?: string | null
          id?: string
          paid_date?: string | null
          pd7a_url?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string
          total_cpp_employee?: number
          total_cpp_employer?: number
          total_ei_employee?: number
          total_ei_employer?: number
          total_income_tax?: number
          total_remittance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remittance_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      roe_slips: {
        Row: {
          comments: string | null
          company_id: string
          created_at: string
          employee_id: string
          final_pay_period_end: string
          first_day_worked: string
          generated_at: string
          id: string
          insurable_earnings: number
          insurable_hours: number
          last_day_worked: string
          other_monies: Json
          pay_period_details: Json
          payroll_reference_number: string | null
          reason_for_issuing: string
          roe_number: string
          serial_number: string | null
          status: string
          statutory_holiday_pay: number
          submitted_at: string | null
          total_insurable_earnings: number
          updated_at: string
          vacation_pay: number
        }
        Insert: {
          comments?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          final_pay_period_end: string
          first_day_worked: string
          generated_at?: string
          id?: string
          insurable_earnings?: number
          insurable_hours?: number
          last_day_worked: string
          other_monies?: Json
          pay_period_details?: Json
          payroll_reference_number?: string | null
          reason_for_issuing: string
          roe_number: string
          serial_number?: string | null
          status?: string
          statutory_holiday_pay?: number
          submitted_at?: string | null
          total_insurable_earnings?: number
          updated_at?: string
          vacation_pay?: number
        }
        Update: {
          comments?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          final_pay_period_end?: string
          first_day_worked?: string
          generated_at?: string
          id?: string
          insurable_earnings?: number
          insurable_hours?: number
          last_day_worked?: string
          other_monies?: Json
          pay_period_details?: Json
          payroll_reference_number?: string | null
          reason_for_issuing?: string
          roe_number?: string
          serial_number?: string | null
          status?: string
          statutory_holiday_pay?: number
          submitted_at?: string | null
          total_insurable_earnings?: number
          updated_at?: string
          vacation_pay?: number
        }
        Relationships: [
          {
            foreignKeyName: "roe_slips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roe_slips_employee_id_fkey"
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
      t4_box_mappings: {
        Row: {
          box_description: string
          calculation_method: string
          created_at: string
          deduction_code_id: string | null
          id: string
          is_active: boolean
          mapping_type: string
          pay_code_id: string | null
          t4_box: string
          updated_at: string
        }
        Insert: {
          box_description: string
          calculation_method?: string
          created_at?: string
          deduction_code_id?: string | null
          id?: string
          is_active?: boolean
          mapping_type: string
          pay_code_id?: string | null
          t4_box: string
          updated_at?: string
        }
        Update: {
          box_description?: string
          calculation_method?: string
          created_at?: string
          deduction_code_id?: string | null
          id?: string
          is_active?: boolean
          mapping_type?: string
          pay_code_id?: string | null
          t4_box?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "t4_box_mappings_deduction_code_id_fkey"
            columns: ["deduction_code_id"]
            isOneToOne: false
            referencedRelation: "deduction_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "t4_box_mappings_pay_code_id_fkey"
            columns: ["pay_code_id"]
            isOneToOne: false
            referencedRelation: "pay_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      t4_slips: {
        Row: {
          amendment_reason: string | null
          box_14_employment_income: number
          box_16_cpp_contributions: number
          box_17_cpp_pensionable_earnings: number
          box_18_ei_premiums: number
          box_19_ei_insurable_earnings: number
          box_22_income_tax_deducted: number
          box_24_ei_insurable_earnings: number
          box_26_cpp_pensionable_earnings: number
          box_44_union_dues: number
          box_46_charitable_donations: number
          box_50_rpps: number
          company_id: string
          created_at: string
          employee_id: string
          errors_json: Json | null
          generated_at: string
          generated_by: string | null
          id: string
          is_amended: boolean | null
          issued_at: string | null
          original_slip_id: string | null
          other_boxes: Json
          pdf_url: string | null
          status: string
          tax_year: number
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          amendment_reason?: string | null
          box_14_employment_income?: number
          box_16_cpp_contributions?: number
          box_17_cpp_pensionable_earnings?: number
          box_18_ei_premiums?: number
          box_19_ei_insurable_earnings?: number
          box_22_income_tax_deducted?: number
          box_24_ei_insurable_earnings?: number
          box_26_cpp_pensionable_earnings?: number
          box_44_union_dues?: number
          box_46_charitable_donations?: number
          box_50_rpps?: number
          company_id: string
          created_at?: string
          employee_id: string
          errors_json?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_amended?: boolean | null
          issued_at?: string | null
          original_slip_id?: string | null
          other_boxes?: Json
          pdf_url?: string | null
          status?: string
          tax_year: number
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          amendment_reason?: string | null
          box_14_employment_income?: number
          box_16_cpp_contributions?: number
          box_17_cpp_pensionable_earnings?: number
          box_18_ei_premiums?: number
          box_19_ei_insurable_earnings?: number
          box_22_income_tax_deducted?: number
          box_24_ei_insurable_earnings?: number
          box_26_cpp_pensionable_earnings?: number
          box_44_union_dues?: number
          box_46_charitable_donations?: number
          box_50_rpps?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          errors_json?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          is_amended?: boolean | null
          issued_at?: string | null
          original_slip_id?: string | null
          other_boxes?: Json
          pdf_url?: string | null
          status?: string
          tax_year?: number
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: []
      }
      t4a_slips: {
        Row: {
          amendment_reason: string | null
          box_20_self_employed_commissions: number
          box_22_income_tax_deducted: number
          box_48_fees_services: number
          company_id: string
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          issued_at: string | null
          original_slip_id: string | null
          other_boxes: Json
          recipient_address: Json
          recipient_name: string
          recipient_sin: string | null
          status: string
          tax_year: number
          updated_at: string
        }
        Insert: {
          amendment_reason?: string | null
          box_20_self_employed_commissions?: number
          box_22_income_tax_deducted?: number
          box_48_fees_services?: number
          company_id: string
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          issued_at?: string | null
          original_slip_id?: string | null
          other_boxes?: Json
          recipient_address?: Json
          recipient_name: string
          recipient_sin?: string | null
          status?: string
          tax_year: number
          updated_at?: string
        }
        Update: {
          amendment_reason?: string | null
          box_20_self_employed_commissions?: number
          box_22_income_tax_deducted?: number
          box_48_fees_services?: number
          company_id?: string
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          issued_at?: string | null
          original_slip_id?: string | null
          other_boxes?: Json
          recipient_address?: Json
          recipient_name?: string
          recipient_sin?: string | null
          status?: string
          tax_year?: number
          updated_at?: string
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
      vacation_policies: {
        Row: {
          accrual_rate_pct: number
          carryover_rules: Json | null
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          accrual_rate_pct: number
          carryover_rules?: Json | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          accrual_rate_pct?: number
          carryover_rules?: Json | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_policies_company_id_fkey"
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
      work_permit_reminders: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          permit_expiry: string
          reminder_type: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          permit_expiry: string
          reminder_type: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          permit_expiry?: string
          reminder_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_permit_reminders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      build_employee_year_end_summary: {
        Args: { p_employee_id: string; p_tax_year: number }
        Returns: string
      }
      calculate_cra_taxes: {
        Args: {
          gross_income: number
          jurisdiction: string
          pay_periods_per_year: number
          tax_year?: number
        }
        Returns: number
      }
      calculate_remittance_period_totals: {
        Args: {
          p_company_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: Json
      }
      can_admin_access_payroll_data: {
        Args: { p_employee_id: string }
        Returns: boolean
      }
      check_work_permit_expiry: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      generate_cra_remittance_report: {
        Args: {
          p_company_id: string
          p_period_end: string
          p_period_start: string
          p_report_type: string
        }
        Returns: string
      }
      generate_roe_number: {
        Args: Record<PropertyKey, never>
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
      log_payroll_access: {
        Args: { p_action: string; p_employee_id: string }
        Returns: undefined
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
