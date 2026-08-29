"use client";

export function ActionFeedback({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (!error && !success) return null;

  if (error) {
    return (
      <div className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
      {success}
    </div>
  );
}
