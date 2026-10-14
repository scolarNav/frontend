/** Who may use paid AI features: Pro subscribers, including those on the free trial. Mirrors the backend check. */
export function hasAiAccess(user: { subscription?: { plan?: string; status?: string } | null } | null | undefined): boolean {
  const sub = user?.subscription;
  return sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");
}
