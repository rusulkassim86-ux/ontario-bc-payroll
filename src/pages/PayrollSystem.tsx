import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PayCycleImporter } from '@/components/payroll/PayCycleImporter';
import { PayCodesMasterPage } from '@/components/payroll/PayCodesMasterPage';
import { GLAccountManager } from '@/components/payroll/GLAccountManager';
import { CRARemittanceWidget } from '@/components/dashboard/CRARemittanceWidget';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Calendar, Users, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function PayrollSystem() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    payCycles: 0,
    employees: 0,
    earningCodes: 0,
    deductionCodes: 0,
    glAccounts: 0,
  });

  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchStats = async () => {
      try {
        const r1: any = await supabase.from('pay_cycles').select('id', { count: 'exact', head: true });
        const r2: any = await supabase.from('employees').select('id', { count: 'exact', head: true });
        const r3: any = await supabase.from('earning_codes').select('id', { count: 'exact', head: true });
        const r4: any = await supabase.from('deduction_codes').select('id', { count: 'exact', head: true });
        const r5: any = await supabase.from('gl_accounts').select('id', { count: 'exact', head: true });

        setStats({
          payCycles: r1.count || 0,
          employees: r2.count || 0,
          earningCodes: r3.count || 0,
          deductionCodes: r4.count || 0,
          glAccounts: r5.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [profile?.company_id]);

  const setupSteps = [
    {
      title: 'Pay Cycles Loaded',
      count: stats.payCycles,
      icon: Calendar,
      status: stats.payCycles > 0 ? 'complete' : 'pending',
    },
    {
      title: 'Employees Assigned',
      count: stats.employees,
      icon: Users,
      status: stats.employees > 0 ? 'complete' : 'pending',
    },
    {
      title: 'Pay Codes Configured',
      count: stats.earningCodes + stats.deductionCodes,
      icon: DollarSign,
      status: (stats.earningCodes + stats.deductionCodes) > 0 ? 'complete' : 'pending',
    },
    {
      title: 'GL Accounts Mapped',
      count: stats.glAccounts,
      icon: FileText,
      status: stats.glAccounts > 0 ? 'complete' : 'pending',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Payroll System"
          description="Integrated payroll management for 72S, 72R, and OZC"
        />

        {/* Setup Status Overview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Setup Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 border rounded-lg"
                >
                  <div className={`p-2 rounded-full ${step.status === 'complete' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <Icon className={`h-5 w-5 ${step.status === 'complete' ? 'text-green-600' : 'text-yellow-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{step.title}</p>
                      {step.status === 'complete' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <p className="text-2xl font-bold">{step.count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="pay-cycles" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pay-cycles">Pay Cycles</TabsTrigger>
            <TabsTrigger value="pay-codes">Pay Codes & GL</TabsTrigger>
            <TabsTrigger value="run-payroll">Run Payroll</TabsTrigger>
            <TabsTrigger value="cra">CRA Integration</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="pay-cycles" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Payroll Calendar Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Import pay cycles for 72S, 72R, and OZC. Use "ALL" in company_code to replicate across all companies.
                  </p>
                </div>
                <PayCycleImporter />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pay-codes" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Pay Codes & GL Mapping</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage earning and deduction codes with GL account mappings for proper accounting integration.
                  </p>
                </div>
                <GLAccountManager />
                <div className="pt-4">
                  <PayCodesMasterPage />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="run-payroll" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Payroll Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Process payroll for employees, calculate deductions, and generate GL exports.
                  </p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Navigate to the Payroll page to process payroll runs
                  </p>
                  <Button onClick={() => window.location.href = '/payroll'}>
                    Go to Payroll
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="cra" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">CRA Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage CRA remittances, T4 slips, and ROE submissions.
                  </p>
                </div>
                <CRARemittanceWidget />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Payroll Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate payroll registers, GL exports, and direct deposit files.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Payroll Register</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Detailed employee payroll breakdown
                    </p>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">GL Export</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Journal entries for accounting
                    </p>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Direct Deposit</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Bank upload file for payments
                    </p>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
