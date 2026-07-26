import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Added Jul 26 2026 (free pivot). This subdomain used to be a checkout host
// where nothing wanted indexing. It is now the delivery home of the FREE
// Blueprint, so the public conversion pages should be findable and citable,
// while everything behind auth (the course itself, account plumbing, the
// post-application booking page) stays out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signup", "/pricing", "/roadmap", "/roadmap/apply"],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/activate",
          "/login",
          "/forgot-password",
          "/auth/",
          "/api/",
          "/enroll-success",
          "/roadmap/thanks",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
