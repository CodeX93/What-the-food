import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TagPageClient } from "@/components/TagPage/TagPageClient";
import { getScansByTag } from "@/utils/tagScans.server";
import { slugToTag } from "@/utils/tagSlug";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

type TagPageProps = {
  params: Promise<{ tag: string }>;
};

// Note: We don't use generateStaticParams here because tags can grow infinitely.
// Pages are generated on-demand and cached via ISR (revalidate: 3600).

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const tagName = slugToTag(tag);
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Homepage.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest(`/${tag}`);

  const title = `${tagName} | Food Dishes & Nutrition | What The Food`;
  const description = `Browse all ${tagName} dishes with detailed nutrition information, macro breakdown, and nutrition scores. Discover healthy ${tagName} options.`;

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

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const tagName = slugToTag(tag);
  const scans = await getScansByTag(tag);

  // If no scans found, show 404
  if (scans.length === 0) {
    notFound();
  }

  return <TagPageClient tagName={tagName} scans={scans} />;
}
