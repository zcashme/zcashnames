"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCampaignAction } from "@/app/admin/campaigns/create-action";

export default function CreateCampaignButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={async () => {
          setError(null);
          const result = await createCampaignAction();
          if (!result.ok) {
            setError(result.error);
            return;
          }
          startTransition(() => {
            router.push(`/admin/campaigns/drafts/${result.id}`);
          });
        }}
        disabled={isPending}
        className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        New campaign
      </button>
      {error && <span className="text-sm text-red-400">{error}</span>}
    </div>
  );
}
