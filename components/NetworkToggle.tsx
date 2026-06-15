"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useZns, type ZnsMode } from "@/components/hooks/useZns";
import { verifyBetaPassword } from "@/lib/beta/actions";
import BetaPasswordModal from "@/components/beta/BetaPasswordModal";

type BetaMode = Exclude<ZnsMode, "waitlist">;
const STAGE_OPTIONS: BetaMode[] = ["mainnet", "testnet"];

export default function NetworkToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const { zns, hasBeta, setMode } = useZns();
  const [pendingTarget, setPendingTarget] = useState<BetaMode | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const onWaitlist = pathname === "/waitlist";
  const onHome = pathname === "/";

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  if (!onWaitlist && !onHome) return null;

  const activeSegment = onWaitlist ? "waitlist" : "stage";
  const activeStage: BetaMode = zns.mode === "testnet" ? "testnet" : "mainnet";

  function switchTo(mode: BetaMode) {
    setMode(mode);
    setMenuOpen(false);
    if (onWaitlist) router.push("/");
  }

  function requestStage(mode: BetaMode) {
    if (mode === activeStage && !onWaitlist) {
      setMenuOpen(false);
      return;
    }
    if (onWaitlist && !hasBeta) {
      setPendingTarget(mode);
      setMenuOpen(false);
      return;
    }
    switchTo(mode);
  }

  function handleStageSegmentClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (activeSegment === "stage") {
      setMenuOpen((current) => !current);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const triggerStart = rect.left + rect.width * (2 / 3);

    if (event.clientX >= triggerStart) {
      setMenuOpen((current) => !current);
      return;
    }

    requestStage(activeStage);
  }

  function handleWaitlistClick() {
    setMenuOpen(false);
    if (onWaitlist) return;
    router.push("/waitlist");
  }

  async function handlePasswordSubmit(password: string): Promise<boolean> {
    if (!pendingTarget) return false;
    const result = await verifyBetaPassword(password, pendingTarget);
    if (!result.ok) return false;
    switchTo(pendingTarget);
    setPendingTarget(null);
    return true;
  }

  return (
    <>
      <div
        ref={rootRef}
        className="relative flex items-center rounded-full h-8 text-sm font-bold tracking-tight leading-none"
        style={{ "--i": activeSegment === "stage" ? 0 : 1, isolation: "isolate", background: "var(--color-raised)" }}
      >
        <span
          className="absolute inset-y-0 rounded-full pointer-events-none"
          style={{
            left: 0,
            width: "50%",
            transform: "translateX(calc(var(--i) * 100%))",
            transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
            background: "var(--color-raised)",
            boxShadow: "0 0 0 2px var(--fg-heading)",
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 h-full" style={{ width: "50%" }}>
          <button
            type="button"
            className="relative z-10 flex h-full w-full items-center justify-center px-3 rounded-full whitespace-nowrap transition-opacity duration-200 cursor-pointer"
            style={{ width: "100%", opacity: activeSegment === "stage" ? 1 : 0.4 }}
            aria-pressed={activeSegment === "stage"}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={handleStageSegmentClick}
          >
            <span className="flex items-center gap-1 px-2.5">
              <span>{activeStage === "mainnet" ? "Mainnet" : "Testnet"}</span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="h-3 w-3 transition-transform duration-200"
                style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="M4 6.5L8 10L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-[calc(100%+0.45rem)] min-w-full overflow-hidden rounded-[16px] border p-1.5"
              style={{
                borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 88%, transparent), color-mix(in srgb, var(--faq-border) 20%, transparent))",
                boxShadow: "0 16px 34px color-mix(in srgb, #000 14%, transparent)",
                backdropFilter: "blur(10px)",
              }}
            >
              {STAGE_OPTIONS.map((mode) => {
                const selected = mode === activeStage;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className="flex w-full cursor-pointer items-center justify-between rounded-[12px] px-4 py-2 text-left transition-colors duration-150"
                    style={{
                      color: selected ? "var(--fg-heading)" : "var(--fg-body)",
                      background: selected ? "color-mix(in srgb, var(--fg-heading) 9%, transparent)" : "transparent",
                    }}
                    onClick={() => requestStage(mode)}
                  >
                    <span className="pr-3">{mode === "mainnet" ? "Mainnet" : "Testnet"}</span>
                    {selected ? (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: "var(--fg-heading)" }}
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full whitespace-nowrap transition-opacity duration-200 cursor-pointer"
          style={{ width: "50%", opacity: activeSegment === "waitlist" ? 1 : 0.4 }}
          aria-pressed={activeSegment === "waitlist"}
          onClick={handleWaitlistClick}
        >
          Waitlist
        </button>
      </div>

      {pendingTarget && (
        <BetaPasswordModal
          target={pendingTarget}
          onCancel={() => setPendingTarget(null)}
          onSubmit={handlePasswordSubmit}
        />
      )}
    </>
  );
}
