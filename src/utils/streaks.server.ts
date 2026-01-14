import { createServerSupabaseClient } from "@/integrations/supabase/server";
import type { StreakType, AchievementType, UserStreak, UserAchievement } from "@/utils/streaks.metadata";

// Re-export types for convenience
export type { StreakType, AchievementType, UserStreak, UserAchievement };

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  login_count: number;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create daily activity record for today
 */
export async function getOrCreateDailyActivity(
  userId: string,
  date: Date = new Date()
): Promise<DailyActivity | null> {
  const supabase = await createServerSupabaseClient();
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  // Try to get existing record
  const { data: existing } = await (supabase as any)
    .from("daily_activity")
    .select("*")
    .eq("user_id", userId)
    .eq("activity_date", dateStr)
    .maybeSingle();

  if (existing) {
    return existing as DailyActivity;
  }

  // Create new record
  const { data: newRecord, error } = await (supabase as any)
    .from("daily_activity")
    .insert({
      user_id: userId,
      activity_date: dateStr,
      login_count: 0,
      scan_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating daily activity:", error);
    return null;
  }

  return newRecord as DailyActivity;
}

/**
 * Record a login for today
 */
export async function recordLogin(userId: string): Promise<void> {
  const today = new Date();
  const activity = await getOrCreateDailyActivity(userId, today);

  if (!activity) return;

  const supabase = await createServerSupabaseClient();
  
  // Update login count (increment if not already logged in today)
  await (supabase as any)
    .from("daily_activity")
    .update({ 
      login_count: activity.login_count > 0 ? activity.login_count : 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activity.id);

  // Update login streak
  await updateStreak(userId, "login", activity.login_count === 0);
}

/**
 * Record a scan for today
 */
export async function recordScan(userId: string): Promise<void> {
  const today = new Date();
  const activity = await getOrCreateDailyActivity(userId, today);

  if (!activity) return;

  const supabase = await createServerSupabaseClient();
  
  // Increment scan count
  const newScanCount = activity.scan_count + 1;
  await (supabase as any)
    .from("daily_activity")
    .update({ 
      scan_count: newScanCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activity.id);

  // Update scan streaks based on count
  if (newScanCount >= 1) {
    await updateStreak(userId, "scan_1", activity.scan_count === 0);
  }
  if (newScanCount >= 3) {
    await updateStreak(userId, "scan_3", activity.scan_count < 3);
  }
  if (newScanCount >= 5) {
    await updateStreak(userId, "scan_5", activity.scan_count < 5);
  }
}

/**
 * Update or create a streak
 */
async function updateStreak(
  userId: string,
  streakType: StreakType,
  isNewActivity: boolean
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Get existing streak
  const { data: existing } = await (supabase as any)
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .eq("streak_type", streakType)
    .maybeSingle();

  if (!existing) {
    // Create new streak
    await (supabase as any).from("user_streaks").insert({
      user_id: userId,
      streak_type: streakType,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: todayStr,
      streak_start_date: todayStr,
    });
    return;
  }

  const lastActivityDate = existing.last_activity_date
    ? new Date(existing.last_activity_date)
    : null;
  const daysSinceLastActivity = lastActivityDate
    ? Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  let newStreak = existing.current_streak;
  let newStartDate = existing.streak_start_date;

  if (daysSinceLastActivity === 0) {
    // Already logged today, no change needed
    return;
  } else if (daysSinceLastActivity === 1) {
    // Consecutive day - continue streak
    newStreak = existing.current_streak + 1;
    if (!existing.streak_start_date) {
      newStartDate = todayStr;
    }
  } else {
    // Streak broken - start over
    newStreak = 1;
    newStartDate = todayStr;
  }

  // Update streak
  await (supabase as any)
    .from("user_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(existing.longest_streak, newStreak),
      last_activity_date: todayStr,
      streak_start_date: newStartDate,
    })
    .eq("id", existing.id);

  // Check for achievements
  await checkAchievements(userId, streakType, newStreak);
}

/**
 * Check and unlock achievements based on streak
 */
async function checkAchievements(
  userId: string,
  streakType: StreakType,
  currentStreak: number
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Define achievement thresholds
  const achievementMap: Record<StreakType, Array<{ type: AchievementType; threshold: number }>> = {
    login: [
      { type: "login_30", threshold: 30 },
      { type: "login_100", threshold: 100 },
    ],
    scan_1: [
      { type: "scan_1_30", threshold: 30 },
      { type: "scan_1_100", threshold: 100 },
    ],
    scan_3: [
      { type: "scan_3_30", threshold: 30 },
    ],
    scan_5: [
      { type: "scan_5_30", threshold: 30 },
    ],
  };

  const achievements = achievementMap[streakType] || [];

  for (const achievement of achievements) {
    if (currentStreak >= achievement.threshold) {
      // Check if already unlocked
      const { data: existing } = await (supabase as any)
        .from("user_achievements")
        .select("id")
        .eq("user_id", userId)
        .eq("achievement_type", achievement.type)
        .maybeSingle();

      if (!existing) {
        // Unlock achievement
        await (supabase as any).from("user_achievements").insert({
          user_id: userId,
          achievement_type: achievement.type,
        });
      }
    }
  }
}

/**
 * Get all streaks for a user
 */
export async function getUserStreaks(userId: string): Promise<UserStreak[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase as any)
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .order("streak_type");

  if (error) {
    console.error("Error fetching user streaks:", error);
    return [];
  }

  return (data || []) as UserStreak[];
}

/**
 * Get all achievements for a user
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase as any)
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    console.error("Error fetching user achievements:", error);
    return [];
  }

  return (data || []) as UserAchievement[];
}

