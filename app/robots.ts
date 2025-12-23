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
          // Block Next.js static files and build artifacts
          "/_next/",
          "/_next/image/",
          "/_next/static/",

          // Auth / callbacks
          
          "/auth/callback",

          // Private app area
          "/dashboard",
          "/profile",
          "/settings",
          "/billing",
          
          "/checkout",
          "/history",
          "/scan-histories",
          "/food-results",
          "/saved-recipes",
          "/meal-planner",
          "/meal-plan",
          "/my-food-analytics",

          // Widget private/admin dashboards
          "/widget/admin",
          "/widget/dashboard",
          "/widget/embed",
          "/widget/plans",
          "/widget-results",

          // API routes
          "/api/",

          // Note: Blog posts are hosted on blog.whatthefood.io subdomain.
          // If any blog post URLs exist on root domain, they should be accessible
          // for SEO purposes (either as redirects or actual pages).

          // Block query parameters with tracking codes
          "/*?utm_*",
          "/*?fbclid=*",
          "/*?gclid=*",
          "/*?ref=*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap-index.xml`,
  };
}

