import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

const UNREGISTERED_LIMIT = 1; // Guest users: 1 scan lifetime
const REGISTERED_LIFETIME_LIMIT = 3; // Free users: 3 scans lifetime
const REGISTERED_FREE_DAYS = 3; // Free users: 3 days from account creation
const PREMIUM_UNLIMITED = -1; // -1 indicates unlimited scans for premium users
const SESSION_COOKIE = "wtf_free_scan_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type FreeScanRecord = Database["public"]["Tables"]["free_scan_sessions"]["Row"];

type FreeScanResponse = {
  type: "registered" | "unregistered";
  remaining: number; // -1 means unlimited (for premium users)
};

function createJsonResponse(data: FreeScanResponse, init?: Parameters<typeof NextResponse.json>[1]) {
  return NextResponse.json(data, init);
}

/**
 * Check if 3 days have passed since account creation
 */
function hasFreePeriodExpired(accountCreatedAt: string): boolean {
  const created = new Date(accountCreatedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= REGISTERED_FREE_DAYS;
}

/**
 * Check if user has active premium subscription (monthly or yearly)
 */
async function hasPremiumSubscription(userId: string): Promise<boolean> {
  try {
    const { data, error } = await adminClient
      .from("platform_subscriptions")
      .select("subscription_type, is_active, billing_cycle")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error checking premium subscription:", error);
      return false;
    }

    return data?.subscription_type === "premium" && data?.is_active === true;
  } catch (error) {
    console.error("Error checking premium subscription:", error);
    return false;
  }
}

