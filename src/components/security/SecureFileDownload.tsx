import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { generateSignedUrl, AUDIT_EVENTS } from '@/lib/security';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface SecureFileDownloadProps {
  fileName: string;
  filePath: string;
  fileType: 'paystub' | 't4' | 'roe' | 'document';
  employeeId?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  requiresAuth?: boolean;
}

export function SecureFileDownload({
  fileName,
  filePath,
  fileType,
  employeeId,
  className = '',
  variant = 'default',
  size = 'default',
  showIcon = true,
  requiresAuth = true
}: SecureFileDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, profile } = useAuth();
  const { isRecentlyVerified, requiresTwoFactor } = useTwoFactor();
  
  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'payroll_admin';
  const isOwnFile = employeeId === profile?.employee_id;
  const needsRecentAuth = requiresAuth && requiresTwoFactor && !isRecentlyVerified;

  const canDownload = !requiresAuth || isAdmin || isOwnFile;

  const handleDownload = async () => {
    if (!canDownload) {
      setError('You do not have permission to download this file');
      return;
    }

    if (needsRecentAuth) {
      setError('Recent two-factor authentication verification required');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      // Log the download attempt
      await logDownloadAttempt(fileName, fileType, employeeId);

      // Generate signed URL for secure download
      const signedUrl = await generateSignedUrl(filePath, 3600); // 1 hour expiry
      
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = fileName;
      link.target = '_blank';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Log successful download
      await logDownloadSuccess(fileName, fileType, employeeId);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      
      // Log failed download
      await logDownloadFailure(fileName, fileType, employeeId, errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'paystub':
      case 't4':
      case 'roe':
        return <FileText className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  if (!canDownload) {
    return (
      <div className={className}>
        <Button variant="ghost" disabled className="text-muted-foreground">
          {showIcon && <Shield className="h-4 w-4 mr-2" />}
          Access Restricted
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={downloading || needsRecentAuth}
        className="relative"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            {showIcon && (
              <>
                {getFileIcon()}
                <span className="ml-2">Download</span>
              </>
            )}
            {!showIcon && 'Download'}
            {needsRecentAuth && <Shield className="h-3 w-3 ml-1 text-orange-500" />}
          </>
        )}
      </Button>
      
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {needsRecentAuth && (
        <Alert className="mt-2">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Recent 2FA verification required to download this file.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Audit logging functions
async function logDownloadAttempt(fileName: string, fileType: string, employeeId?: string) {
  try {
    await supabase.from('audit_logs').insert({
      action: 'FILE_DOWNLOAD_ATTEMPT',
      entity_type: 'document',
      entity_id: crypto.randomUUID(),
      metadata: {
        file_name: fileName,
        file_type: fileType,
        employee_id: employeeId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log download attempt:', error);
  }
}

async function logDownloadSuccess(fileName: string, fileType: string, employeeId?: string) {
  try {
    await supabase.from('audit_logs').insert({
      action: 'FILE_DOWNLOAD_SUCCESS',
      entity_type: 'document',
      entity_id: crypto.randomUUID(),
      metadata: {
        file_name: fileName,
        file_type: fileType,
        employee_id: employeeId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log download success:', error);
  }
}

async function logDownloadFailure(fileName: string, fileType: string, employeeId?: string, errorMessage?: string) {
  try {
    await supabase.from('audit_logs').insert({
      action: 'FILE_DOWNLOAD_FAILURE',
      entity_type: 'document',
      entity_id: crypto.randomUUID(),
      metadata: {
        file_name: fileName,
        file_type: fileType,
        employee_id: employeeId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log download failure:', error);
  }
}