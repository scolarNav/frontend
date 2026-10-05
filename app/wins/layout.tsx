import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Scholar Wins",
  description:
    "Celebrate scholars who won scholarships, fellowships and programs with ScolarNav, and read the stories behind their applications.",
  path: "/wins",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
