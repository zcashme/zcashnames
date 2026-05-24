// Next.js configuration for the ZcashNames documentation site.
// Wraps the default config with the Nextra docs plugin and enriches it with:
//   - Domain redirects (zcashna.me, zcashname.com → zcashnames.com)
//   - Security headers (CSP, HSTS, framing, referrer policy)
//   - A /api/confirm redirect that passes a ?token through to the landing page
//   - Windows symlink workaround for OneDrive reparse points
import type { NextConfig } from "next";
import nextra from "nextra";
import fs from "node:fs";

// OneDrive-managed files on Windows can be reparse points that are not real symlinks.
// Some tooling calls readlink() on them and gets EINVAL, which should be treated as
// "not a symlink" instead of a hard failure.
const isWindows = process.platform === "win32";

function shouldIgnoreReadlinkError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EINVAL" || code === "UNKNOWN";
}

if (isWindows) {
  const originalReadlink = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = (async (...args: Parameters<typeof originalReadlink>) => {
    try {
      return await originalReadlink(...args);
    } catch (error) {
      if (shouldIgnoreReadlinkError(error)) return null as never;
      throw error;
    }
  }) as typeof fs.promises.readlink;

  const originalReadlinkSync = fs.readlinkSync.bind(fs);
  fs.readlinkSync = ((...args: Parameters<typeof originalReadlinkSync>) => {
    try {
      return originalReadlinkSync(...args);
    } catch (error) {
      if (shouldIgnoreReadlinkError(error)) return null as never;
      throw error;
    }
  }) as typeof fs.readlinkSync;
}

const withNextra = nextra({
  contentDirBasePath: "/docs",
});

const distDir = process.env.NODE_ENV === "development" ? ".next-dev" : ".next";

const nextConfig: NextConfig = {
  distDir,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "zcashna.me" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.zcashna.me" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "zcashname.com" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.zcashname.com" }],
        destination: "https://www.zcashnames.com/:path*",
        permanent: true,
      },
      {
        source: "/api/confirm",
        has: [{ type: "query", key: "token", value: "(?<token>.+)" }],
        destination: "/waitlist?token=:token",
        permanent: false,
      },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const connectSrc = [
      "'self'",
      "https://vitals.vercel-insights.com",
      "https://light.zcash.me/zns-testnet",
      "https://light.zcash.me/zns-mainnet",
      "https://light.zcash.me/mempool-mainnet",
      ...(isDev ? ["http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*"] : []),
    ].join(" ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://www.zcashnames.com https://hackmd.io",
              "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              `connect-src ${connectSrc}`,
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextra(nextConfig);
