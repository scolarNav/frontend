"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * "About this grant" body. The server renders the stored description (so it is in the HTML crawlers
 * read); in the browser we then try to upgrade it with the fuller text scraped from the source page.
 */
export default function GrantBody({ grantId, description }: { grantId: string; description: string }) {
  const [text, setText] = useState(description);

  useEffect(() => {
    let cancelled = false;
    api.get<{ content: string | null }>(`/grants/${grantId}/content`, { auth: false })
      .then(({ content }) => { if (!cancelled && content) setText(content); })
      .catch(() => { /* keep the stored description */ });
    return () => { cancelled = true; };
  }, [grantId]);

  return (
    <div className="text-sm text-ink-soft leading-relaxed space-y-4">
      {text
        .split(/\n{2,}/)
        .map((para) => para.trim())
        .filter((para) => para.length > 0)
        .map((para, i) => (
          <p key={i}>{para}</p>
        ))}
    </div>
  );
}
