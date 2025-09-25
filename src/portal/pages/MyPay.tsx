import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Download, Eye, Calendar } from 'lucide-react';

export function MyPay() {
  // Mock pay stub data
  const payStubs = [
    { 
      id: '1', 
      date: '2024-12-01', 
      period: 'Nov 16 - Nov 30, 2024', 
      gross: 4247.82, 
      net: 3247.82,
      status: 'available'
    },
    { 
      id: '2', 
      date: '2024-11-15', 
      period: 'Nov 1 - Nov 15, 2024', 
      gross: 4125.00, 
      net: 3158.75,
      status: 'available'
    },
    { 
      id: '3', 
      date: '2024-11-01', 
      period: 'Oct 16 - Oct 31, 2024', 
      gross: 4380.50, 
      net: 3345.60,
      status: 'available'
    },
  ];

  const ytdSummary = {
    grossPay: 48567.82,
    netPay: 37124.56,
    taxDeductions: 8456.78,
    cppContributions: 1234.56,
    eiContributions: 567.89,
    otherDeductions: 1184.03
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Pay</h1>
          <p className="text-muted-foreground">
            View your pay stubs and year-to-date summary
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      {/* YTD Summary */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle>Year-to-Date Summary (2024)</CardTitle>
          <CardDescription>Your total earnings and deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${ytdSummary.grossPay.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">Gross Pay</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                ${ytdSummary.netPay.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">Net Pay</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ${ytdSummary.taxDeductions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">Tax Deductions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${ytdSummary.cppContributions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">CPP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${ytdSummary.eiContributions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">EI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                ${ytdSummary.otherDeductions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">Other</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pay Stubs */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle>Pay Stubs</CardTitle>
          <CardDescription>Download and view your recent pay stubs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payStubs.map((stub) => (
              <div key={stub.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Pay Period: {stub.period}</div>
                    <div className="text-sm text-muted-foreground">
                      Pay Date: {new Date(stub.date).toLocaleDateString('en-CA')}
                    </div>
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">
                        Gross: ${stub.gross.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="mx-2">•</span>
                      <span className="font-medium">
                        Net: ${stub.net.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Available</Badge>
                  <Button size="sm" variant="outline">
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}