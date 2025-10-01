import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("company_id", profile?.company_id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const [formData, setFormData] = useState({
    email_enabled: settings?.email_enabled ?? true,
    slack_enabled: settings?.slack_enabled ?? false,
    slack_webhook_url: settings?.slack_webhook_url ?? "",
    payroll_emails: settings?.payroll_emails ?? [],
    quiet_hours_start: settings?.quiet_hours_start ?? "21:00:00",
    quiet_hours_end: settings?.quiet_hours_end ?? "07:00:00",
  });

  const [newEmail, setNewEmail] = useState("");

  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      if (!profile?.company_id) throw new Error("No company ID");

      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          company_id: profile.company_id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast({
        title: "Success",
        description: "Notification settings updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  const handleAddEmail = () => {
    if (newEmail && !formData.payroll_emails.includes(newEmail)) {
      setFormData({
        ...formData,
        payroll_emails: [...formData.payroll_emails, newEmail],
      });
      setNewEmail("");
    }
  };

  const handleRemoveEmail = (email: string) => {
    setFormData({
      ...formData,
      payroll_emails: formData.payroll_emails.filter((e) => e !== email),
    });
  };

  if (profile?.role !== "org_admin" && profile?.role !== "payroll_admin") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Notification Settings"
          description="Configure notification preferences"
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Only administrators can manage notification settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Settings"
        description="Configure notification preferences for timesheet approvals"
      />

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Configure email notifications for timesheet approval events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email notifications for approval events
              </p>
            </div>
            <Switch
              checked={formData.email_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, email_enabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Payroll Email Recipients</Label>
            <p className="text-sm text-muted-foreground">
              Email addresses that will receive approval notifications
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button onClick={handleAddEmail}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.payroll_emails.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveEmail(email)}
                >
                  {email} ×
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Quiet Hours</Label>
            <p className="text-sm text-muted-foreground">
              Emails won't be sent during these hours (will queue for morning)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  value={formData.quiet_hours_start}
                  onChange={(e) =>
                    setFormData({ ...formData, quiet_hours_start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  value={formData.quiet_hours_end}
                  onChange={(e) =>
                    setFormData({ ...formData, quiet_hours_end: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slack Integration (Optional)</CardTitle>
          <CardDescription>
            Post approval notifications to a Slack channel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Slack Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications to Slack webhook
              </p>
            </div>
            <Switch
              checked={formData.slack_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, slack_enabled: checked })
              }
            />
          </div>

          {formData.slack_enabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Slack Webhook URL</Label>
                <Input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={formData.slack_webhook_url}
                  onChange={(e) =>
                    setFormData({ ...formData, slack_webhook_url: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Create a webhook URL in your Slack workspace settings
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}