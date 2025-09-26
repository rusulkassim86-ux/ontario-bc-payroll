import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Calendar, DollarSign, Download, AlertTriangle, CheckCircle } from "lucide-react";

const mockRemittances = [
  {
    id: 1,
    period: "December 2024",
    dueDate: "January 15, 2025",
    status: "Pending",
    cppEmployee: 12847.50,
    cppEmployer: 12847.50,
    eiEmployee: 4928.75,
    eiEmployer: 6900.25,
    federalTax: 45670.80,
    provincialTax: 23847.90,
    total: 106842.70
  },
  {
    id: 2,
    period: "November 2024",
    dueDate: "December 15, 2024",
    status: "Submitted",
    cppEmployee: 11965.30,
    cppEmployer: 11965.30,
    eiEmployee: 4587.60,
    eiEmployer: 6422.64,
    federalTax: 42850.45,
    provincialTax: 22340.75,
    total: 100132.04
  }
];

export default function CRARemittances() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="CRA Remittances" 
        description="Manage Canada Revenue Agency remittance obligations"
        action={
          <Button className="bg-gradient-primary">
            <Download className="w-4 h-4 mr-2" />
            Export All Reports
          </Button>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Calendar className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Jan 15</p>
                  <p className="text-sm text-muted-foreground">Next Due Date</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">$106,843</p>
                  <p className="text-sm text-muted-foreground">Amount Due</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Receipt className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">1</p>
                  <p className="text-sm text-muted-foreground">Pending Remittances</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">Submitted YTD</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Remittance Alert */}
        <Card className="shadow-card border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium">December 2024 Remittance Due Soon</p>
                <p className="text-sm text-muted-foreground">
                  CRA remittance of $106,842.70 is due January 15, 2025 (8 days remaining)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download PD7A
                </Button>
                <Button size="sm" className="bg-warning text-warning-foreground">
                  Submit Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remittance History */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Remittance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>CPP Employee</TableHead>
                  <TableHead>CPP Employer</TableHead>
                  <TableHead>EI Employee</TableHead>
                  <TableHead>EI Employer</TableHead>
                  <TableHead>Federal Tax</TableHead>
                  <TableHead>Provincial Tax</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockRemittances.map((remittance) => (
                  <TableRow key={remittance.id}>
                    <TableCell className="font-medium">{remittance.period}</TableCell>
                    <TableCell>{remittance.dueDate}</TableCell>
                    <TableCell className="font-mono">${remittance.cppEmployee.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">${remittance.cppEmployer.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">${remittance.eiEmployee.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">${remittance.eiEmployer.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">${remittance.federalTax.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">${remittance.provincialTax.toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-bold">${remittance.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={remittance.status === 'Submitted' ? 'default' : 'secondary'} 
                        className={remittance.status === 'Submitted' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}
                      >
                        {remittance.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          PD7A
                        </Button>
                        {remittance.status === 'Pending' && (
                          <Button size="sm" className="bg-success text-success-foreground">
                            Submit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Remittance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>December 2024 Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <span className="font-medium">CPP Contributions</span>
                  <span className="font-mono font-bold">$25,695.00</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-accent/5 border border-accent/20 rounded-lg">
                  <span className="font-medium">EI Premiums</span>
                  <span className="font-mono font-bold">$11,829.00</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-success/5 border border-success/20 rounded-lg">
                  <span className="font-medium">Federal Income Tax</span>
                  <span className="font-mono font-bold">$45,670.80</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <span className="font-medium">Provincial Income Tax</span>
                  <span className="font-mono font-bold">$23,847.90</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border-2 border-primary">
                  <span className="font-bold text-lg">Total Remittance</span>
                  <span className="font-mono font-bold text-lg">$106,842.70</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">January 2025 Payroll Remittance</p>
                      <p className="text-sm text-muted-foreground">Monthly remittance</p>
                    </div>
                    <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                      Feb 15
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Q4 2024 T4 Filing</p>
                      <p className="text-sm text-muted-foreground">Annual T4 slips</p>
                    </div>
                    <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                      Feb 28
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">ROE Submissions</p>
                      <p className="text-sm text-muted-foreground">Record of Employment</p>
                    </div>
                    <Badge variant="default" className="bg-success/10 text-success border-success/20">
                      As Needed
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}