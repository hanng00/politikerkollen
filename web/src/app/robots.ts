import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://politikerkollen.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/c/", "/api/", "/val/", "/motsagelse/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
