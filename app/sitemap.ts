import type { MetadataRoute } from "next";
import { getSitemapChunk, getSitemapChunkCount } from "@/lib/seo/sitemap";

export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  const count = await getSitemapChunkCount();
  return Array.from({ length: count }, (_, id) => ({ id }));
}

export default async function sitemap(props: {
  id: number | string | Promise<number | string>;
}): Promise<MetadataRoute.Sitemap> {
  const raw = await props.id;
  const id = typeof raw === "string" ? Number(raw) : raw;
  const page = Number.isFinite(id) && id >= 0 ? id : 0;
  return getSitemapChunk(page);
}

