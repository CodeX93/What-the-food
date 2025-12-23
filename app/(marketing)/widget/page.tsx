import type { Metadata } from "next";
import WidgetLandingPage from "@/views/Widget";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Widget.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/widget');

  const title = "AI Food Calorie Finder Widget for Websites | What The Food";
  const description =
    "Add our AI food calorie finder widget to your website to boost engagement with nutritional insights. Let readers track macros with our smart calorie counter.";

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

export default function WidgetRoute() {
  return (
    <>
      {/* H1 for SEO - always visible to crawlers */}
      <h1 className="sr-only">AI Food Calorie Finder Widget for Websites | What The Food</h1>
      <WidgetLandingPage />
    </>
  );
}

