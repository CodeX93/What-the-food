"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";
import { useTranslation } from "@/hooks/use-translation";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslation();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        {t("feedback.button")}
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}


