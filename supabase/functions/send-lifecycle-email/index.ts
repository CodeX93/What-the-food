// @ts-nocheck
// Standalone Edge Function to send lifecycle emails via MailerSend
// Events: signup | upgrade_premium | monthly_to_annual | downgrade

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAILERSEND_API_KEY = Deno.env.get("MAILERSEND_API_KEY");
const MAILERSEND_FROM_EMAIL = Deno.env.get("MAILERSEND_FROM_EMAIL") || "hi@odehahwal.com";
const MAILERSEND_FROM_NAME = Deno.env.get("MAILERSEND_FROM_NAME") || "WhatTheFood";
const TEMPLATE_SIGNUP = Deno.env.get("MAILERSEND_TEMPLATE_SIGNUP") || "jy7zpl9dw9pg5vx6";
const TEMPLATE_UPGRADE_PREMIUM = Deno.env.get("MAILERSEND_TEMPLATE_UPGRADE_PREMIUM") || "v69oxl5dxyz4785k";
const TEMPLATE_MONTHLY_TO_ANNUAL = Deno.env.get("MAILERSEND_TEMPLATE_MONTHLY_TO_ANNUAL") || "zr6ke4n67emlon12";
const TEMPLATE_DOWNGRADE = Deno.env.get("MAILERSEND_TEMPLATE_DOWNGRADE") || "";

const templateByEvent: Record<string, string> = {
  signup: TEMPLATE_SIGNUP,
  upgrade_premium: TEMPLATE_UPGRADE_PREMIUM,
  monthly_to_annual: TEMPLATE_MONTHLY_TO_ANNUAL,
  downgrade: TEMPLATE_DOWNGRADE,
};

async function sendMailerSendEmail(toEmail: string, templateId: string, data: Record<string, any> = {}) {
  if (!MAILERSEND_API_KEY) {
    console.warn("MAILERSEND_API_KEY not configured; skipping email send");
    return { skipped: true, reason: "missing_api_key" };
  }

  if (!templateId) {
    console.warn("No templateId for this event; skipping email send");
    return { skipped: true, reason: "missing_template" };
  }

  const payload = {
    from: {
      email: MAILERSEND_FROM_EMAIL,
      name: MAILERSEND_FROM_NAME,
    },
    to: [{ email: toEmail }],
    template_id: templateId,
    personalization: [
      {
        email: toEmail,
        data,
      },
    ],
  };

  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAILERSEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("MailerSend send failed:", res.status, errText);
    return { error: errText, status: res.status };
  }

  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const eventType: string = body?.event_type;
    const email: string = body?.email;
    const name: string | null = body?.name ?? null;
    const metadata = body?.metadata || {};
    const dryRun = body?.dry_run === true;

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!eventType || !templateByEvent[eventType]) {
      return new Response(JSON.stringify({ error: "invalid event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateId = templateByEvent[eventType];

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          event_type: eventType,
          email,
          template_id: templateId,
          metadata,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await sendMailerSendEmail(email, templateId, {
      name: name || "there",
      ...metadata,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-lifecycle-email error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
