import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function PunchConfig() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Punch Configuration" 
        description="Configure time clock and punch processing settings"
      />

      <div className="px-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please approve the database migration first to access punch configuration settings.
          </AlertDescription>
        </Alert>

        <div className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Timezone & Rounding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure timezone settings, punch rounding rules, and grace periods.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overtime Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Set daily and weekly overtime thresholds and calculation methods.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure webhook endpoints and security settings for real-time punch data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}