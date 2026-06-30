"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function EmailPreviewUnsubscribeToggle({
  value,
}: {
  value: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-fg-muted">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => {
            const params = new URLSearchParams(searchParams.toString());
            if (event.target.checked) params.set("includeUnsubscribe", "1");
            else params.set("includeUnsubscribe", "0");
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}
          className="accent-amber-500"
        />
        Include unsubscribe footer
      </label>
      <Link
        href="/internal/unsubscribe-preview"
        className="underline underline-offset-2 hover:text-fg-heading"
        target="_blank"
        rel="noreferrer"
      >
        Preview email preferences page
      </Link>
    </div>
  );
}
