import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What's For Dinner Tonight? Free Pantry-to-Dinner Generator | FamilyPlate",
  description:
    "Type what's in your kitchen, get 3 dinner ideas you can actually cook tonight. Free, no signup. Built for families and busy weeknights.",
  alternates: { canonical: "/dinner-tonight" },
  openGraph: {
    title: "What's For Dinner Tonight? Free Pantry-to-Dinner Generator",
    description:
      "Type what's in your kitchen, get 3 dinner ideas you can actually cook tonight. Free, no signup.",
    type: "website",
    url: "/dinner-tonight",
  },
  twitter: {
    card: "summary_large_image",
    title: "What's For Dinner Tonight?",
    description:
      "Type what's in your kitchen, get 3 dinner ideas you can cook tonight. Free.",
  },
};

export default function DinnerTonightLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
