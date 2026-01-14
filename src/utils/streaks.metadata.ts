// Client-safe metadata functions for streaks and achievements
// This file can be imported by both client and server components

export type StreakType = "login" | "scan_1" | "scan_3" | "scan_5";
export type AchievementType = 
  | "login_30" 
  | "login_100" 
  | "scan_1_30" 
  | "scan_3_30" 
  | "scan_5_30"
  | "scan_1_100"
  | "scan_3_100";

export interface UserStreak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: AchievementType;
  unlocked_at: string;
  created_at: string;
}

/**
 * Get achievement metadata (name, description, icon)
 */
export function getAchievementMetadata(type: AchievementType): {
  name: string;
  description: string;
  icon: string;
  color: string;
} {
  const metadata: Record<AchievementType, { name: string; description: string; icon: string; color: string }> = {
    login_30: {
      name: "30 Day Login Streak",
      description: "Logged in for 30 days straight!",
      icon: "🔥",
      color: "text-orange-500",
    },
    login_100: {
      name: "100 Day Login Streak",
      description: "Logged in for 100 days straight!",
      icon: "💎",
      color: "text-purple-500",
    },
    scan_1_30: {
      name: "30 Day Scan Streak",
      description: "Scanned at least 1 food per day for 30 days!",
      icon: "📸",
      color: "text-blue-500",
    },
    scan_1_100: {
      name: "100 Day Scan Streak",
      description: "Scanned at least 1 food per day for 100 days!",
      icon: "🏆",
      color: "text-yellow-500",
    },
    scan_3_30: {
      name: "Power Scanner",
      description: "Scanned at least 3 foods per day for 30 days!",
      icon: "⚡",
      color: "text-green-500",
    },
    scan_5_30: {
      name: "Scan Master",
      description: "Scanned at least 5 foods per day for 30 days!",
      icon: "👑",
      color: "text-red-500",
    },
    scan_3_100: {
      name: "Power Scanner Elite",
      description: "Scanned at least 3 foods per day for 100 days!",
      icon: "⚡💎",
      color: "text-green-600",
    },
  };

  return metadata[type];
}

/**
 * Get streak metadata
 */
export function getStreakMetadata(type: StreakType): {
  name: string;
  description: string;
  icon: string;
} {
  const metadata: Record<StreakType, { name: string; description: string; icon: string }> = {
    login: {
      name: "Login Streak",
      description: "Days in a row you've logged in",
      icon: "🔥",
    },
    scan_1: {
      name: "Daily Scanner",
      description: "Days in a row with at least 1 scan",
      icon: "📸",
    },
    scan_3: {
      name: "Power Scanner",
      description: "Days in a row with at least 3 scans",
      icon: "⚡",
    },
    scan_5: {
      name: "Scan Master",
      description: "Days in a row with at least 5 scans",
      icon: "👑",
    },
  };

  return metadata[type];
}
