import { NextResponse } from "next/server";
import { getSitemapChunkCount, getSitemapChunkUrl } from "@/lib/seo/sitemap";

export const revalidate = 60 * 60 * 12; // 12h

export async function GET() {
  let count = 1;

  try {
    count = await getSitemapChunkCount();
  } catch {
    // Fail open: still return an index pointing at the first sitemap chunk.
    count = 1;
  }

  const sitemapsXml = Array.from({ length: count }, (_, id) => {
    const loc = getSitemapChunkUrl(id);
    return `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`;
  }).join("\n");

  // Include blog sitemap (now on root domain)
  // Blog posts are now at /blog route, sitemap should be generated from SEObot or WordPress
  // Note: Update this URL once blog sitemap is available at /blog/sitemap.xml
  // const blogSitemap = `  <sitemap>\n    <loc>https://whatthefood.io/blog/sitemap.xml</loc>\n  </sitemap>`;
  const blogSitemap = ``; // Blog sitemap will be added once available

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapsXml}\n${blogSitemap}\n</sitemapindex>\n`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=43200, stale-while-revalidate=86400",
    },
  });
}

