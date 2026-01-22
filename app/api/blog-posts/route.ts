import { NextRequest, NextResponse } from "next/server";
import { BlogClient } from "seobot";

// Initialize SEObot Blog Client
// Get API key from environment variable
const SEOBOT_API_KEY = process.env.SEOBOT_API_KEY;

if (!SEOBOT_API_KEY) {
  console.warn("SEOBOT_API_KEY is not set. Blog posts will not be available.");
}

const blogClient = SEOBOT_API_KEY ? new BlogClient(SEOBOT_API_KEY) : null;

export async function GET(request: NextRequest) {
  if (!SEOBOT_API_KEY) {
    return NextResponse.json(
      { error: "SEObot API key not configured", posts: [] },
      { status: 503 }
    );
  }

  if (!blogClient) {
    return NextResponse.json(
      { error: "SEObot Blog Client initialization failed", posts: [] },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(0, Number(searchParams.get("page")) || 0);
    const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit")) || 6));

    // Fetch articles from SEObot
    const response = await blogClient.getArticles(page, limit);

    // SEObot returns { articles: IArticleIndex[], total: number }
    const articles = response.articles || [];

    // Transform SEObot articles to match our BlogPost type
    // IArticleIndex has createdAt/updatedAt, not publishedAt
    const posts = articles.map((article) => ({
      id: article.id,
      title: article.headline,
      excerpt: article.metaDescription || "",
      url: `/blog/${article.slug}`,
      publishedAt: article.createdAt || article.updatedAt,
      image: article.image || null,
      slug: article.slug,
      readingTime: article.readingTime,
      category: article.category,
      tags: article.tags,
    }));

    return NextResponse.json(
      { posts, total: response.total || 0 },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (e: any) {
    console.error("Error fetching blog posts from SEObot:", e);
    
    // Check for 403 Forbidden error specifically
    if (e?.response?.status === 403 || e?.status === 403) {
      return NextResponse.json(
        { 
          error: "Access Denied (403)", 
          message: "SEObot API key may be invalid, expired, or the blog may not be synchronized yet. Please check your API key in SEObot dashboard and ensure your blog is connected and synchronized.",
          posts: [] 
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: "Unexpected error", 
        details: String(e?.message || e),
        status: e?.response?.status || e?.status,
        posts: [] 
      },
      { status: 500 }
    );
  }
}
