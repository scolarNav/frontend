/** @type {import('next').NextConfig} */
const CANONICAL_HOST = "www.scolarnav.com";
const APEX_HOST = "scolarnav.com";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // One trailing-slash policy: no trailing slash (Next 308-redirects /foo/ -> /foo).
  trailingSlash: false,

  async redirects() {
    return [
      // One canonical host: apex -> www (301). Hosting-level redirects should do this too;
      // this is the app-level safety net.
      {
        source: "/:path*",
        has: [{ type: "host", value: APEX_HOST }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        statusCode: 301,
      },
    ];
  },

  async headers() {
    return [
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/:path*", headers: [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] },
    ];
  },
};

module.exports = nextConfig;
