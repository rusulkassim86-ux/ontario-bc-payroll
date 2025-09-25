import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Clock, 
  Webhook, 
  RefreshCw, 
  Upload, 
  Shield,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PunchConfig {
  id: string;
  company_id: string;
  timezone: string;
  rounding_minutes: number;
  grace_minutes: number;
  auto_break_threshold_hours: number;
  auto_break_minutes: number;
  ot_threshold_daily: number;
  ot_threshold_weekly: number;
  webhook_enabled: boolean;
  webhook_secret: string;
  polling_enabled: boolean;
  polling_interval_minutes: number;
  csv_watch_enabled: boolean;
}

export default function PunchConfig() {
  const [config, setConfig] = useState<PunchConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

      const { data, error } = await supabase
        .from('punch_config')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Create default config
        const { data: newConfig, error: createError } = await supabase
          .from('punch_config')
          .insert({
            company_id: profile.company_id,
            timezone: 'America/Toronto',
            rounding_minutes: 5,
            grace_minutes: 7,
            auto_break_threshold_hours: 5.0,
            auto_break_minutes: 30,
            ot_threshold_daily: 8.0,
            ot_threshold_weekly: 40.0,
            webhook_enabled: false,
            webhook_secret: generateWebhookSecret(),
            polling_enabled: false,
            polling_interval_minutes: 2,
            csv_watch_enabled: false
          })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig);
      } else {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: "Error",
        description: "Failed to load punch configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateWebhookSecret = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('punch_config')
        .update(config)
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration saved successfully.",
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const regenerateWebhookSecret = () => {
    if (!config) return;
    
    setConfig({
      ...config,
      webhook_secret: generateWebhookSecret()
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Punch Clock Configuration" description="Loading..." />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="space-y-6">
        <PageHeader title="Punch Clock Configuration" description="Configuration not found" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Punch Clock Configuration" 
        description="Configure time tracking, punch processing, and integration settings"
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        }
      />

      <div className="px-6 space-y-6">
        <Tabs defaultValue="time-rules">
          <TabsList>
            <TabsTrigger value="time-rules">Time Rules</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="time-rules">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Time Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Basic Time Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timezone">Company Timezone</Label>
                    <Select 
                      value={config.timezone}
                      onValueChange={(value) => setConfig({...config, timezone: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Toronto">Eastern Time (Toronto)</SelectItem>
                        <SelectItem value="America/Vancouver">Pacific Time (Vancouver)</SelectItem>
                        <SelectItem value="America/Edmonton">Mountain Time (Edmonton)</SelectItem>
                        <SelectItem value="America/Winnipeg">Central Time (Winnipeg)</SelectItem>
                        <SelectItem value="America/Halifax">Atlantic Time (Halifax)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="rounding">Punch Rounding (minutes)</Label>
                    <Select 
                      value={config.rounding_minutes.toString()}
                      onValueChange={(value) => setConfig({...config, rounding_minutes: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Punches will be rounded to the nearest interval
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="grace">Grace Period (minutes)</Label>
                    <Input
                      id="grace"
                      type="number"
                      value={config.grace_minutes}
                      onChange={(e) => setConfig({...config, grace_minutes: parseInt(e.target.value) || 0})}
                      min="0"
                      max="30"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Allow employees to punch in/out within this window without penalty
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Break and Overtime Rules */}
              <Card>
                <CardHeader>
                  <CardTitle>Break & Overtime Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="break-threshold">Auto-Break Threshold (hours)</Label>
                    <Input
                      id="break-threshold"
                      type="number"
                      step="0.5"
                      value={config.auto_break_threshold_hours}
                      onChange={(e) => setConfig({...config, auto_break_threshold_hours: parseFloat(e.target.value) || 0})}
                      min="0"
                      max="12"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically deduct break time for shifts longer than this
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="break-minutes">Auto-Break Duration (minutes)</Label>
                    <Input
                      id="break-minutes"
                      type="number"
                      value={config.auto_break_minutes}
                      onChange={(e) => setConfig({...config, auto_break_minutes: parseInt(e.target.value) || 0})}
                      min="0"
                      max="120"
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="ot-daily">Daily OT Threshold (hours)</Label>
                    <Input
                      id="ot-daily"
                      type="number"
                      step="0.5"
                      value={config.ot_threshold_daily}
                      onChange={(e) => setConfig({...config, ot_threshold_daily: parseFloat(e.target.value) || 0})}
                      min="0"
                      max="24"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ot-weekly">Weekly OT Threshold (hours)</Label>
                    <Input
                      id="ot-weekly"
                      type="number"
                      step="0.5"
                      value={config.ot_threshold_weekly}
                      onChange={(e) => setConfig({...config, ot_threshold_weekly: parseFloat(e.target.value) || 0})}
                      min="0"
                      max="168"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integration">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Webhook Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    Webhook Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="webhook-enabled">Enable Webhook</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive real-time punch data from devices
                      </p>
                    </div>
                    <Switch
                      id="webhook-enabled"
                      checked={config.webhook_enabled}
                      onCheckedChange={(checked) => setConfig({...config, webhook_enabled: checked})}
                    />
                  </div>

                  {config.webhook_enabled && (
                    <>
                      <div>
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="webhook-url"
                            value={`${window.location.origin}/functions/v1/punches-webhook`}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/functions/v1/punches-webhook`)}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="webhook-secret">Webhook Secret</Label>
                        <div className="flex gap-2">
                          <Input
                            id="webhook-secret"
                            type="password"
                            value={config.webhook_secret}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={regenerateWebhookSecret}
                          >
                            Regenerate
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Used to verify webhook requests (HMAC SHA-256)
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Polling & CSV Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Polling & CSV Import
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="polling-enabled">Enable Polling</Label>
                      <p className="text-sm text-muted-foreground">
                        Periodically fetch data from device API
                      </p>
                    </div>
                    <Switch
                      id="polling-enabled"
                      checked={config.polling_enabled}
                      onCheckedChange={(checked) => setConfig({...config, polling_enabled: checked})}
                    />
                  </div>

                  {config.polling_enabled && (
                    <div>
                      <Label htmlFor="polling-interval">Polling Interval</Label>
                      <Select 
                        value={config.polling_interval_minutes.toString()}
                        onValueChange={(value) => setConfig({...config, polling_interval_minutes: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Every 1 minute</SelectItem>
                          <SelectItem value="2">Every 2 minutes</SelectItem>
                          <SelectItem value="5">Every 5 minutes</SelectItem>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="csv-enabled">CSV Watch Folder</Label>
                      <p className="text-sm text-muted-foreground">
                        Monitor folder for CSV files to import
                      </p>
                    </div>
                    <Switch
                      id="csv-enabled"
                      checked={config.csv_watch_enabled}
                      onCheckedChange={(checked) => setConfig({...config, csv_watch_enabled: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monitoring">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Webhook Endpoint</span>
                    <Badge variant={config.webhook_enabled ? "default" : "secondary"}>
                      {config.webhook_enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Polling Service</span>
                    <Badge variant={config.polling_enabled ? "default" : "secondary"}>
                      {config.polling_enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>CSV Processing</span>
                    <Badge variant={config.csv_watch_enabled ? "default" : "secondary"}>
                      {config.csv_watch_enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Health Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Health Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Last Webhook</span>
                    <span className="text-sm text-muted-foreground">2 min ago</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <Badge variant="success">0.1%</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Devices Online</span>
                    <Badge variant="default">3/4</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test Webhook
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    View Logs
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}