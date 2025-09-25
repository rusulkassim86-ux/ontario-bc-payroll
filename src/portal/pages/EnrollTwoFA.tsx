import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Smartphone, Key, CheckCircle, Copy } from 'lucide-react';

export function EnrollTwoFA() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes] = useState([
    'ABC123DEF',
    'GHI456JKL', 
    'MNO789PQR',
    'STU012VWX',
    'YZA345BCD'
  ]);

  const secretKey = 'JBSWY3DPEHPK3PXP';
  const qrCodeUrl = `otpauth://totp/Best%20Theratronics:user@example.com?secret=${secretKey}&issuer=Best%20Theratronics`;

  const handleVerification = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock verification
    if (verificationCode === '123456') {
      setStep(3);
    } else {
      alert('Invalid code. Try 123456 for demo.');
    }
  };

  const handleComplete = () => {
    navigate('/');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bt-muted via-bt-accent to-bt-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and branding */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="portal-brand text-2xl mb-2">Two-Factor Authentication</h1>
          <p className="text-muted-foreground">
            Add an extra layer of security to your account
          </p>
        </div>

        <Card className="portal-card">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Step 1: Install Authenticator App
                </CardTitle>
                <CardDescription>
                  Download an authenticator app to generate verification codes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm">Recommended authenticator apps:</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Google Authenticator</span>
                      <Badge variant="outline">Recommended</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Microsoft Authenticator</span>
                      <Badge variant="outline">Free</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">Authy</span>
                      <Badge variant="outline">Multi-device</Badge>
                    </div>
                  </div>
                </div>
                
                <Button onClick={() => setStep(2)} className="w-full">
                  I've Installed an App
                </Button>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Step 2: Add Your Account
                </CardTitle>
                <CardDescription>
                  Scan the QR code or enter the setup key manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📱</div>
                      <p className="text-sm text-muted-foreground">QR Code would appear here</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Can't scan? Enter this key manually:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-sm font-mono">{secretKey}</code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyToClipboard(secretKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleVerification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Enter Verification Code</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      className="text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                  
                  <Button type="submit" className="w-full">
                    Verify Code
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Setup Complete!
                </CardTitle>
                <CardDescription>
                  Save these backup codes in a safe place
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Important:</strong> Save these backup codes. You can use them to access your account if you lose your device.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Backup Codes</Label>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <code className="text-sm font-mono">{code}</code>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                    className="w-full"
                  >
                    Copy All Codes
                  </Button>
                </div>

                <Button onClick={handleComplete} className="w-full">
                  Complete Setup
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <Link to="/signin" className="text-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}