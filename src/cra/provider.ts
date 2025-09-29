import { EmployeeCRAInput, CRAResult, CRAConnectionStatus } from './types';

export interface CRAProvider {
  ping(): Promise<CRAConnectionStatus>;
  calculate(input: EmployeeCRAInput): Promise<CRAResult>;
  generateT4(params: { year: number; employees: string[] }): Promise<{ fileUrl: string }>;
  generateROE(params: { 
    employeeId: string; 
    lastDayWorked: string; 
    reason: string;
  }): Promise<{ fileUrl: string }>;
}