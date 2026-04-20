import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";

const SITE_URL = "https://familyplate.co";

// Top-level routes that should NEVER be indexed (auth-gated, API, internal).
// Anything not in this set is auto-included if it has a page.tsx.
const EXCLUDED_TOP_LEVEL = new Set([
  "(app)",     // route group of authenticated app pages
  "api",       // API routes
  "setup",     // signup-only setup flow
  "join",      // invite-acceptance flow
]);

// Fallback list — used if filesystem scan fails for any reason at build time.
const FALLBACK_ROUTES = [
  "/dinner-tonight",
  "/pantry-to-dinner",
  "/picky-eater-dinner-ideas",
  "/allergy-safe-meal-planner",
  "/cheap-family-dinners",
  "/dinner-ideas-chicken",
  "/dinner-ideas-ground-beef",
  "/dinner-ideas-pasta",
  "/quick-family-dinners-30-minutes",
  "/weeknight-dinner-ideas",
  "/kid-friendly-dinner-ideas",
];

function discoverPublicRoutes(): string[] {
  try {
    const appDir = path.join(process.cwd(), "src", "app");
    const entries = fs.readdirSync(appDir, { withFileTypes: true });
    const routes: string[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      // Skip route groups, dynamic segments, private folders, and excluded paths.
      if (name.startsWith("(") || name.startsWith("[") || name.startsWith("_")) continue;
      if (EXCLUDED_TOP_LEVEL.has(name)) continue;
      // Only include if it actually exposes a page.tsx (real route, not a layout-only folder).
      const hasPage = ["page.tsx", "page.ts", "page.jsx", "page.js"].some((file) =>
        fs.existsSync(path.join(appDir, name, file))
      );
      if (!hasPage) continue;
      routes.push(`/${name}`);
    }
    return routes.sort();
  } catch (err) {
    console.warn("Sitemap route discovery failed, using fallback:", err);
    return FALLBACK_ROUTES;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = discoverPublicRoutes();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...routes.map((route) => ({
      url: `${SITE_URL}${route}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: route === "/dinner-tonight" ? 0.9 : 0.8,
    })),
  ];
}
