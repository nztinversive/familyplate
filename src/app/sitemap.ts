import type { MetadataRoute } from "next";

const SITE_URL = "https://familyplate.co";

const AEO_ROUTES = [
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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...AEO_ROUTES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/dinner-tonight" ? 0.9 : 0.8,
    })),
  ];
}
