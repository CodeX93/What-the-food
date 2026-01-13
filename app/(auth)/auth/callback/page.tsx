import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Dynamic import for client component
const AuthCallbackClient = dynamic(
  () => 
    import("@/components/Auth/AuthCallbackClient").then((mod) => ({
      default: mod.AuthCallbackClient,
    })),
  { 
    ssr: false,
  }
);

import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/auth/callback');

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

export default function AuthCallbackRoute() {
  return <AuthCallbackClient />;
}

