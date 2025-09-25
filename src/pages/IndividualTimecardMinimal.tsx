import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function IndividualTimecardMinimal() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const handleBackToTimesheets = () => {
    navigate('/timesheets');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Individual Timecard</h1>
        
        <p className="text-lg text-muted-foreground">
          Employee: <span className="font-mono font-semibold">{employeeId}</span>
        </p>

        <Button 
          onClick={handleBackToTimesheets}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Timesheets
        </Button>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            ✅ Route is working! Dynamic parameter captured: <code className="bg-background px-2 py-1 rounded">{employeeId}</code>
          </p>
        </div>
      </div>
    </div>
  );
}