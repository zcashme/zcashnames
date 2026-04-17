/**
 * Re-serves the canonical openrpc.json from the ZNS indexer repo so that
 * external tooling can keep pointing at https://www.zcashnames.com/openrpc.json
 * without us mirroring the file into this repo.
 */

const UPSTREAM =
  "https://raw.githubusercontent.com/zcashme/ZNS/master/openrpc.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(UPSTREAM);
  if (!res.ok) {
    return new Response(`Upstream openrpc.json fetch failed: ${res.status}`, {
      status: 502,
    });
  }
  return new Response(await res.text(), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
