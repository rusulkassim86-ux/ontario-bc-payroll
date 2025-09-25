import { z } from 'zod';
import DOMPurify from 'dompurify';

// Input validation schemas
export const securitySchemas = {
  sin: z.string()
    .regex(/^\d{3}\s?\d{3}\s?\d{3}$/, 'Invalid SIN format')
    .transform(str => str.replace(/\s/g, '')), // Remove spaces
    
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email too long')
    .toLowerCase(),
    
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number')
    .max(20, 'Phone number too long'),
    
  name: z.string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
    
  bankAccount: z.string()
    .regex(/^\d{7,12}$/, 'Invalid bank account number')
    .max(12, 'Bank account number too long'),
    
  transitNumber: z.string()
    .regex(/^\d{5}$/, 'Transit number must be 5 digits'),
    
  institutionNumber: z.string()
    .regex(/^\d{3}$/, 'Institution number must be 3 digits'),
    
  postalCode: z.string()
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Invalid Canadian postal code')
    .transform(str => str.toUpperCase().replace(/\s|-/g, '')),
    
  amount: z.number()
    .min(0, 'Amount cannot be negative')
    .max(999999.99, 'Amount too large'),
    
  taxYear: z.number()
    .int()
    .min(2000, 'Invalid tax year')
    .max(new Date().getFullYear() + 1, 'Invalid tax year'),
    
  province: z.enum(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']),
    
  employeeNumber: z.string()
    .min(1, 'Employee number required')
    .max(20, 'Employee number too long')
    .regex(/^[A-Za-z0-9\-]+$/, 'Invalid employee number format'),
};

// PII masking functions
export const maskPII = {
  sin: (sin: string): string => {
    if (!sin || sin.length < 9) return '***-***-***';
    return `***-***-${sin.slice(-3)}`;
  },
  
  bankAccount: (account: string): string => {
    if (!account || account.length < 4) return '****';
    return `****${account.slice(-4)}`;
  },
  
  email: (email: string): string => {
    if (!email || !email.includes('@')) return '***@***.***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? `${local[0]}***${local.slice(-1)}` : '***';
    return `${maskedLocal}@${domain}`;
  },
  
  phone: (phone: string): string => {
    if (!phone || phone.length < 4) return '***-***-****';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-***-${cleaned.slice(-4)}`;
    }
    return '***-***-****';
  },
  
  name: (name: string): string => {
    if (!name) return '***';
    const parts = name.trim().split(' ');
    return parts.map(part => 
      part.length > 1 ? `${part[0]}***` : part
    ).join(' ');
  }
};

// Input sanitization
export const sanitizeInput = {
  html: (input: string): string => {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  },
  
  sql: (input: string): string => {
    // Remove common SQL injection patterns
    return input
      .replace(/['";\\]/g, '') // Remove quotes and backslashes
      .replace(/(--)|(\/\*)|(\*\/)/g, '') // Remove comment syntax
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, '') // Remove SQL keywords
      .trim();
  },
  
  filename: (filename: string): string => {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow alphanumeric, dots, underscores, hyphens
      .slice(0, 255); // Limit length
  },
  
  general: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
};

// Security headers configuration
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: In production, remove unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'"
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Rate limiting configuration
export const rateLimits = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    skipSuccessfulRequests: true
  },
  
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    skipSuccessfulRequests: false
  },
  
  sensitiveActions: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 sensitive actions per hour
    skipSuccessfulRequests: false
  }
};

// Audit event types
export const AUDIT_EVENTS = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET: 'PASSWORD_RESET',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // 2FA
  TWO_FA_ENABLED: 'TWO_FA_ENABLED',
  TWO_FA_DISABLED: 'TWO_FA_DISABLED',
  TWO_FA_VERIFIED: 'TWO_FA_VERIFIED',
  TWO_FA_FAILED: 'TWO_FA_FAILED',
  
  // Data access
  VIEW_EMPLOYEE_DATA: 'VIEW_EMPLOYEE_DATA',
  VIEW_PAYSTUB: 'VIEW_PAYSTUB',
  DOWNLOAD_T4: 'DOWNLOAD_T4',
  VIEW_BANKING_INFO: 'VIEW_BANKING_INFO',
  
  // Data modification
  UPDATE_EMPLOYEE: 'UPDATE_EMPLOYEE',
  UPDATE_BANKING: 'UPDATE_BANKING',
  UPDATE_SIN: 'UPDATE_SIN',
  PROCESS_PAYROLL: 'PROCESS_PAYROLL',
  
  // Administrative
  CREATE_USER: 'CREATE_USER',
  DELETE_USER: 'DELETE_USER',
  ROLE_CHANGE: 'ROLE_CHANGE',
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA',
  
  // System
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',
  SYSTEM_RESTORE: 'SYSTEM_RESTORE',
  CONFIG_CHANGE: 'CONFIG_CHANGE'
} as const;

export type AuditEvent = typeof AUDIT_EVENTS[keyof typeof AUDIT_EVENTS];

// Security validation function
export const validateSecureAction = (action: AuditEvent, userRole: string, requires2FA: boolean = false): boolean => {
  const adminActions = [
    AUDIT_EVENTS.PROCESS_PAYROLL,
    AUDIT_EVENTS.EXPORT_DATA,
    AUDIT_EVENTS.CREATE_USER,
    AUDIT_EVENTS.DELETE_USER,
    AUDIT_EVENTS.ROLE_CHANGE,
    AUDIT_EVENTS.SYSTEM_BACKUP,
    AUDIT_EVENTS.CONFIG_CHANGE
  ];
  
  const payrollAdminActions = [
    ...adminActions,
    AUDIT_EVENTS.UPDATE_BANKING,
    AUDIT_EVENTS.UPDATE_SIN,
    AUDIT_EVENTS.VIEW_BANKING_INFO
  ];
  
  // Check role permissions
  if (adminActions.includes(action as any) && userRole !== 'org_admin') {
    return false;
  }
  
  if (payrollAdminActions.includes(action as any) && !['org_admin', 'payroll_admin'].includes(userRole)) {
    return false;
  }
  
  // Check 2FA requirement for admin actions
  if (['org_admin', 'payroll_admin'].includes(userRole) && requires2FA && payrollAdminActions.includes(action as any)) {
    // This would be checked against the user's 2FA status in the calling code
    return true; // Let the calling code handle 2FA verification
  }
  
  return true;
};

// Generate signed URL for secure file access
export const generateSignedUrl = async (filePath: string, expiresIn: number = 3600): Promise<string> => {
  // This would integrate with your file storage service (Supabase Storage)
  // For now, return a placeholder that should be implemented with actual signing logic
  const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
  const signature = btoa(`${filePath}:${timestamp}`); // This should use proper HMAC signing
  
  return `/api/files/${encodeURIComponent(filePath)}?expires=${timestamp}&signature=${signature}`;
};

// Password strength validation
export const passwordSchema = z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => !/(.)\1{2,}/.test(password), 
    'Password cannot contain repeated characters'
  )
  .refine(
    (password) => !['password', '12345678', 'qwerty', 'admin'].some(common => 
      password.toLowerCase().includes(common)
    ),
    'Password cannot contain common words'
  );