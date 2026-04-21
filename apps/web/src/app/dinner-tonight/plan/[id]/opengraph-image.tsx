import { ImageResponse } from "next/og";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";

export const runtime = "edge";
export const alt = "Tonight's family dinner ideas — FamilyPlate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";

export default async function OgImage({ params }: { params: { id: string } }) {
  let suggestionNames: string[] = [];
  let craving: string | undefined;

  try {
    const client = new ConvexHttpClient(CONVEX_URL);
    const plan = (await client.query(api.queries.publicDinner.getPlan, {
      id: params.id as Id<"publicPlans">,
    })) as { suggestions: Array<{ name: string }>; craving?: string } | null;
    if (plan) {
      suggestionNames = plan.suggestions.map((s) => s.name).slice(0, 3);
      craving = plan.craving;
    }
  } catch {
    // fall through to default card
  }

  const fallbackNames = ["Garlic Chicken Stir Fry", "Cheesy Pasta Bake", "Black Bean Tacos"];
  const names = suggestionNames.length > 0 ? suggestionNames : fallbackNames;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #fef3c7 100%)",
          padding: "60px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "28px",
            color: "#1a9d5c",
            fontWeight: 700,
          }}
        >
          🍳 FamilyPlate
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              color: "#65758b",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "16px",
              fontWeight: 600,
            }}
          >
            Tonight's dinner ideas
          </div>
          <div
            style={{
              fontSize: "64px",
              color: "#0f172a",
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: "32px",
            }}
          >
            3 dinners from
            <br />
            your pantry
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {names.map((name, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  fontSize: "32px",
                  color: "#1e293b",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "rgba(26, 157, 92, 0.12)",
                    color: "#1a9d5c",
                    fontSize: "22px",
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontWeight: 600 }}>{name}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#64748b",
            fontSize: "20px",
            borderTop: "2px solid #e2e8f0",
            paddingTop: "24px",
          }}
        >
          <div>{craving ? `Built for: ${craving}` : "Generate yours free →"}</div>
          <div style={{ fontWeight: 600 }}>familyplate.co/dinner-tonight</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
