import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/seo/siteUrl";
import { getAllTags } from "@/utils/tagScans.server";
import { tagToSlug } from "@/utils/tagSlug";

export const SITEMAP_CHUNK_SIZE = 45_000; // below 50,000 URL limit (headroom)

type PublicPage = {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
};

/**
 * Indexable, public, SEO-worthy pages only.
 * Excludes auth, dashboard/app pages, admin, API routes, and user-generated share URLs.
 */
const PUBLIC_PAGES: PublicPage[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/features", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/how-it-works", priority: 0.85, changeFrequency: "monthly" },
  { path: "/keto-meal-planner", priority: 0.85, changeFrequency: "monthly" },
  { path: "/widget", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "yearly" },
  { path: "/wall-of-love", priority: 0.65, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.35, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.35, changeFrequency: "yearly" },
  { path: "/refund", priority: 0.35, changeFrequency: "yearly" },
  { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" },
];

function dedupeByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const e of entries) {
    if (!seen.has(e.url)) {
      seen.add(e.url);
      out.push(e);
    }
  }
  return out;
}

export const getAllSitemapEntries = unstable_cache(
  async (): Promise<MetadataRoute.Sitemap> => {
    // Keep `lastModified` stable via caching/revalidation.
    const lastModified = new Date();

    // Note: This app's language switching is client-side (no locale-prefixed routes),
    // so we intentionally do NOT emit per-locale URL variants to avoid duplicates.
    const staticEntries: MetadataRoute.Sitemap = PUBLIC_PAGES.map((p) => ({
      url: toAbsoluteUrl(p.path),
      lastModified,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    }));

    // If/when you add indexable dynamic routes (e.g. `/blog/[slug]`),
    // fetch them here and only include published items (no 404s).
    //
    // Keep this section fast: use lightweight "id+updated_at" queries and cache results.
    const dynamicEntries: MetadataRoute.Sitemap = [];
    
    // Add tag pages dynamically
    try {
      const tags = await getAllTags();
      const tagEntries: MetadataRoute.Sitemap = tags.map((tag) => ({
        url: toAbsoluteUrl(`/${tagToSlug(tag)}`),
        lastModified,
        changeFrequency: "daily" as const, // Tags update frequently as new scans are added
        priority: 0.7, // High priority for tag pages
      }));
      dynamicEntries.push(...tagEntries);
    } catch (error) {
      console.error("Error fetching tags for sitemap:", error);
      // Continue without tag pages if there's an error
    }

    return dedupeByUrl([...staticEntries, ...dynamicEntries]).sort((a, b) =>
      a.url.localeCompare(b.url)
    );
  },
  ["seo:sitemap:all-v1"],
  { revalidate: 60 * 60 * 12 } // 12h
);

export async function getSitemapChunkCount(): Promise<number> {
  const entries = await getAllSitemapEntries();
  return Math.max(1, Math.ceil(entries.length / SITEMAP_CHUNK_SIZE));
}

export async function getSitemapChunk(id: number): Promise<MetadataRoute.Sitemap> {
  const entries = await getAllSitemapEntries();
  const start = id * SITEMAP_CHUNK_SIZE;
  const end = start + SITEMAP_CHUNK_SIZE;
  return entries.slice(start, end);
}

export function getSitemapChunkUrl(id: number): string {
  const base = getSiteUrl();

  // Next.js behavior:
  // - dev: `/sitemap.xml/{id}`
  // - prod: `/sitemap/{id}.xml`
  const pathname =
    process.env.NODE_ENV === "production" ? `/sitemap/${id}.xml` : `/sitemap.xml/${id}`;

  return new URL(pathname, base).toString();
}

