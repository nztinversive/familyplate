import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexProvider } from "@/components/providers/ConvexProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { WebMCPProvider } from "@/components/agent/WebMCPProvider";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-display" });

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "FamilyPlate",
  url: "https://familyplate.co",
  logo: "https://familyplate.co/icon-512.png",
  description: "AI-powered family meal planning that builds weekly dinners around your pantry, allergies, and taste preferences.",
  slogan: "Smart family dinner planning & pantry management",
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "FamilyPlate",
  url: "https://familyplate.co",
  description: "AI-powered family meal planning that builds weekly dinners around your pantry, allergies, and taste preferences.",
  publisher: { "@type": "Organization", name: "FamilyPlate" },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://familyplate.co"),
  title: "FamilyPlate",
  description: "Smart family dinner planning & pantry management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FamilyPlate",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "FamilyPlate",
    description: "Smart family dinner planning & pantry management",
    siteName: "FamilyPlate",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "FamilyPlate" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FamilyPlate",
    description: "Smart family dinner planning & pantry management",
    images: ["/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a9d5c",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("familyplate-theme");if(t==="dark"||(t===null&&window.matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
      </head>
      <body className={`${dmSans.variable} ${dmSerif.variable} ${dmSans.className}`}>
        <ConvexAuthNextjsServerProvider>
          <ConvexProvider>
            <PostHogProvider>
              <WebMCPProvider />
              <OfflineIndicator />
              <ToastProvider>{children}</ToastProvider>
            </PostHogProvider>
          </ConvexProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
