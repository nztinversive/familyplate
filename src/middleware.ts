import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

// Markdown content for the homepage when agents request Accept: text/markdown
const HOMEPAGE_MARKDOWN = `# FamilyPlate

> Smart family dinner planning & pantry management

FamilyPlate is an AI-powered meal planning app that creates personalized weekly
dinner plans based on your pantry, preferences, and past favorites.

## Features

- **AI That Learns You** — Plans improve every week based on your ratings.
- **Allergy Safe** — Server-side allergen enforcement with derivative mapping
  for 10+ allergen categories.
- **Smart Grocery Lists** — One-tap shopping list generation that subtracts
  what you already have.
- **Built for Families** — Each member sets their own preferences, allergies,
  and dislikes.
- **Tonight's Dinner** — Instant dinner ideas from what's already in your
  pantry.
- **Your Cookbook** — Save recipes you love and build a personal collection.

## How It Works

1. **Set Preferences** — Add dietary preferences, allergies, and dislikes.
2. **Stock Your Pantry** — Add what you already have.
3. **Generate Your Plan** — Get 7 personalized dinners in seconds.
4. **Cook & Rate** — Mark meals cooked, rate them, and the AI learns.

## Pricing

- **Free** — Get started with the basics. No credit card required.
- **Family** — Unlimited plans and full experience.

## Agent Resources

- Sitemap: https://familyplate.co/sitemap.xml
- API Catalog: https://familyplate.co/.well-known/api-catalog
- MCP Server Card: https://familyplate.co/.well-known/mcp/server-card.json
- Agent Skills Index: https://familyplate.co/.well-known/agent-skills/index.json

## Links

- Website: https://familyplate.co
- Start Planning Free: https://familyplate.co/
`;

export const middleware = convexAuthNextjsMiddleware(async (request) => {
  const { pathname } = request.nextUrl;
  const accept = request.headers.get("accept") ?? "";

  // Serve markdown on homepage when agent explicitly requests it
  if (pathname === "/" && accept.includes("text/markdown")) {
    const tokenEstimate = Math.ceil(HOMEPAGE_MARKDOWN.length / 4);
    return new NextResponse(HOMEPAGE_MARKDOWN, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "x-markdown-tokens": String(tokenEstimate),
        "Vary": "Accept",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
