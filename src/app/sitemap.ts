import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Public pages only. The course lives behind auth and is deliberately absent.
// /roadmap/thanks is excluded on purpose: it is the post-application booking
// page and means nothing without a submitted application.
const PAGES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/roadmap", priority: 0.9, changeFrequency: "monthly" },
  { path: "/roadmap/apply", priority: 0.9, changeFrequency: "monthly" },
  { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.6, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map((p) => ({
    url: `${SITE.url}${p.path === "/" ? "" : p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
