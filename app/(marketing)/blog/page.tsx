import type { Metadata } from "next";
import BlogPostsGrid from "@/components/Blog/BlogPostsGrid";
import { getPreviewImageUrlFromRequest, getRequestUrl, getCanonicalUrlFromRequest } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Blog.png", requestUrl);
  const canonicalUrl = await getCanonicalUrlFromRequest('/blog');

  const title = "What The Food Calorie Cal Blog | Nutrition, Recipes and More";
  const description =
    "Discover tips on using AI calorie counters, food calorie finder tools, and recipe generator apps. Learn how to track calories and boost healthy eating.";

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

// Server-side rendering for blog listing page
export default async function BlogRoute() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "What The Food Blog",
    "description": "Tips, guides, and insights for healthier eating",
    "url": "https://whatthefood.io/blog"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="overflow-x-hidden bg-background">
        <section className="min-h-screen flex items-center">
          <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20 w-full">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Blog</h1>
              <p className="text-lg text-muted-foreground">
                Tips, guides, and insights for healthier eating
              </p>
            </div>

            <BlogPostsGrid />
          </div>
        </section>
      </div>
    </>
  );
}

