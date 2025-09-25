import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { usePortalAuth } from '../auth/PortalAuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

export function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = usePortalAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await signIn(email, password, twoFactorCode);
      
      if (result.success) {
        navigate(from, { replace: true });
      } else if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      } else {
        setError(result.error || 'Login failed');
        setFailedAttempts(prev => prev + 1);
        
        // Clear sensitive fields on error
        setPassword('');
        if (requiresTwoFactor) {
          setTwoFactorCode('');
        }
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const showCaptcha = failedAttempts >= 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bt-muted via-bt-accent to-bt-muted p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and branding */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">BT</span>
          </div>
          <h1 className="portal-brand text-2xl mb-2">Best Theratronics Portal</h1>
          <p className="text-muted-foreground">
            {requiresTwoFactor ? 'Enter your two-factor authentication code' : 'Sign in to your employee portal'}
          </p>
        </div>

        <Card className="portal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {requiresTwoFactor && <Shield className="h-5 w-5" />}
              {requiresTwoFactor ? 'Two-Factor Authentication' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {requiresTwoFactor 
                ? 'Please enter the 6-digit code from your authenticator app'
                : 'Enter your credentials to access your portal'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!requiresTwoFactor ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@besttheratronics.ca"
                      required
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        disabled={loading}
                      />
                      <Label htmlFor="remember" className="text-sm">Remember me</Label>
                    </div>
                    <Link to="/reset-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">Authentication Code</Label>
                  <Input
                    id="twoFactorCode"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    required
                    autoComplete="one-time-code"
                    disabled={loading}
                    className="text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showCaptcha && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">Security verification required</p>
                  {/* CAPTCHA component would go here */}
                  <div className="h-16 bg-muted rounded flex items-center justify-center text-xs">
                    CAPTCHA Placeholder
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {requiresTwoFactor ? 'Verifying...' : 'Signing in...'}
                  </>
                ) : (
                  requiresTwoFactor ? 'Verify & Sign In' : 'Sign In'
                )}
              </Button>

              {requiresTwoFactor && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setRequiresTwoFactor(false);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  Back to login
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            Having trouble? Contact{' '}
            <a href="mailto:support@besttheratronics.ca" className="text-primary hover:underline">
              IT Support
            </a>
          </p>
          <p>© {new Date().getFullYear()} Best Theratronics Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}