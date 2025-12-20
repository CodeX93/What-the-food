import type { Metadata } from "next";
import BlogPage from "@/views/Blog";
import { getPreviewImageUrlFromRequest, getRequestUrl } from "@/lib/seo/siteUrl";

export async function generateMetadata(): Promise<Metadata> {
  const requestUrl = await getRequestUrl();
  const imageUrl = getPreviewImageUrlFromRequest("Blog.png", requestUrl);

  return {
    title: "What The Food Calorie Cal Blog | Nutrition, Recipes and More",
    description: "Discover tips on using AI calorie counters, food calorie finder tools, and recipe generator apps. Learn how to track calories and boost healthy eating.",
    openGraph: {
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: "What The Food Calorie Cal Blog | Nutrition, Recipes and More",
      description: "Discover tips on using AI calorie counters, food calorie finder tools, and recipe generator apps. Learn how to track calories and boost healthy eating.",
      images: [imageUrl],
    },
  };
}

export default function BlogRoute() {
  return <BlogPage />;
}

