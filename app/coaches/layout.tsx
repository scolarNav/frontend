import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Become a Scholarship Coach",
  description:
    "Scholarship alumni and panel members can coach serious applicants on ScolarNav. Set your own rate and availability.",
  path: "/coaches",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
