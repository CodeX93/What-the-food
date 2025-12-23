import type { Metadata } from "next";
import BlogPage from "@/views/Blog";
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

export default function BlogRoute() {
  return <BlogPage />;
}

