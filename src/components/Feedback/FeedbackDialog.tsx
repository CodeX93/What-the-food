"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Lightbulb, Bug, Star, MessageSquare, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackType = "idea" | "bug" | "review" | "other";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("idea");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const t = useTranslation();

  const feedbackTypes: Array<{ type: FeedbackType; icon: React.ReactNode; label: string }> = [
    {
      type: "idea",
      icon: <Lightbulb className="h-5 w-5" />,
      label: t("feedback.type.idea"),
    },
    {
      type: "bug",
      icon: <span className="text-lg">🐛</span>,
      label: t("feedback.type.bug"),
    },
    {
      type: "review",
      icon: <Star className="h-5 w-5" />,
      label: t("feedback.type.review"),
    },
    {
      type: "other",
      icon: <MessageSquare className="h-5 w-5" />,
      label: t("feedback.type.other"),
    },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: t("feedback.error.empty.title"),
        description: t("feedback.error.empty.description"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const userEmail = session?.user?.email || null;

      // Fetch user name from profile if user is logged in
      let userName: string | null = null;
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();
        
        if (profileData?.full_name) {
          userName = profileData.full_name.trim();
        }
      }

      const { error } = await (supabase as any).from("feedback").insert({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        feedback_type: feedbackType,
        message: message.trim(),
      });

      if (error) {
        throw error;
      }

      toast({
        title: t("feedback.success.title"),
        description: t("feedback.success.description"),
      });

      // Reset form
      setMessage("");
      setFeedbackType("idea");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: t("feedback.error.submit.title"),
        description: t("feedback.error.submit.description"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background rounded-lg border">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left text-lg font-semibold">{t("feedback.title")}</DialogTitle>
              <DialogDescription className="text-left mt-1 text-sm text-muted-foreground">
                {t("feedback.subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 space-y-6 py-4">
          {/* Feedback Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("feedback.type.label")}</Label>
            <div className="grid grid-cols-4 gap-2">
              {feedbackTypes.map(({ type, icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFeedbackType(type)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    "hover:bg-muted/50",
                    feedbackType === type
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center",
                    feedbackType === type ? "text-primary" : "text-muted-foreground"
                  )}>
                    {icon}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    feedbackType === type ? "text-primary" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-3">
            <Label htmlFor="feedback-message" className="text-sm font-medium">{t("feedback.message.label")}</Label>
            <Textarea
              id="feedback-message"
              placeholder={t("feedback.message.placeholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none bg-muted/30"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            className="w-full bg-muted hover:bg-muted/80 text-foreground"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("feedback.submitting")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t("feedback.submit")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

