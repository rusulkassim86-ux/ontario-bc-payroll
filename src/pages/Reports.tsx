import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Users,
  PieChart
} from "lucide-react";

const reportCategories = [
  {
    title: "Payroll Reports",
    icon: DollarSign,
    reports: [
      { name: "Payroll Register", description: "Detailed payroll breakdown by employee", frequency: "Per pay period" },
      { name: "Deduction Register", description: "All deductions summary", frequency: "Per pay period" },
      { name: "Earnings Summary", description: "Gross earnings by category", frequency: "Monthly" },
      { name: "Year-to-Date Summary", description: "YTD totals by employee", frequency: "Monthly" }
    ]
  },
  {
    title: "Tax & Compliance",
    icon: FileText,
    reports: [
      { name: "CRA Remittance Report", description: "Federal & provincial tax summary", frequency: "Monthly" },
      { name: "T4 Summary", description: "Annual T4 preparation", frequency: "Annually" },
      { name: "ROE Report", description: "Records of Employment", frequency: "As needed" },
      { name: "EHT Summary", description: "Employer Health Tax (ON & BC)", frequency: "Annually" }
    ]
  },
  {
    title: "Union Reports",
    icon: Users,
    reports: [
      { name: "Union Dues Remittance", description: "Dues collected by union", frequency: "Monthly" },
      { name: "Union Member Roster", description: "Active union members", frequency: "Monthly" },
      { name: "CBA Compliance", description: "Collective agreement adherence", frequency: "Quarterly" },
      { name: "Apprentice Progress", description: "Apprenticeship tracking", frequency: "Quarterly" }
    ]
  },
  {
    title: "Workers' Compensation",
    icon: BarChart3,
    reports: [
      { name: "WSIB Premium Report", description: "Ontario assessable earnings", frequency: "Quarterly" },
      { name: "WorkSafeBC Report", description: "BC assessable earnings", frequency: "Quarterly" },
      { name: "Claims Summary", description: "Active claims tracking", frequency: "Monthly" },
      { name: "Safety Performance", description: "Workplace injury metrics", frequency: "Quarterly" }
    ]
  }
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports" 
        description="Generate payroll and compliance reports"
        action={
          <Button className="bg-gradient-primary">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Report Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">47</p>
                  <p className="text-sm text-muted-foreground">Reports Generated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-sm text-muted-foreground">Due This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <PieChart className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-sm text-muted-foreground">Compliance Due</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Categories */}
        <Tabs defaultValue="payroll" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="compliance">Tax & Compliance</TabsTrigger>
            <TabsTrigger value="union">Union</TabsTrigger>
            <TabsTrigger value="wcb">Workers' Comp</TabsTrigger>
          </TabsList>
          
          {reportCategories.map((category, index) => (
            <TabsContent key={category.title} value={index === 0 ? "payroll" : index === 1 ? "compliance" : index === 2 ? "union" : "wcb"}>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="w-5 h-5 text-primary" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.reports.map((report) => (
                      <div key={report.name} className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground">{report.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {report.frequency}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {report.description}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <FileText className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          <Button size="sm" className="bg-primary">
                            <Download className="w-3 h-3 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Recent Reports */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium">Payroll Register - Dec 16-29, 2024</p>
                    <p className="text-sm text-muted-foreground">Generated Dec 20, 2024 at 2:30 PM</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Complete
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  <div>
                    <p className="font-medium">WSIB Premium Report - Q4 2024</p>
                    <p className="text-sm text-muted-foreground">Generated Dec 18, 2024 at 11:15 AM</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Complete
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-warning" />
                  <div>
                    <p className="font-medium">Union Dues Remittance - November 2024</p>
                    <p className="text-sm text-muted-foreground">Generated Dec 15, 2024 at 4:45 PM</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Complete
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}