// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// Minimal typing shim so local TypeScript doesn't error on global Deno
// (Supabase Edge Functions run on Deno where Deno.serve exists)
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type WPPost = {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  jetpack_featured_media_url?: string;
  _embedded?: any;
};

const BLOG_API = "https://blog.whatthefood.io/wp-json/wp/v2/posts";

const getImageFromPost = (post: WPPost): string | undefined => {
  if (post.jetpack_featured_media_url) return post.jetpack_featured_media_url;
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (media?.source_url) return media.source_url as string;
  return undefined;
};

const sanitize = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit")) || 6));

    const wpUrl = `${BLOG_API}?per_page=${limit}&_embed=1`;
    const resp = await fetch(wpUrl, { headers: { Accept: "application/json" } });
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch blog posts", status: resp.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const posts: WPPost[] = await resp.json();

    // Normalize blog URLs to always use blog subdomain
    const normalizeBlogUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        // If URL is on root domain, convert to blog subdomain
        if (urlObj.hostname === 'whatthefood.io' || urlObj.hostname === 'www.whatthefood.io') {
          urlObj.hostname = 'blog.whatthefood.io';
        }
        // Ensure it's always blog subdomain
        if (!urlObj.hostname.includes('blog.whatthefood.io')) {
          urlObj.hostname = 'blog.whatthefood.io';
        }
        return urlObj.toString();
      } catch {
        // If URL parsing fails, try to fix it manually
        if (url.includes('whatthefood.io') && !url.includes('blog.whatthefood.io')) {
          return url.replace(/https?:\/\/(www\.)?whatthefood\.io/, 'https://blog.whatthefood.io');
        }
        return url;
      }
    };

    const data = posts.map((p) => ({
      id: p.id,
      title: p.title?.rendered ? sanitize(p.title.rendered) : "",
      excerpt: p.excerpt?.rendered ? sanitize(p.excerpt.rendered) : "",
      url: normalizeBlogUrl(p.link),
      publishedAt: p.date,
      image: getImageFromPost(p) || null,
    }));

    return new Response(JSON.stringify({ posts: data }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=600, max-age=120",
      },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

Deno.serve(handler);


