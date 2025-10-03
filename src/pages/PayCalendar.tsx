import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Upload, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, isWithinInterval } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const COMPANY_CODES = ['72S', '72R', 'OZC'] as const;

interface PayCycle {
  id: string;
  company_code: string;
  week_number: number;
  in_date: string;
  out_date: string;
  pay_date: string;
  period_start: string;
  period_end: string;
  status: string;
  is_current: boolean;
}

export default function PayCalendar() {
  const { profile } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string>('72S');
  const [uploading, setUploading] = useState(false);

  const { data: payCycles = [], isLoading, refetch } = useQuery<PayCycle[]>({
    queryKey: ['pay-cycles', selectedCompany],
    queryFn: async (): Promise<PayCycle[]> => {
      const { data, error } = await supabase
        .from('pay_cycles')
        .select('*')
        .eq('company_code', selectedCompany)
        .order('period_start', { ascending: false });
      
      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!profile,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'csv') {
        // Handle CSV
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, i) => {
            row[header] = values[i]?.trim() || '';
          });
          return row;
        });

        const { data: result, error } = await supabase.functions.invoke('import-pay-cycles', {
          body: { rows }
        });

        if (error) throw error;

        toast.success(
          `✓ Imported ${result.inserted} pay cycles\n${result.warnings?.length > 0 ? `⚠ ${result.warnings.length} warnings` : ''}`,
          { duration: 5000 }
        );
        
        if (result.warnings?.length > 0) {
          console.warn('Import warnings:', result.warnings);
        }

        refetch();
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Handle Excel
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames.includes('PayCycle') 
          ? 'PayCycle' 
          : workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const { data: result, error } = await supabase.functions.invoke('import-pay-cycles', {
          body: { rows: jsonData }
        });

        if (error) throw error;

        const summary = [
          `✓ Inserted: ${result.inserted}`,
          result.skipped > 0 ? `⊘ Skipped: ${result.skipped}` : '',
          result.warnings?.length > 0 ? `⚠ Warnings: ${result.warnings.length}` : ''
        ].filter(Boolean).join('\n');

        toast.success(summary, { duration: 5000 });

        if (result.warnings?.length > 0) {
          console.warn('Import warnings:', result.warnings);
          result.warnings.forEach((w: string) => console.warn(w));
        }

        refetch();
      } else {
        throw new Error('Please upload a CSV or Excel (.xlsx, .xls) file');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.error || error.message || 'Failed to upload pay cycles');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getCurrentCycle = () => {
    const today = new Date();
    return payCycles.find(cycle => 
      isWithinInterval(today, { 
        start: parseISO(cycle.period_start), 
        end: parseISO(cycle.period_end) 
      })
    );
  };

  const currentCycle = getCurrentCycle();

  const getDaysUntil = (date: string) => {
    return differenceInDays(parseISO(date), new Date());
  };

  return (
    <AppLayout>
      <PageHeader
        title="Pay Calendar"
        description="Manage pay cycles for 72S, 72R, and OZC"
      />

      <div className="p-6 space-y-6">
        {/* Current Cycle Banner */}
        {currentCycle && (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Current Pay Cycle - {selectedCompany}
                  </CardTitle>
                  <CardDescription>
                    Week {currentCycle.week_number} | {format(parseISO(currentCycle.period_start), 'MMM d')} - {format(parseISO(currentCycle.period_end), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Time In Date</p>
                  <p className="text-lg font-semibold">{format(parseISO(currentCycle.in_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{getDaysUntil(currentCycle.in_date)} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Out Date</p>
                  <p className="text-lg font-semibold">{format(parseISO(currentCycle.out_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{getDaysUntil(currentCycle.out_date)} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pay Date</p>
                  <p className="text-lg font-semibold">{format(parseISO(currentCycle.pay_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{getDaysUntil(currentCycle.pay_date)} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pay Cycles</CardTitle>
                <CardDescription>View and manage pay cycles by company code</CardDescription>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pay-cycle-upload"
                  disabled={uploading}
                />
                <label htmlFor="pay-cycle-upload">
                  <Button asChild disabled={uploading}>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Import Pay Cycles'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCompany} onValueChange={setSelectedCompany}>
              <TabsList>
                {COMPANY_CODES.map(code => (
                  <TabsTrigger key={code} value={code}>
                    {code}
                  </TabsTrigger>
                ))}
              </TabsList>

              {COMPANY_CODES.map(code => (
                <TabsContent key={code} value={code} className="mt-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : payCycles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No pay cycles found for {code}</p>
                      <p className="text-sm mt-1">Upload a pay cycle file to get started</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week #</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>In Date</TableHead>
                          <TableHead>Out Date</TableHead>
                          <TableHead>Pay Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payCycles.map((cycle) => {
                          const isCurrent = isWithinInterval(new Date(), {
                            start: parseISO(cycle.period_start),
                            end: parseISO(cycle.period_end)
                          });

                          return (
                            <TableRow key={cycle.id} className={isCurrent ? 'bg-primary/5' : ''}>
                              <TableCell className="font-medium">{cycle.week_number}</TableCell>
                              <TableCell>
                                {format(parseISO(cycle.period_start), 'MMM d')} - {format(parseISO(cycle.period_end), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>{format(parseISO(cycle.in_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>{format(parseISO(cycle.out_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>{format(parseISO(cycle.pay_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>
                                {isCurrent ? (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Current Cycle
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">{cycle.status}</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
