import { useState } from 'react';
import { usePortalAuth } from '../auth/PortalAuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Shield, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export function Profile() {
  const { user, profile } = usePortalAuth();
  const [showBankingDetails, setShowBankingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Mock profile data
  const mockProfile = {
    firstName: profile?.first_name || 'John',
    lastName: profile?.last_name || 'Smith',
    email: user?.email || 'john.smith@besttheratronics.ca',
    phone: '(416) 555-0123',
    address: {
      street: '123 Main Street',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5V 3A8'
    },
    banking: {
      institution: '001',
      transit: '12345',
      account: '****7890',
      verified: true
    },
    taxInfo: {
      federalClaim: 13808,
      provincialClaim: 11141,
      additionalTax: 0
    },
    twoFactorEnabled: false // Will be connected to actual profile data later
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and settings
          </p>
        </div>
        <Button 
          variant={isEditing ? "default" : "outline"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your basic contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={mockProfile.firstName}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={mockProfile.lastName}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={mockProfile.email}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Contact IT to change your email address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={mockProfile.phone}
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
            <CardDescription>Your home address on file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={mockProfile.address.street}
                disabled={!isEditing}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={mockProfile.address.city}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value={mockProfile.address.province}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={mockProfile.address.postalCode}
                disabled={!isEditing}
                className="uppercase"
              />
            </div>
          </CardContent>
        </Card>

        {/* Banking Information */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Banking Information
            </CardTitle>
            <CardDescription>Direct deposit details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action Required:</strong> Please update your banking information by December 10th to avoid pay delays.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Account Details</Label>
                {mockProfile.banking.verified && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBankingDetails(!showBankingDetails)}
              >
                {showBankingDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {showBankingDetails ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution Number</Label>
                    <Input
                      id="institution"
                      value={mockProfile.banking.institution}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transit">Transit Number</Label>
                    <Input
                      id="transit"
                      value={mockProfile.banking.transit}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account">Account Number</Label>
                  <Input
                    id="account"
                    value="1234567890"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                Banking details are hidden for security
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="portal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={mockProfile.twoFactorEnabled ? "default" : "secondary"}>
                  {mockProfile.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
                <Button variant="outline" size="sm">
                  {mockProfile.twoFactorEnabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Password</div>
                <div className="text-sm text-muted-foreground">
                  Last changed 45 days ago
                </div>
              </div>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tax Information */}
        <Card className="portal-card md:col-span-2">
          <CardHeader>
            <CardTitle>Tax Information (TD1)</CardTitle>
            <CardDescription>Your federal and provincial tax claim amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-medium">Federal Tax Credits</h4>
                <div className="space-y-2">
                  <Label htmlFor="federalClaim">Basic Personal Amount</Label>
                  <Input
                    id="federalClaim"
                    value={`$${mockProfile.taxInfo.federalClaim.toLocaleString('en-CA')}`}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Provincial Tax Credits (ON)</h4>
                <div className="space-y-2">
                  <Label htmlFor="provincialClaim">Basic Personal Amount</Label>
                  <Input
                    id="provincialClaim"
                    value={`$${mockProfile.taxInfo.provincialClaim.toLocaleString('en-CA')}`}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="additionalTax">Additional Tax per Pay Period</Label>
                <Input
                  id="additionalTax"
                  value={`$${mockProfile.taxInfo.additionalTax.toFixed(2)}`}
                  disabled={!isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  Extra amount to deduct from each pay for income tax
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}