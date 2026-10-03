import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ConditionalShell from "@/components/ConditionalShell";
import CookieBanner from "@/components/CookieBanner";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scholarnav.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ScolarNav — Scholarships & Opportunities for Global Talent",
    template: "%s | ScolarNav",
  },
  description:
    "Find scholarships, study programs, and immigration or incubation pathways abroad. Get a personalized application strategy built from your own CV.",
  keywords: ["scholarships", "study abroad", "fellowships", "Chevening", "DAAD", "Erasmus", "Gates Cambridge", "opportunities", "application coaching", "scholarship deadline", "international students"],
  openGraph: {
    type: "website",
    siteName: "ScolarNav",
    title: "ScolarNav — Scholarships & Opportunities for Global Talent",
    description:
      "Find scholarships, study programs, and immigration or incubation pathways abroad. Get a personalized application strategy built from your own CV.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "ScolarNav — Scholarships & Opportunities for Global Talent",
    description:
      "Find scholarships, study programs, and immigration or incubation pathways abroad. Get a personalized application strategy built from your own CV.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body`}>
        <Providers>
          <ConditionalShell>{children}</ConditionalShell>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
