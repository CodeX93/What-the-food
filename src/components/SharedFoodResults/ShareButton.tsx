'use client';

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ShareButtonProps = {
  scanId: string;
  dishName: string;
};

export function ShareButton({ scanId, dishName }: ShareButtonProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/shared/${scanId}`;
      const shareData = {
        title: dishName || "Food Analysis Results",
        text: `Check out this food analysis: ${dishName || "Food scan"}`,
        url: shareUrl,
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared!",
          description: "Food analysis results shared successfully.",
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Food analysis link has been copied to your clipboard.",
        });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        try {
          const shareUrl = `${window.location.origin}/shared/${scanId}`;
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied!",
            description: "Food analysis link has been copied to your clipboard.",
          });
        } catch (clipboardError) {
          toast({
            title: "Share failed",
            description: "Unable to share. Please copy the URL manually.",
            variant: "destructive",
          });
        }
      }
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleShare}>
      <Share2 className="h-4 w-4 mr-2" />
      Share
    </Button>
  );
}

