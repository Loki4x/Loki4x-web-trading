import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Hanya halaman publik yang boleh diindeks. Area member, admin, dan API ditutup dari mesin pencari.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/auth/",
          "/r/",
          "/dashboard",
          "/trades",
          "/signals",
          "/reports",
          "/accounts",
          "/settings",
          "/upgrade",
          "/referral",
          "/news",
          "/market-news",
          "/calculator",
          "/cot",
          "/positioning",
          "/academy",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
