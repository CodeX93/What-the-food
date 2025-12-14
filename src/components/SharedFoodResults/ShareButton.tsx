'use client';

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";

type ShareButtonProps = {
  scanId: string;
  dishName: string;
};

export function ShareButton({ scanId, dishName }: ShareButtonProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/shared/${scanId}`
      : `/shared/${scanId}`;
    
    const shareData = {
      title: dishName || "Food Analysis Results",
      text: `Check out this food analysis: ${dishName || "Food scan"}`,
      url: shareUrl,
    };

    try {
      // Try Web Share API first (mobile-friendly, requires HTTPS)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared!",
          description: "Food analysis results shared successfully.",
        });
        return;
      }
      
      // Fallback: Copy to clipboard
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        toast({
          title: "Link copied!",
          description: "Food analysis link has been copied to your clipboard.",
        });
      } else {
        // Show URL in toast for manual copying
        toast({
          title: "Copy this link",
          description: shareUrl,
          duration: 10000,
        });
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }
      
      // Try clipboard as fallback
      try {
        const copied = await copyToClipboard(shareUrl);
        if (copied) {
          toast({
            title: "Link copied!",
            description: "Food analysis link has been copied to your clipboard.",
          });
        } else {
          // Show URL for manual copying
          toast({
            title: "Copy this link",
            description: shareUrl,
            duration: 10000,
          });
        }
      } catch (clipboardError) {
        // Final fallback: show URL in toast
        toast({
          title: "Copy this link",
          description: shareUrl,
          duration: 10000,
        });
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

