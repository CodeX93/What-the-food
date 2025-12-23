import type { Metadata } from "next";
import WallOfLovePage from "@/views/WallOfLove";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Wall Of Love.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/wall-of-love');

  const title = "What The Food Wall of Love | Tested by 10,000+ Food Lovers";
  const description =
    "Hungry for proof? Explore testimonials, success stories, and see why everyone's screaming WTF in a good way. Loved and tested by 10,000+ food lovers.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function WallOfLoveRoute() {
  return <WallOfLovePage />;
}

