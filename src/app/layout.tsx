import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ConvexProvider } from "@/components/providers/ConvexProvider";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"], variable: "--font-display" });

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("familyplate-theme");if(t==="dark"||(t===null&&window.matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body className={`${dmSans.variable} ${dmSerif.variable} ${dmSans.className}`}>
        <ConvexProvider>
          <OfflineIndicator />
          <ToastProvider>{children}</ToastProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}
