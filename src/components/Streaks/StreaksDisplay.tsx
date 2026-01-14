'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Camera, Zap, Crown, Trophy } from "lucide-react";
import type { UserStreak } from "@/utils/streaks.metadata";
import { getStreakMetadata } from "@/utils/streaks.metadata";

type StreaksDisplayProps = {
  streaks: UserStreak[];
  compact?: boolean; // For profile page styling
};

const streakIcons: Record<string, React.ReactNode> = {
  login: <Flame className="h-5 w-5" />,
  scan_1: <Camera className="h-5 w-5" />,
  scan_3: <Zap className="h-5 w-5" />,
  scan_5: <Crown className="h-5 w-5" />,
};

export function StreaksDisplay({ streaks, compact = false }: StreaksDisplayProps) {
  if (compact) {
    // Profile page style - matches subscription card
    if (streaks.length === 0) {
      return (
        <Card className="shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-muted/50">
                <Trophy className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">Your Streaks</CardTitle>
                <CardDescription className="mt-1">Track your daily progress</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
                <Trophy className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground mb-2 font-semibold">No streaks yet</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Start building your streaks! Log in daily or scan foods to get started.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="shadow-xl border-2 border-primary/10 bg-gradient-to-br from-card via-card to-card/50">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">Your Streaks</CardTitle>
                <CardDescription className="mt-1">Track your daily progress</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {streaks.map((streak) => {
              const metadata = getStreakMetadata(streak.streak_type);
              
              return (
                <div
                  key={streak.id}
                  className="relative overflow-hidden p-5 rounded-xl border-2 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/20">
                      <div className="text-2xl">{metadata.icon}</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">{metadata.name}</p>
                      <p className="font-bold text-xl">{streak.current_streak} days</p>
                      {streak.longest_streak > streak.current_streak && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Best: {streak.longest_streak} days
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 ml-16">{metadata.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Original dashboard style
  if (streaks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Streaks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Start building your streaks! Log in daily or scan foods to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Streaks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {streaks.map((streak) => {
          const metadata = getStreakMetadata(streak.streak_type);
          const icon = streakIcons[streak.streak_type] || <Flame className="h-5 w-5" />;
          
          return (
            <div
              key={streak.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{metadata.icon}</div>
                <div>
                  <div className="font-semibold text-sm">{metadata.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {metadata.description}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg font-bold">
                    {streak.current_streak}
                  </Badge>
                  <span className="text-xs text-muted-foreground">days</span>
                </div>
                {streak.longest_streak > streak.current_streak && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Best: {streak.longest_streak}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
