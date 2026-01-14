'use client';

import { useEffect, useState } from "react";
import { StreaksDisplay } from "./StreaksDisplay";
import { AchievementsDisplay } from "../Achievements/AchievementsDisplay";
import type { UserStreak, UserAchievement } from "@/utils/streaks.metadata";

type StreaksAndAchievementsClientProps = {
  initialStreaks?: UserStreak[];
  initialAchievements?: UserAchievement[];
  showAchievements?: boolean; // Control whether to show achievements section
};

export function StreaksAndAchievementsClient({
  initialStreaks = [],
  initialAchievements = [],
  showAchievements = true, // Default to true for backward compatibility
}: StreaksAndAchievementsClientProps) {
  const [streaks, setStreaks] = useState<UserStreak[]>(initialStreaks);
  const [achievements, setAchievements] = useState<UserAchievement[]>(initialAchievements);
  const [loading, setLoading] = useState(!initialStreaks.length && !initialAchievements.length);

  useEffect(() => {
    // Record login when component mounts (user is viewing dashboard)
    const recordLoginActivity = async () => {
      try {
        await fetch("/api/streaks/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "login" }),
        });
      } catch (error) {
        console.error("Error recording login:", error);
      }
    };

    recordLoginActivity();

    // Fetch streaks and achievements if not provided
    if (!initialStreaks.length && !initialAchievements.length) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const [streaksRes, achievementsRes] = await Promise.all([
            fetch("/api/streaks"),
            fetch("/api/achievements"),
          ]);

          if (streaksRes.ok) {
            const streaksData = await streaksRes.json();
            setStreaks(streaksData.streaks || []);
          }

          if (achievementsRes.ok) {
            const achievementsData = await achievementsRes.json();
            setAchievements(achievementsData.achievements || []);
          }
        } catch (error) {
          console.error("Error fetching streaks/achievements:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [initialStreaks.length, initialAchievements.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StreaksDisplay streaks={streaks} />
      {showAchievements && <AchievementsDisplay achievements={achievements} />}
    </div>
  );
}
