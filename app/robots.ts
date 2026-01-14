import type { MetadataRoute } from "next";
import { requirePublicSiteUrl } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = requirePublicSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api",
          "/dashboard",
          "/sign-in",
          "/sign-up",
          "/cancel",
          "/success",
          "/terminal",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
