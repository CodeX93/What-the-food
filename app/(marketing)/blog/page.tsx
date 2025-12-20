import type { Metadata } from "next";
import BlogPage from "@/views/Blog";

export const metadata: Metadata = {
  title: "What The Food Calorie Cal Blog | Nutrition, Recipes and More",
  description: "Discover tips on using AI calorie counters, food calorie finder tools, and recipe generator apps. Learn how to track calories and boost healthy eating.",
  openGraph: {
    images: ["/preview-images/Blog.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "What The Food Calorie Cal Blog | Nutrition, Recipes and More",
    description: "Discover tips on using AI calorie counters, food calorie finder tools, and recipe generator apps. Learn how to track calories and boost healthy eating.",
    images: ["/preview-images/Blog.png"],
  },
};

export default function BlogRoute() {
  return <BlogPage />;
}

