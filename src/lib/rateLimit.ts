interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(identifier: string): string {
    return identifier;
  }

  public isAllowed(identifier: string): { allowed: boolean; resetTime?: number; remaining?: number } {
    const key = this.getKey(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Initialize or reset if window has passed
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      return {
        allowed: true,
        resetTime: this.store[key].resetTime,
        remaining: this.config.maxRequests - 1
      };
    }

    // Increment counter
    this.store[key].count++;

    const allowed = this.store[key].count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - this.store[key].count);

    return {
      allowed,
      resetTime: this.store[key].resetTime,
      remaining
    };
  }

  public getRemainingRequests(identifier: string): number {
    const key = this.getKey(identifier);
    const now = Date.now();

    if (!this.store[key] || this.store[key].resetTime < now) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - this.store[key].count);
  }

  public getResetTime(identifier: string): number | null {
    const key = this.getKey(identifier);
    return this.store[key]?.resetTime || null;
  }
}

// Pre-configured rate limiters for different endpoints
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 login attempts per 15 minutes
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 API requests per 15 minutes
});

export const sensitiveActionRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10 // 10 sensitive actions per hour
});

// Utility function to get client identifier
export function getClientIdentifier(request?: any): string {
  // In a real implementation, this would extract IP address from request headers
  // For client-side usage, we can use a combination of user agent and other factors
  if (typeof window !== 'undefined') {
    return btoa(navigator.userAgent + window.location.hostname).substring(0, 16);
  }
  
  // Server-side would use IP address
  return request?.ip || request?.headers?.['x-forwarded-for'] || 'anonymous';
}

// Higher-order function to wrap API calls with rate limiting
export function withRateLimit<T extends any[], R>(
  rateLimiter: RateLimiter,
  fn: (...args: T) => Promise<R>,
  identifier?: string
) {
  return async (...args: T): Promise<R> => {
    const clientId = identifier || getClientIdentifier();
    const result = rateLimiter.isAllowed(clientId);
    
    if (!result.allowed) {
      const error = new Error('Rate limit exceeded. Please try again later.');
      (error as any).code = 'RATE_LIMIT_EXCEEDED';
      (error as any).resetTime = result.resetTime;
      throw error;
    }
    
    try {
      return await fn(...args);
    } catch (error) {
      // On authentication errors, we might want to be more strict
      if (error instanceof Error && error.message.includes('Invalid credentials')) {
        // Additional rate limiting for failed auth attempts
        // This could trigger account lockout logic
      }
      throw error;
    }
  };
}