export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const color =
    status === "protected"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-800/60"
      : status === "rejected"
        ? "bg-red-500/15 text-red-300 border-red-800/60"
        : status === "under_review"
          ? "bg-amber-500/15 text-amber-300 border-amber-800/60"
          : status === "accepted"
            ? "bg-sky-500/15 text-sky-300 border-sky-800/60"
            : status === "dismissed"
              ? "bg-zinc-700/40 text-zinc-300 border-zinc-700"
              : "bg-zinc-800 text-zinc-300 border-zinc-700";

  return (
    <span
      className={`inline-flex rounded border px-1.5 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}

export function RedeemedBadge({ redeemed }: { redeemed: boolean }) {
  if (!redeemed) {
    return <span className="text-xs text-zinc-500">no</span>;
  }
  return (
    <span className="inline-flex rounded border border-violet-800/60 bg-violet-500/15 px-1.5 py-0.5 text-xs font-medium text-violet-300">
      redeemed
    </span>
  );
}
