import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function PunchFeed() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Punch Feed & Exceptions" 
        description="View real-time punch data and handle exceptions"
      />

      <div className="px-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please approve the database migration first to view punch data and exceptions.
          </AlertDescription>
        </Alert>

        <div className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Punch Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Real-time view of punch data from connected devices.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exception Handling</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Review and resolve punch exceptions like missing OUT punches or duplicates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}