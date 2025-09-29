import { CalculatorProvider } from './CalculatorProvider';
import { ThirdPartyApiProvider } from './ThirdPartyApiProvider';
import { LocalCraProvider } from './LocalCraProvider';

export * from './CalculatorProvider';
export { LocalCraProvider } from './LocalCraProvider';
export { ThirdPartyApiProvider } from './ThirdPartyApiProvider';

export function getPayrollCalculator(): CalculatorProvider {
  const apiUrl = import.meta.env.VITE_PAYROLL_API_URL;
  const apiKey = import.meta.env.VITE_PAYROLL_API_KEY;
  
  if (apiUrl && apiKey) {
    console.log('Using third-party payroll API');
    return new ThirdPartyApiProvider(apiUrl, apiKey);
  }
  
  console.log('Using local CRA payroll calculator');
  return new LocalCraProvider();
}