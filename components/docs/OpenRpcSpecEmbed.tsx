"use client";

import { useEffect, useState } from "react";
import { OpenRpcExplorer } from "./OpenRpcExplorer";

type OpenRpcSpec = Parameters<typeof OpenRpcExplorer>[0]["spec"];

export default function OpenRpcSpecEmbed() {
  const [spec, setSpec] = useState<OpenRpcSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSpec() {
      try {
        const res = await fetch("https://raw.githubusercontent.com/zcashme/ZNS/master/openrpc.json");
        if (!res.ok) {
          throw new Error(`openrpc.json fetch failed: ${res.status}`);
        }

        if (!res.headers.get("content-type")?.includes("json")) {
          throw new Error("openrpc.json response was not JSON");
        }

        const nextSpec = (await res.json()) as OpenRpcSpec;
        if (!cancelled) {
          setSpec(nextSpec);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "openrpc.json fetch failed");
        }
      }
    }

    loadSpec();

    return () => {
      cancelled = true;
    };
  }, []);

  if (spec) {
    return <OpenRpcExplorer spec={spec} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
        <p className="font-semibold">OpenRPC explorer unavailable.</p>
        <p className="mt-2 text-neutral-400">
          The raw spec is still available at{" "}
          <a className="font-semibold underline" href="https://github.com/zcashme/ZNS/blob/master/openrpc.json">
            openrpc.json
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-sm font-semibold text-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
      Loading OpenRPC explorer...
    </div>
  );
}
