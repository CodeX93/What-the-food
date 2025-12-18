import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Auth / callbacks
          "/auth",
          "/auth/callback",

          // Private app area
          "/dashboard",
          "/profile",
          "/settings",
          "/billing",
          "/plans",
          "/checkout",
          "/history",
          "/scan-histories",
          "/food-results",
          "/saved-recipes",
          "/meal-planner",
          "/meal-plan",
          "/my-food-analytics",
          "/analytics",

          // Widget private/admin dashboards
          "/widget/admin",
          "/widget/dashboard",
          "/widget/embed",
          "/widget/plans",

          // API routes
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap-index.xml`,
    host: siteUrl,
  };
}

