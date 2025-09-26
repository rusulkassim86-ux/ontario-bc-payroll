import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, AlertTriangle, Calendar, DollarSign } from "lucide-react";
import { useCRAReports } from "@/hooks/useCRAReports";
import { useNavigate } from "react-router-dom";

export function CRARemittanceWidget() {
  const navigate = useNavigate();
  const { useRemittanceReports } = useCRAReports();
  const { data: reports, isLoading } = useRemittanceReports();

  // Get the next due remittance
  const nextDue = reports?.find(report => report.status === 'draft');
  const dueDate = nextDue ? new Date(nextDue.due_date) : null;
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            CRA Remittances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          CRA Remittances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextDue ? (
          <>
            <div className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <div>
                  <p className="font-medium text-sm">Next Remittance Due</p>
                  <p className="text-xs text-muted-foreground">
                    {nextDue.report_type === 'monthly' ? 'Monthly' : 'Quarterly'} period
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className={
                daysUntilDue && daysUntilDue <= 7 ? "bg-destructive/10 text-destructive border-destructive/20" :
                daysUntilDue && daysUntilDue <= 14 ? "bg-warning/10 text-warning border-warning/20" :
                "bg-accent/10 text-accent border-accent/20"
              }>
                {daysUntilDue ? `${daysUntilDue} days` : 'Due'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium">
                    {dueDate?.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-medium">
                    ${nextDue.total_remittance_due.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => navigate("/cra-remittances")}
              className="w-full"
              variant="outline"
            >
              View Remittances
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No pending remittances</p>
            <Button 
              onClick={() => navigate("/cra-remittances")}
              className="mt-2"
              variant="outline"
              size="sm"
            >
              View History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}