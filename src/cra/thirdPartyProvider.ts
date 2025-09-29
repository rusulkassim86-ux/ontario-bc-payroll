import { CRAProvider } from './provider';
import { EmployeeCRAInput, CRAResult, CRAConnectionStatus } from './types';
import { auditCRAOperation } from './audit';

export class ThirdPartyProvider implements CRAProvider {
  private apiUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    this.apiUrl = import.meta.env.VITE_CRA_API_URL || '';
    this.apiKey = import.meta.env.VITE_CRA_API_KEY || '';
    this.timeout = parseInt(import.meta.env.VITE_CRA_API_TIMEOUT_MS || '8000');
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private maskSIN(sin: string): string {
    if (!sin || sin.length < 9) return sin;
    return `XXX XXX ${sin.slice(-3)}`;
  }

  private async makeRequest(endpoint: string, data: any, operation: string, employeeId?: string): Promise<any> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    const requestData = {
      ...data,
      sin: data.sin ? this.maskSIN(data.sin) : undefined
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.text();
        
        if (employeeId) {
          await auditCRAOperation({
            employeeId,
            operation: operation as any,
            request: requestData,
            responseMeta: { status: response.status, requestId },
            status: response.status >= 500 ? 'error' : 'error',
            durationMs: duration,
            error: error,
          });
        }

        // Retry on 5xx errors
        if (response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s backoff
          return this.makeRequest(endpoint, data, operation, employeeId);
        }

        throw new Error(`CRA API Error (${response.status}): ${error}`);
      }

      const result = await response.json();
      
      if (employeeId) {
        await auditCRAOperation({
          employeeId,
          operation: operation as any,
          request: requestData,
          responseMeta: { status: response.status, requestId, ...result.meta },
          status: 'success',
          durationMs: duration,
        });
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (employeeId) {
        await auditCRAOperation({
          employeeId,
          operation: operation as any,
          request: requestData,
          responseMeta: { requestId },
          status: error.name === 'AbortError' ? 'timeout' : 'error',
          durationMs: duration,
          error: error.message,
        });
      }

      throw error;
    }
  }

  async ping(): Promise<CRAConnectionStatus> {
    try {
      if (!this.apiUrl || !this.apiKey) {
        return {
          connected: false,
          error: 'CRA API URL or Key not configured'
        };
      }

      const response = await this.makeRequest('/v1/ping', {}, 'ping');
      return {
        connected: true,
        apiUrl: this.apiUrl.replace(/(https?:\/\/)([^\/]+)(.*)/, '$1***$3'),
        year: response.year,
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  async calculate(input: EmployeeCRAInput): Promise<CRAResult> {
    const result = await this.makeRequest('/v1/calc', input, 'calc', input.employeeId);
    return {
      ...result,
      meta: { ...result.meta, source: 'api' }
    };
  }

  async generateT4(params: { year: number; employees: string[] }): Promise<{ fileUrl: string }> {
    return await this.makeRequest('/v1/t4', params, 't4');
  }

  async generateROE(params: { employeeId: string; lastDayWorked: string; reason: string }): Promise<{ fileUrl: string }> {
    return await this.makeRequest('/v1/roe', params, 'roe', params.employeeId);
  }
}