import type { Metadata } from "next";
import ScanHistoryPage from "@/views/ScanHistory";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

// Force dynamic rendering for authenticated route
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/history');

  return {
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      images: [imageUrl],
    },
  };
}

export default function HistoryRoute() {
  return <ScanHistoryPage />;
}

