import { useEffect } from 'react';

export function HTTPSEnforcer() {
  useEffect(() => {
    // Only enforce HTTPS in production
    if (process.env.NODE_ENV === 'production' && window.location.protocol !== 'https:') {
      // Redirect to HTTPS
      window.location.replace(window.location.href.replace(/^http:/, 'https:'));
    }
  }, []);

  return null;
}

// Security headers utility function
export function setSecurityHeaders() {
  // This would typically be handled by the server, but we can also set some via JavaScript
  if (typeof document !== 'undefined') {
    // Prevent the page from being embedded in frames
    if (window.top !== window.self) {
      window.top.location.href = window.self.location.href;
    }
    
    // Add security-related event listeners
    window.addEventListener('beforeunload', () => {
      // Clear sensitive data from memory on page unload
      if ('localStorage' in window) {
        // Don't clear everything, just sensitive temporary data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('temp_') || key.includes('cache_')) {
            localStorage.removeItem(key);
          }
        });
      }
    });
  }
}

// Initialize security measures
export function initializeSecurity() {
  setSecurityHeaders();
  
  // Add CSP violation reporting
  if (typeof document !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.warn('CSP Violation:', {
        directive: event.violatedDirective,
        blocked: event.blockedURI,
        source: event.sourceFile,
        line: event.lineNumber
      });
      
      // In production, report to your logging service
      if (process.env.NODE_ENV === 'production') {
        fetch('/api/security/csp-violation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directive: event.violatedDirective,
            blocked: event.blockedURI,
            source: event.sourceFile,
            line: event.lineNumber,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {
          // Silently fail if reporting endpoint is not available
        });
      }
    });
  }
}