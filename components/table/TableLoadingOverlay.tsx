"use client";

import useVisibleContainerCenter from "@/components/hooks/useVisibleContainerCenter";

export default function TableLoadingOverlay({
  active,
  anchorElement,
  label,
}: {
  active: boolean;
  anchorElement: HTMLElement | null;
  label: string;
}) {
  const overlayCenter = useVisibleContainerCenter(anchorElement, active);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
      style={{
        background: "color-mix(in srgb, var(--color-background) 36%, transparent)",
        backdropFilter: "blur(3px)",
      }}
      aria-hidden="true"
    >
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 px-5 py-4"
        style={{
          left: `${overlayCenter.x}px`,
          top: `${overlayCenter.y}px`,
        }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"
          style={{ color: "var(--color-accent-interactive)" }}
        />
        <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}