async function getUnregisteredRecord(sessionId: string): Promise<FreeScanRecord> {
  const { data, error } = await adminClient
    .from("free_scan_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await adminClient
    .from("free_scan_sessions")
    .insert({
      session_id: sessionId,
      total_remaining: UNREGISTERED_LIMIT,
      total_limit: UNREGISTERED_LIMIT,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Failed to initialize free scans");
  }

  return inserted;
}

async function getRegisteredRecord(userId: string): Promise<FreeScanRecord> {
  // First, get the user's account creation date from profiles table
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    throw new Error("User profile not found");
  }

  const accountCreatedAt = profile.created_at;

  // Check if free period (3 days) has expired
  const freePeriodExpired = hasFreePeriodExpired(accountCreatedAt);

  // Get or create the free scan session record
  const { data, error } = await adminClient
    .from("free_scan_sessions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    // Initialize new record with lifetime limit
    const { data: inserted, error: insertError } = await adminClient
      .from("free_scan_sessions")
      .insert({
        user_id: userId,
        total_remaining: freePeriodExpired ? 0 : REGISTERED_LIFETIME_LIMIT,
        total_limit: REGISTERED_LIFETIME_LIMIT,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Failed to initialize free scans");
    }

    return inserted;
  }

  // If free period expired, ensure remaining is 0
  if (freePeriodExpired) {
    if (data.total_remaining && data.total_remaining > 0) {
      const { data: updated, error: updateError } = await adminClient
        .from("free_scan_sessions")
        .update({ total_remaining: 0 })
        .eq("id", data.id)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "Failed to update free scans");
      }

      return updated;
    }
    return data;
  }

  // Free period hasn't expired, return the record as-is
  return data;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  
  let userId: string | null = null;
  
  // Use createServerClient from @supabase/ssr (better cookie handling than auth-helpers)
  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // In API routes, cookies are set via response
        },
        remove(name: string, options: any) {
          // In API routes, cookies are removed via response
        },
      },
    }
  );
  
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (!userError && user) {
      userId = user.id;
    } else {
      // Fallback to session check
  const {
    data: { session },
  } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
  } catch (error) {
    console.error("Error getting user in GET /api/free-scans:", error);
  }

  let sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  let shouldSetCookie = false;

  try {
    if (userId) {
      // Check if user has premium subscription
      const isPremium = await hasPremiumSubscription(userId);
      
      if (isPremium) {
        // Premium users have unlimited scans
        return createJsonResponse({ type: "registered", remaining: PREMIUM_UNLIMITED });
      }

      // Regular registered users have 3 scans lifetime OR 3 days (whichever comes first)
      const record = await getRegisteredRecord(userId);
      const remaining = record.total_remaining ?? REGISTERED_LIFETIME_LIMIT;
      return createJsonResponse({ type: "registered", remaining });
    }

    // Unregistered users have 1 scan lifetime
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      shouldSetCookie = true;
    }

    const record = await getUnregisteredRecord(sessionId);
    const response = createJsonResponse({ type: "unregistered", remaining: record.total_remaining ?? UNREGISTERED_LIMIT });

    if (shouldSetCookie) {
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_COOKIE_MAX_AGE,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Free scan GET error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch free scan status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // In API routes, cookies are set via response
        },
        remove(name: string, options: any) {
          // In API routes, cookies are removed via response
        },
      },
    }
  );
  
  let userId: string | null = null;
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (!userError && user) {
      userId = user.id;
    } else {
  const {
    data: { session },
  } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
  } catch (error) {
    console.error("Error getting user in POST /api/free-scans:", error);
  }
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  try {
    if (userId) {
      // Check if user has premium subscription
      const isPremium = await hasPremiumSubscription(userId);
      
      if (isPremium) {
        // Premium users have unlimited scans - no need to decrement
        return createJsonResponse({ type: "registered", remaining: PREMIUM_UNLIMITED });
      }

      // Regular registered users: decrement lifetime scans
      const record = await getRegisteredRecord(userId);
      const remaining = record.total_remaining ?? REGISTERED_LIFETIME_LIMIT;
      if (remaining <= 0) {
        return NextResponse.json({ error: "No free scans remaining" }, { status: 429 });
      }

      const { data: updated, error: updateError } = await adminClient
        .from("free_scan_sessions")
        .update({ total_remaining: remaining - 1 })
        .eq("id", record.id)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "Failed to decrement free scans");
      }

      return createJsonResponse({ type: "registered", remaining: updated.total_remaining ?? 0 });
    }

    // Unregistered users: decrement total scans
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const record = await getUnregisteredRecord(sessionId);
    const remaining = record.total_remaining ?? UNREGISTERED_LIMIT;
    if (remaining <= 0) {
      const response = NextResponse.json({ error: "No free scans remaining" }, { status: 429 });
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_COOKIE_MAX_AGE,
        path: "/",
      });
      return response;
    }

    const { data: updated, error: updateError } = await adminClient
      .from("free_scan_sessions")
      .update({ total_remaining: remaining - 1 })
      .eq("id", record.id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to decrement free scans");
    }

    const response = createJsonResponse({ type: "unregistered", remaining: updated.total_remaining ?? 0 });
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("Free scan POST error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to update free scans" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // In API routes, cookies are set via response
        },
        remove(name: string, options: any) {
          // In API routes, cookies are removed via response
        },
      },
    }
  );
  
  let userId: string | null = null;
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (!userError && user) {
      userId = user.id;
    } else {
  const {
    data: { session },
  } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    }
  } catch (error) {
    console.error("Error getting user in PATCH /api/free-scans:", error);
  }
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  try {
    if (userId) {
      // Check if user has premium subscription
      const isPremium = await hasPremiumSubscription(userId);
      
      if (isPremium) {
        // Premium users have unlimited scans - no need to reset
        return createJsonResponse({ type: "registered", remaining: PREMIUM_UNLIMITED });
      }

      // Regular registered users: reset lifetime scans (only if free period hasn't expired)
      const record = await getRegisteredRecord(userId);
      const { data: profile } = await adminClient
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .maybeSingle();

      if (!profile) {
        throw new Error("User profile not found");
      }

      const freePeriodExpired = hasFreePeriodExpired(profile.created_at);
      const resetRemaining = freePeriodExpired ? 0 : REGISTERED_LIFETIME_LIMIT;

      const { data: updated, error: updateError } = await adminClient
        .from("free_scan_sessions")
        .upsert(
          {
            user_id: userId,
            total_remaining: resetRemaining,
            total_limit: REGISTERED_LIFETIME_LIMIT,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "Failed to reset free scans");
      }

      return createJsonResponse({ type: "registered", remaining: updated.total_remaining ?? resetRemaining });
    }

    // Unregistered users: reset total scans
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const { data: updated, error: updateError } = await adminClient
      .from("free_scan_sessions")
      .upsert(
        {
          session_id: sessionId,
          total_remaining: UNREGISTERED_LIMIT,
          total_limit: UNREGISTERED_LIMIT,
        },
        { onConflict: "session_id" }
      )
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to reset free scans");
    }

    const response = createJsonResponse({ type: "unregistered", remaining: updated.total_remaining ?? UNREGISTERED_LIMIT });
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("Free scan PATCH error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to reset free scans" }, { status: 500 });
  }
}
