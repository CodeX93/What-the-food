import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/integrations/supabase/server";
import { recordLogin, recordScan } from "@/utils/streaks.server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'login' or 'scan'

    if (action === "login") {
      await recordLogin(session.user.id);
    } else if (action === "scan") {
      await recordScan(session.user.id);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating streak:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
