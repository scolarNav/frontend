import WinsWall from "@/components/WinsWall";
import { fetchCelebrations } from "@/lib/opportunities";

export const dynamic = "force-dynamic";

export default async function WinsPage() {
  const celebrations = await fetchCelebrations().catch(() => null);
  return <WinsWall initial={celebrations} />;
}
