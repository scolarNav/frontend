import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Start free and upgrade to Pro for personalized scholarship coaching, roadmaps and mock interviews built from your own CV.",
  path: "/pricing",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
