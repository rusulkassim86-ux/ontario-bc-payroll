import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FileCheck, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PendingApproval {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  approval_stage: string;
  total_reg_hours: number;
  total_ot_hours: number;
  supervisor_approved_at: string;
  supervisor_approved_by: string;
  employee: {
    first_name: string;
    last_name: string;
    employee_number: string;
    employee_group: string;
  };
  supervisor: {
    first_name: string;
    last_name: string;
  };
}

export default function PayrollInbox() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>("all");
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());

  const { data: pendingApprovals = [], isLoading } = useQuery({
    queryKey: ["pending-approvals", selectedCompanyCode],
    queryFn: async () => {
      let query = supabase
        .from("timesheet_approvals")
        .select(`
          *,
          employee:employees!employee_id(first_name, last_name, employee_number, employee_group),
          supervisor:profiles!supervisor_approved_by(first_name, last_name)
        `)
        .eq("approval_stage", "supervisor_approved")
        .order("supervisor_approved_at", { ascending: false });

      if (selectedCompanyCode !== "all") {
        query = query.eq("employee.employee_group", selectedCompanyCode);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[] as PendingApproval[];
    },
  });

  const handleSelectAll = () => {
    if (selectedApprovals.size === pendingApprovals.length) {
      setSelectedApprovals(new Set());
    } else {
      setSelectedApprovals(new Set(pendingApprovals.map((a) => a.id)));
    }
  };

  const handleSelectApproval = (id: string) => {
    const newSelected = new Set(selectedApprovals);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedApprovals(newSelected);
  };

  const handleBulkApprove = async () => {
    try {
      const approvals = Array.from(selectedApprovals);
      
      for (const approvalId of approvals) {
        const approval = pendingApprovals.find((a) => a.id === approvalId);
        if (!approval) continue;

        const { error } = await supabase.rpc("approve_timesheet_final", {
          p_employee_id: approval.employee_id,
          p_start_date: approval.pay_period_start,
          p_end_date: approval.pay_period_end,
          p_approval_note: "Bulk approved from Payroll Inbox",
        });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `${approvals.length} timecards approved and locked`,
      });

      setSelectedApprovals(new Set());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenTimecard = (approval: PendingApproval) => {
    navigate(
      `/timecard/${approval.employee.employee_number}?start=${approval.pay_period_start}&end=${approval.pay_period_end}`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll HR Inbox"
        description="Review and finalize timesheet approvals"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Final Approval</CardTitle>
              <CardDescription>
                Timecards approved by supervisors waiting for HR review
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedCompanyCode} onValueChange={setSelectedCompanyCode}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Company Code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="OZC">OZC</SelectItem>
                  <SelectItem value="72R">72R</SelectItem>
                  <SelectItem value="72S">72S</SelectItem>
                </SelectContent>
              </Select>
              {selectedApprovals.size > 0 && (
                <Button onClick={handleBulkApprove}>
                  Approve {selectedApprovals.size} Selected
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : pendingApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedApprovals.size === pendingApprovals.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedApprovals.has(approval.id)}
                    onCheckedChange={() => handleSelectApproval(approval.id)}
                  />
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {approval.employee.first_name} {approval.employee.last_name}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        #{approval.employee.employee_number}
                      </div>
                    </div>
                    <div>
                      <Badge variant="outline">{approval.employee.employee_group}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(approval.pay_period_start), "MMM dd")} -{" "}
                        {format(new Date(approval.pay_period_end), "MMM dd, yyyy")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm">
                        <span className="font-medium">REG:</span> {approval.total_reg_hours}h
                        {approval.total_ot_hours > 0 && (
                          <>
                            {" • "}
                            <span className="font-medium">OT:</span> {approval.total_ot_hours}h
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        By {approval.supervisor?.first_name} {approval.supervisor?.last_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenTimecard(approval)}
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}