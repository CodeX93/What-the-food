import { NextRequest, NextResponse } from "next/server";
import { BlogClient } from "seobot";

// Initialize SEObot Blog Client
const SEOBOT_API_KEY = process.env.SEOBOT_API_KEY;

if (!SEOBOT_API_KEY) {
  console.warn("SEOBOT_API_KEY is not set. Blog posts will not be available.");
}

const blogClient = SEOBOT_API_KEY ? new BlogClient(SEOBOT_API_KEY) : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!blogClient) {
    return NextResponse.json(
      { error: "SEObot API key not configured" },
      { status: 503 }
    );
  }

  try {
    const { slug } = params;

    // Fetch single article from SEObot
    const article = await blogClient.getArticle(slug);

    if (!article || !article.published) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { article },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (e: any) {
    console.error("Error fetching blog post from SEObot:", e);
    return NextResponse.json(
      { error: "Article not found", details: String(e?.message || e) },
      { status: 404 }
    );
  }
}
