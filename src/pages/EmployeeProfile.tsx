import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  DollarSign,
  FileText,
  History,
  Eye,
  EyeOff,
  Building2,
  User,
  CreditCard
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeRate {
  id: string;
  base_rate: number;
  rate_type: string;
  effective_from: string;
  effective_to?: string;
}

interface PayRunLine {
  id: string;
  gross_pay: number;
  net_pay: number;
  taxes: any;
  deductions: any;
  created_at: string;
  pay_run: {
    pay_calendar: {
      period_start: string;
      period_end: string;
    };
  };
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showSIN, setShowSIN] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Fetch employee details
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) throw new Error('Employee ID required');
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          reports_to:employees!employees_reports_to_id_fkey(
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch employee rates
  const { data: rates } = useQuery({
    queryKey: ['employee-rates', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('employee_rates')
        .select('*')
        .eq('employee_id', id)
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return data as EmployeeRate[];
    },
    enabled: !!id,
  });

  // Fetch pay history
  const { data: payHistory } = useQuery({
    queryKey: ['pay-history', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('pay_run_lines')
        .select(`
          *,
          pay_run:pay_runs(
            pay_calendar:pay_calendars(
              period_start,
              period_end
            )
          )
        `)
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as PayRunLine[];
    },
    enabled: !!id,
  });

  // Fetch year-end summary
  const { data: yearEndSummary } = useQuery({
    queryKey: ['year-end-summary', id],
    queryFn: async () => {
      if (!id) return null;
      
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('employee_year_end_summary')
        .select('*')
        .eq('employee_id', id)
        .eq('tax_year', currentYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!id,
  });

  const currentRate = rates?.[0];
  const latestPayStub = payHistory?.[0];

  if (employeeLoading || !employee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </Button>
        </div>
        <div className="text-center py-8">Loading employee profile...</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  const formatSIN = (sin?: string) => {
    if (!sin) return 'Not provided';
    if (!showSIN) return '***-***-' + sin.slice(-3);
    return sin.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/employees')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="text-lg">
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{employee.first_name} {employee.last_name}</h1>
              <p className="text-muted-foreground">ID: {employee.employee_number}</p>
            </div>
          </div>
        </div>
        <Button>
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{employee.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Building2 className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {employee.company_code?.startsWith('72S') ? 'Union' : 'Non-Union'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <DollarSign className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base Rate</p>
                <p className="font-medium">
                  {currentRate ? formatCurrency(currentRate.base_rate) : 'Not set'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <CreditCard className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Latest Gross</p>
                <p className="font-medium">
                  {latestPayStub ? formatCurrency(latestPayStub.gross_pay) : 'No pay history'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pay">Pay</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="t4">T4 Summary</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">First Name</label>
                    <p className="text-sm">{employee.first_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                    <p className="text-sm">{employee.last_name}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Employee ID</label>
                  <p className="text-sm font-mono">{employee.employee_number}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prefix Code</label>
                  <div className="flex items-center gap-2">
                    <Badge variant={employee.company_code?.startsWith('72S') ? 'default' : 'secondary'}>
                      {employee.company_code}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">SIN</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono">{formatSIN(employee.sin_encrypted)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSIN(!showSIN)}
                      className="h-6 w-6 p-0"
                    >
                      {showSIN ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Province</label>
                  <p className="text-sm">{employee.province_code}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hire Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{new Date(employee.hire_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {employee.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm">{employee.email}</p>
                    </div>
                  </div>
                )}

                {employee.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm">{employee.phone}</p>
                    </div>
                  </div>
                )}

                {employee.address && typeof employee.address === 'object' && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <p>{(employee.address as any).street}</p>
                        <p>{(employee.address as any).city}, {(employee.address as any).province}</p>
                        <p>{(employee.address as any).postal_code}</p>
                      </div>
                    </div>
                  </div>
                )}

                {employee.reports_to && Array.isArray(employee.reports_to) && employee.reports_to.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reports To</label>
                    <p className="text-sm">
                      {employee.reports_to[0].first_name} {employee.reports_to[0].last_name} 
                      <span className="text-muted-foreground ml-1">({employee.reports_to[0].employee_number})</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pay Tab */}
        <TabsContent value="pay" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pay Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pay Frequency</label>
                  <p className="text-sm">Biweekly</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Base Rate</label>
                  <p className="text-sm">
                    {currentRate ? (
                      <>
                        {formatCurrency(currentRate.base_rate)} 
                        <span className="text-muted-foreground ml-1">
                          ({currentRate.rate_type === 'hourly' ? 'hourly' : 'salary'})
                        </span>
                      </>
                    ) : (
                      'Not set'
                    )}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Latest Gross Pay</label>
                  <p className="text-sm">
                    {latestPayStub ? formatCurrency(latestPayStub.gross_pay) : 'No pay history'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Overtime Eligible</label>
                  <Badge variant={employee.overtime_eligible ? 'default' : 'secondary'}>
                    {employee.overtime_eligible ? 'Yes' : 'No'}
                  </Badge>
                </div>

                {employee.overtime_eligible && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">OT Multiplier</label>
                    <p className="text-sm">{employee.ot_multiplier}x</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>YTD Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {yearEndSummary ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Employment Income</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_employment_income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">CPP Pensionable</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_cpp_pensionable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">EI Insurable</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_ei_insurable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Income Tax</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_income_tax)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No YTD data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deductions Tab */}
        <TabsContent value="deductions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Deductions</CardTitle>
            </CardHeader>
            <CardContent>
              {latestPayStub ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CPP Contributions</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(latestPayStub.taxes?.cpp_employee || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">EI Premiums</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(latestPayStub.taxes?.ei_employee || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Federal Tax</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(latestPayStub.taxes?.federal_tax || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Provincial Tax</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(latestPayStub.taxes?.provincial_tax || 0)}
                    </span>
                  </div>
                  {employee.company_code?.startsWith('72S') && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Union Dues</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(latestPayStub.deductions?.union_dues || 0)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No deduction history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* T4 Summary Tab */}
        <TabsContent value="t4" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>T4 Summary (Current Year)</CardTitle>
            </CardHeader>
            <CardContent>
              {yearEndSummary ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Box 14 - Employment Income</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_employment_income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Box 16 - CPP Contributions</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_cpp_contributions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Box 18 - EI Premiums</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_ei_premiums)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Box 22 - Income Tax</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_income_tax)}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Box 24 - EI Insurable Earnings</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_ei_insurable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Box 26 - CPP Pensionable Earnings</span>
                      <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_cpp_pensionable)}</span>
                    </div>
                    {yearEndSummary.total_rpp_contributions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Box 20 - RPP Contributions</span>
                        <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_rpp_contributions)}</span>
                      </div>
                    )}
                    {yearEndSummary.total_union_dues > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Box 44 - Union Dues</span>
                        <span className="text-sm font-medium">{formatCurrency(yearEndSummary.total_union_dues)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No T4 data available for current year</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pay History</CardTitle>
            </CardHeader>
            <CardContent>
              {payHistory && payHistory.length > 0 ? (
                <div className="space-y-4">
                  {payHistory.map((pay) => (
                    <div key={pay.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {pay.pay_run.pay_calendar && 
                            `${new Date(pay.pay_run.pay_calendar.period_start).toLocaleDateString()} - ${new Date(pay.pay_run.pay_calendar.period_end).toLocaleDateString()}`
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Processed: {new Date(pay.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(pay.gross_pay)}</p>
                        <p className="text-sm text-muted-foreground">Gross Pay</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pay history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}