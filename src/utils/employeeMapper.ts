// Utility to convert between legacy and new Employee formats
import { Employee, LegacyEmployee } from '@/types/employee';

export function legacyToWorkforceEmployee(legacyEmployee: LegacyEmployee): Employee {
  return {
    id: legacyEmployee.id,
    firstName: legacyEmployee.first_name,
    lastName: legacyEmployee.last_name,
    preferredName: undefined,
    status: legacyEmployee.status === 'active' ? 'Active' as const : 
            legacyEmployee.status === 'inactive' ? 'Inactive' as const :
            legacyEmployee.status === 'terminated' ? 'Terminated' as const : 'Inactive' as const,
    avatarUrl: undefined,
    positionId: legacyEmployee.employee_number,
    sin: legacyEmployee.sin_encrypted || '',
    sinMasked: 'XXX XX3 575', // Mock masked format
    rehireDate: legacyEmployee.rehire_date,
    jobTitle: legacyEmployee.job_title || 'No Title',
    department: 'GLOBSALE', // Default department
    businessUnit: legacyEmployee.business_unit,
    location: legacyEmployee.location,
    benefitsEligibilityClass: legacyEmployee.benefits_eligibility_class,
    unionCode: legacyEmployee.union_code,
    unionLocal: legacyEmployee.union_local,
    homeDepartment: legacyEmployee.home_department,
    homeCostNumber: legacyEmployee.home_cost_number,
    reportsTo: legacyEmployee.manager ? `${legacyEmployee.manager.first_name} ${legacyEmployee.manager.last_name}` : undefined,
    positionStartDate: legacyEmployee.position_start_date,
    managementPosition: legacyEmployee.management_position || false,
    jobFunction: legacyEmployee.job_function,
    workerCategory: legacyEmployee.worker_category,
    payGrade: legacyEmployee.pay_grade,
    hireDate: legacyEmployee.hire_date,
    leaveReturnDate: legacyEmployee.leave_return_date,
    leaveReturnReason: legacyEmployee.leave_return_reason,
    rehireReason: legacyEmployee.rehire_reason,
    salary: legacyEmployee.salary,
    annualSalary: legacyEmployee.annual_salary,
    payFrequency: (legacyEmployee.pay_frequency as any) || 'biweekly',
    rate2: legacyEmployee.rate2,
    standardHours: legacyEmployee.standard_hours,
    premiumRateFactor: legacyEmployee.premium_rate_factor || 1.5,
    fte: legacyEmployee.fte || 1.0,
    assignedShift: legacyEmployee.assigned_shift || 'Day Shift',
    scheduledHours: legacyEmployee.scheduled_hours || 40,
    earlyRetirementDate: undefined,
    adjustedServiceDate: undefined,
    retirementDate: undefined,
    includeInPayroll: true,
    accrualDate: legacyEmployee.accrual_date,
    defaultStartTime: legacyEmployee.default_start_time || '09:00',
    defaultRequestHours: legacyEmployee.default_request_hours || 8,
    customFields: {},
    additionalEarnings: [],
    auditLog: [],
    createdAt: legacyEmployee.created_at,
    updatedAt: legacyEmployee.updated_at,
  };
}