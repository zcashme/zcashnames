"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { emitNavigationProgressStartForHref } from "@/lib/navigation/navigationProgress";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * App router that starts the header fill before programmatic push/replace.
 * Same-URL and off-origin hrefs are left alone.
 */
export function useAppRouter(): AppRouter {
  const router = useRouter();

  const push = useCallback<AppRouter["push"]>(
    (href, options) => {
      emitNavigationProgressStartForHref(href);
      return router.push(href, options);
    },
    [router],
  );

  const replace = useCallback<AppRouter["replace"]>(
    (href, options) => {
      emitNavigationProgressStartForHref(href);
      return router.replace(href, options);
    },
    [router],
  );

  return { ...router, push, replace };
}
