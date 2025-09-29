import { CalculatorProvider, PayrollInput, PayrollResult } from './CalculatorProvider';
import { LocalCraProvider } from './LocalCraProvider';
import { toast } from '@/hooks/use-toast';

export class ThirdPartyApiProvider implements CalculatorProvider {
  private fallbackProvider = new LocalCraProvider();
  private apiUrl: string;
  private apiKey: string;
  
  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }
  
  async calculate(input: PayrollInput): Promise<PayrollResult> {
    try {
      const response = await this.callApi(input);
      return this.mapApiResponse(response, input);
    } catch (error) {
      console.error('Payroll API error, falling back to local calculator:', error);
      
      toast({
        variant: "destructive",
        title: "API Error",
        description: "Using local CRA calculator. Connect payroll API for production accuracy.",
      });
      
      return this.fallbackProvider.calculate(input);
    }
  }
  
  private async callApi(input: PayrollInput): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await fetch(`${this.apiUrl}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(input),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`API client error: ${response.status} ${response.statusText}`);
        }
        if (response.status >= 500) {
          throw new Error(`API server error: ${response.status} ${response.statusText}`);
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry once on network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Retrying API call...');
        const retryResponse = await fetch(`${this.apiUrl}/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(input),
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Retry failed: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        
        return await retryResponse.json();
      }
      
      throw error;
    }
  }
  
  private mapApiResponse(response: any, input: PayrollInput): PayrollResult {
    // Map vendor-specific response format to our standard PayrollResult
    // This would need to be customized based on the actual API provider
    return {
      netPay: response.netPay || response.net_pay || 0,
      deductions: {
        cpp: response.deductions?.cpp || response.cpp || 0,
        ei: response.deductions?.ei || response.ei || 0,
        fedTax: response.deductions?.federalTax || response.federal_tax || 0,
        provTax: response.deductions?.provincialTax || response.provincial_tax || 0,
        other: response.deductions?.other || {}
      },
      employerCosts: {
        ei: response.employerCosts?.ei || response.employer_ei || 0,
        cpp: response.employerCosts?.cpp || response.employer_cpp || 0,
        other: response.employerCosts?.other || {}
      },
      summary: {
        gross: response.summary?.gross || input.grossPay,
        taxableGross: response.summary?.taxableGross || response.taxable_gross || input.grossPay,
        payFrequency: input.payFrequency
      }
    };
  }
}