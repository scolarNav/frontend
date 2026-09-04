import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import NavBar from "@/components/NavBar";
import CookieBanner from "@/components/CookieBanner";
import Image from "next/image";

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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://Apexli.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Apexli — Scholarships & Opportunities for Global Talent",
    template: "%s | Apexli",
  },
  description:
    "Find scholarships, study programs, and immigration or incubation pathways abroad. Get a personalized application strategy built from your own CV.",
  keywords: ["scholarships", "study abroad", "fellowships", "Nigeria", "Africa", "opportunities", "application coaching"],
  openGraph: {
    type: "website",
    siteName: "Apexli",
    title: "Apexli — Scholarships & Opportunities for Global Talent",
    description:
      "Find scholarships, study programs, and immigration or incubation pathways abroad. Get a personalized application strategy built from your own CV.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Apexli — Scholarships & Opportunities for Global Talent",
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
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body`}>
        <Providers>
          <NavBar />
          <main className="min-h-screen">{children}</main>
          <CookieBanner />
          <footer className="border-t border-rule mt-24">
            <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between gap-4 text-sm text-slate">
              <Image src="/logo/logo.png" alt="Scholarship Portal" width={120} height={32} style={{ width: "auto", height: "32px" }} />
              <span>case files for the applications that matter.</span>
              <div className="flex items-center gap-4 font-mono text-xs">
                <a href="/terms" className="hover:text-ink transition-colors">Terms</a>
                <a href="/privacy" className="hover:text-ink transition-colors">Privacy</a>
                <span>BUILT FOR THE JOURNEY ABROAD</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
