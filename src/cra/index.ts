import { CRAProvider } from './provider';
import { ThirdPartyProvider } from './thirdPartyProvider';
import { EmployeeCRAInput, CRAResult } from './types';

// Simple LRU cache implementation
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize = 100;
  private ttl = 10 * 60 * 1000; // 10 minutes

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

const calculationCache = new LRUCache<CRAResult>();

function getCacheKey(input: EmployeeCRAInput): string {
  const { employeeId, grossPay, payFrequency, province, ytd, td1 } = input;
  return JSON.stringify({ employeeId, grossPay, payFrequency, province, ytd, td1 });
}

class CachedCRAProvider implements CRAProvider {
  constructor(private provider: CRAProvider) {}

  async ping() {
    return this.provider.ping();
  }

  async calculate(input: EmployeeCRAInput): Promise<CRAResult> {
    const cacheKey = getCacheKey(input);
    const cached = calculationCache.get(cacheKey);
    
    if (cached) {
      return {
        ...cached,
        meta: { ...cached.meta, source: 'cache' }
      };
    }

    const result = await this.provider.calculate(input);
    calculationCache.set(cacheKey, result);
    
    return result;
  }

  async generateT4(params: { year: number; employees: string[] }) {
    return this.provider.generateT4(params);
  }

  async generateROE(params: { employeeId: string; lastDayWorked: string; reason: string }) {
    return this.provider.generateROE(params);
  }
}

export function getCRAProvider(): CRAProvider {
  const hasApiConfig = import.meta.env.VITE_CRA_API_URL && import.meta.env.VITE_CRA_API_KEY;
  const enableFallback = import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === 'true';

  if (!hasApiConfig) {
    if (!enableFallback) {
      throw new Error('CRA API not configured and local fallback disabled');
    }
    // For now, throw error - we'll implement local fallback later if needed
    throw new Error('Local fallback not implemented yet');
  }

  return new CachedCRAProvider(new ThirdPartyProvider());
}

export * from './types';
export * from './provider';
export * from './audit';