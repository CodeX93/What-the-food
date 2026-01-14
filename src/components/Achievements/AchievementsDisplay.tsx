'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserAchievement } from "@/utils/streaks.metadata";
import { getAchievementMetadata } from "@/utils/streaks.metadata";

type AchievementsDisplayProps = {
  achievements: UserAchievement[];
};

export function AchievementsDisplay({ achievements }: AchievementsDisplayProps) {
  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Unlock achievements by maintaining streaks! Keep logging in and scanning foods.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Achievements</CardTitle>
        <p className="text-sm text-muted-foreground">
          {achievements.length} achievement{achievements.length !== 1 ? 's' : ''} unlocked
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {achievements.map((achievement) => {
            const metadata = getAchievementMetadata(achievement.achievement_type);
            const unlockedDate = new Date(achievement.unlocked_at);
            
            return (
              <div
                key={achievement.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className={`text-3xl ${metadata.color}`}>
                  {metadata.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{metadata.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {metadata.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Unlocked {unlockedDate.toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  ✓
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
