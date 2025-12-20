import type { Metadata } from "next";
import WallOfLovePage from "@/views/WallOfLove";

export const metadata: Metadata = {
  title: "What The Food Wall of Love | Tested by 10,000+ Food Lovers",
  description: "Hungry for proof? Explore testimonials, success stories, and see why everyone's screaming WTF in a good way. Loved and tested by 10,000+ food lovers.",
  openGraph: {
    images: ["/preview-images/Wall Of Love.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "What The Food Wall of Love | Tested by 10,000+ Food Lovers",
    description: "Hungry for proof? Explore testimonials, success stories, and see why everyone's screaming WTF in a good way. Loved and tested by 10,000+ food lovers.",
    images: ["/preview-images/Wall Of Love.png"],
  },
};

export default function WallOfLoveRoute() {
  return <WallOfLovePage />;
}

