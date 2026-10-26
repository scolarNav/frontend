import { NextRequest, NextResponse } from "next/server";

/**
 * First line of defence against site scraping. Runs before any page renders.
 *  - Refuses user agents that identify as scraping tools, headless browsers or AI-training crawlers.
 *  - Bans, for 24 hours, any client that follows the hidden /data-export trap link (robots.txt forbids it,
 *    and people never see it).
 * Search engines and social link-preview bots are never blocked.
 *
 * The ban list lives in memory, so it is per server instance and resets on restart. It stops casual
 * scrapers; put Cloudflare (or similar) in front for anything determined.
 */

const BLOCKED_AGENTS = new RegExp(
  [
    "scrapy", "python-requests", "python-urllib", "aiohttp", "httpx", "go-http-client", "libwww", "okhttp",
    "apache-httpclient", "java/", "curl/", "wget/", "axios/", "node-fetch", "colly", "mechanize",
    "headlesschrome", "phantomjs", "puppeteer", "playwright", "selenium", "webdriver",
    "gptbot", "chatgpt-user", "ccbot", "claudebot", "claude-web", "anthropic-ai", "bytespider", "diffbot",
    "imagesiftbot", "omgili", "cohere-ai", "amazonbot", "meta-externalagent", "petalbot", "timpibot",
    "semrushbot", "ahrefsbot", "mj12bot", "dotbot", "blexbot", "dataforseobot", "serpstatbot", "barkrowler",
  ].join("|"),
  "i"
);

const HONEYPOT_PATH = "/data-export";
const BAN_MS = 24 * 60 * 60 * 1000;
const MAX_BANS = 5000;
const banned = new Map<string, number>();

function clientIp(req: NextRequest): string {
  return req.ip ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const deny = () => new NextResponse("Automated access is not permitted.", { status: 403, headers: { "Cache-Control": "no-store" } });

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);
  const now = Date.now();

  // Let every crawler read robots.txt so polite ones can see the rules.
  if (pathname === "/robots.txt") return NextResponse.next();

  if (pathname === HONEYPOT_PATH) {
    if (banned.size >= MAX_BANS) banned.clear();
    if (ip !== "unknown") banned.set(ip, now + BAN_MS);
    return deny();
  }

  const until = banned.get(ip);
  if (until) {
    if (until > now) return deny();
    banned.delete(ip);
  }

  if (BLOCKED_AGENTS.test(req.headers.get("user-agent") ?? "")) return deny();

  return NextResponse.next();
}

export const config = {
  // Skip static assets and the revalidation hook the API calls with its own client.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/revalidate).*)"],
};
