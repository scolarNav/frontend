import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ConditionalShell from "@/components/ConditionalShell";
import CookieBanner from "@/components/CookieBanner";
import { IS_PRODUCTION_SITE, SITE_URL, siteConfig } from "@/lib/site";

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

const DEFAULT_TITLE = `${siteConfig.name} — ${siteConfig.tagline}`;

export const viewport: Viewport = {
  themeColor: "#1a2d45",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: siteConfig.name,
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // Pages set their own canonical via pageMetadata(); a root-level canonical would leak to every child.
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    title: DEFAULT_TITLE,
    description: siteConfig.description,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: siteConfig.description,
    ...(siteConfig.twitterHandle ? { site: siteConfig.twitterHandle } : {}),
  },
  verification: {
    google: siteConfig.verification.google,
    other: siteConfig.verification.bing ? { "msvalidate.01": siteConfig.verification.bing } : undefined,
  },
  // Staging/preview deployments must never be indexed; production is indexable by default.
  robots: IS_PRODUCTION_SITE
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
    : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body`}>
        <Providers>
          <ConditionalShell>{children}</ConditionalShell>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
