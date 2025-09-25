import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  MapPin, 
  FileText, 
  Shield, 
  Plus,
  Edit,
  Save
} from "lucide-react";

export default function Company() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Company Setup" 
        description="Configure your company information and worksites"
        action={
          <Button className="bg-gradient-primary">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Company Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold">Best Theratronics Inc.</p>
                  <p className="text-sm text-muted-foreground">Legal Entity</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <MapPin className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold">2</p>
                  <p className="text-sm text-muted-foreground">Active Worksites</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Shield className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold">Compliant</p>
                  <p className="text-sm text-muted-foreground">ON & BC Registered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Setup Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General Info</TabsTrigger>
            <TabsTrigger value="worksites">Worksites</TabsTrigger>
            <TabsTrigger value="payroll">Payroll Settings</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Name</Label>
                    <Input id="legalName" defaultValue="Best Theratronics Inc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operatingName">Operating Name</Label>
                    <Input id="operatingName" defaultValue="Best Theratronics" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessNumber">CRA Business Number</Label>
                    <Input id="businessNumber" defaultValue="123456789RP0001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payrollAccount">Payroll Account</Label>
                    <Input id="payrollAccount" defaultValue="123456789RP0001" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Mailing Address</Label>
                    <Input id="address" defaultValue="123 Main Street" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" defaultValue="Toronto" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Input id="province" defaultValue="Ontario" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal">Postal Code</Label>
                    <Input id="postal" defaultValue="M5V 3A8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="worksites" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Worksites</CardTitle>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Worksite
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-primary/50 text-primary">ON</Badge>
                        <h3 className="font-semibold">Toronto Main</h3>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p>123 Main St, Toronto, ON M5V 3A8</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">WSIB Account</p>
                        <p>12345678</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">EHT Rate</p>
                        <p>1.95%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Employees</p>
                        <p>189</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-accent/50 text-accent">BC</Badge>
                        <h3 className="font-semibold">Vancouver Office</h3>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Address</p>
                        <p>456 Pacific Ave, Vancouver, BC V6B 2P2</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">WorkSafeBC Account</p>
                        <p>87654321</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">EHT Rate</p>
                        <p>1.95%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Employees</p>
                        <p>58</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payroll">
            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Pay Period Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Configure pay period schedules for different worksites and unions
                  </p>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Pay Period
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Payroll Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payFreq">Pay Frequency</Label>
                      <Input id="payFreq" defaultValue="Bi-weekly" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="remitterType">Remitter Type</Label>
                      <Input id="remitterType" defaultValue="Regular (Monthly)" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiscalYear">Fiscal Year End</Label>
                      <Input id="fiscalYear" defaultValue="December 31" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultGL">Default GL Account</Label>
                      <Input id="defaultGL" defaultValue="5000 - Wages & Salaries" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="compliance">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <div>
                        <p className="font-medium">CRA Payroll Account</p>
                        <p className="text-sm text-muted-foreground">Active and registered</p>
                      </div>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <div>
                        <p className="font-medium">WSIB (Ontario)</p>
                        <p className="text-sm text-muted-foreground">Account #12345678</p>
                      </div>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/20">Compliant</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <div>
                        <p className="font-medium">WorkSafeBC</p>
                        <p className="text-sm text-muted-foreground">Account #87654321</p>
                      </div>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/20">Compliant</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <div>
                        <p className="font-medium">EHT Registration</p>
                        <p className="text-sm text-muted-foreground">Annual review due March 2025</p>
                      </div>
                    </div>
                    <Badge className="bg-warning/10 text-warning border-warning/20">Review Due</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}