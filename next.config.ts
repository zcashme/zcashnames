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

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/api/confirm",
        has: [{ type: "query", key: "token", value: "(?<token>.+)" }],
        destination: "/?token=:token",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https://www.zcashnames.com https://hackmd.io",
            "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
            "connect-src 'self' https://vitals.vercel-insights.com",
          ].join("; ") },
        ],
      },
    ];
  },
};

export default withNextra(nextConfig);
