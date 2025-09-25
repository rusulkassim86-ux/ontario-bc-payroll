const API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:3001/api';

class PortalAPI {
  private baseURL: string;
  private csrfToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getCSRFToken(): Promise<string> {
    if (!this.csrfToken) {
      const response = await fetch(`${this.baseURL}/csrf-token`, {
        credentials: 'include',
      });
      const data = await response.json();
      this.csrfToken = data.token;
    }
    return this.csrfToken;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      try {
        const csrfToken = await this.getCSRFToken();
        config.headers = {
          ...config.headers,
          'X-CSRF-Token': csrfToken,
        };
      } catch (error) {
        console.warn('Failed to get CSRF token:', error);
      }
    }

    const response = await fetch(url, config);

    // Handle 401 responses by clearing CSRF token
    if (response.status === 401) {
      this.csrfToken = null;
    }

    return response;
  }

  async get(endpoint: string, options?: RequestInit): Promise<Response> {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async patch(endpoint: string, data?: any, options?: RequestInit): Promise<Response> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete(endpoint: string, options?: RequestInit): Promise<Response> {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // Utility method for downloading files
  async downloadFile(endpoint: string, filename?: string): Promise<void> {
    const response = await this.get(endpoint);
    
    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

export const portalApi = new PortalAPI(API_BASE_URL);