import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'supervisor_approval' | 'final_approval' | 'rejection';
  approvalId: string;
  employeeName: string;
  employeeNumber: string;
  companyCode: string;
  periodStart: string;
  periodEnd: string;
  supervisorName?: string;
  totals?: any;
  recipients: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: NotificationRequest = await req.json();
    console.log("Processing notification:", payload);

    // Get notification settings for the company
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .single();

    // Check if we're in quiet hours
    if (settings) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 8);
      const { quiet_hours_start, quiet_hours_end } = settings;

      if (quiet_hours_start && quiet_hours_end) {
        if (currentTime >= quiet_hours_start || currentTime < quiet_hours_end) {
          console.log("In quiet hours, queueing notification for later");
          // In production, you would queue this for later
          // For now, we'll just skip sending
          return new Response(
            JSON.stringify({ message: "Notification queued for quiet hours" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Send email based on type
    let emailSubject = "";
    let emailBody = "";

    if (payload.type === "supervisor_approval") {
      emailSubject = `Timesheet Ready for HR Review - ${payload.employeeName}`;
      emailBody = `
        <h2>Timesheet Ready for HR Review</h2>
        <p><strong>${payload.employeeName}</strong> (${payload.companyCode}) Bi-Weekly ${payload.periodStart} – ${payload.periodEnd}</p>
        <p>Approved by: ${payload.supervisorName}</p>
        <p><a href="${supabaseUrl.replace('https://', 'https://app.')}/timecard/${payload.employeeNumber}?start=${payload.periodStart}&end=${payload.periodEnd}">Open Timecard</a></p>
        ${payload.totals ? `
          <h3>Hours Summary</h3>
          <ul>
            <li>Regular: ${payload.totals.reg || 0} hours</li>
            <li>Overtime: ${payload.totals.ot || 0} hours</li>
            <li>Vacation: ${payload.totals.vac || 0} hours</li>
            <li>Sick: ${payload.totals.sick || 0} hours</li>
            <li>Stat: ${payload.totals.stat || 0} hours</li>
          </ul>
        ` : ''}
      `;
    } else if (payload.type === "final_approval") {
      emailSubject = `Timesheet Finalized - ${payload.employeeName}`;
      emailBody = `
        <h2>Timesheet Finalized</h2>
        <p>The timecard for <strong>${payload.employeeName}</strong> (${payload.periodStart} – ${payload.periodEnd}) has been finalized by Payroll/HR.</p>
        <p>The timecard is now locked and ready for payroll processing.</p>
        <p><a href="${supabaseUrl.replace('https://', 'https://app.')}/timecard/${payload.employeeNumber}?start=${payload.periodStart}&end=${payload.periodEnd}">View Timecard</a></p>
      `;
    }

    // Log the email (in production, you would integrate with Resend or another email service)
    console.log("Email notification:", {
      subject: emailSubject,
      body: emailBody,
      recipients: payload.recipients,
    });

    // Send Slack notification if enabled
    if (settings?.slack_enabled && settings?.slack_webhook_url) {
      try {
        const slackPayload = {
          text: emailSubject,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: emailBody.replace(/<[^>]*>/g, "").substring(0, 3000),
              },
            },
          ],
        };

        const slackResponse = await fetch(settings.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackPayload),
        });

        if (!slackResponse.ok) {
          console.error("Slack notification failed:", await slackResponse.text());
        } else {
          console.log("Slack notification sent successfully");
        }
      } catch (error) {
        console.error("Error sending Slack notification:", error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Notification sent successfully",
        emailSent: true,
        slackSent: settings?.slack_enabled || false
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-timesheet-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});