// @ts-nocheck - Supabase Edge Functions (Deno)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAILERSEND_API_KEY = Deno.env.get('MAILERSEND_API_KEY');
const MAILERSEND_FROM_EMAIL = Deno.env.get('MAILERSEND_FROM_EMAIL') || 'hi@odehahwal.com';
const MAILERSEND_FROM_NAME = Deno.env.get('MAILERSEND_FROM_NAME') || 'WhatTheFood';
const TEMPLATE_SIGNUP = 'jy7zpl9dw9pg5vx6';

async function sendSignupEmail(email: string, fullName?: string | null) {
  try {
    if (!MAILERSEND_API_KEY) {
      console.warn('MAILERSEND_API_KEY not set; skipping signup email');
      return;
    }

    const payload = {
      from: {
        email: MAILERSEND_FROM_EMAIL,
        name: MAILERSEND_FROM_NAME,
      },
      to: [{ email }],
      template_id: TEMPLATE_SIGNUP,
      personalization: [
        {
          email,
          data: {
            name: fullName || 'there',
          },
        },
      ],
    };

    const res = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Signup email send failed:', res.status, errText);
    }
  } catch (err) {
    console.error('Signup email error:', err?.message || err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    // @ts-ignore
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRole) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const body = await req.json();
    const { userId, email, full_name, bio } = body || {};
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing userId or email' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Validate JWT belongs to this user
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (userErr || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Upsert via service role (bypass RLS)
    const admin = createClient(supabaseUrl, serviceRole);

    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({ id: userId, email, full_name: full_name || null, bio: bio || null }, { onConflict: 'id' });

    if (upsertError) {
      return new Response(JSON.stringify({ error: 'Failed to save profile', details: upsertError.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Send signup email
    await sendSignupEmail(email, full_name || null);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(e?.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});


