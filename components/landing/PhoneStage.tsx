// 3D phone carousel mockup — the visual centerpiece of the landing page.
//
// Architecture layers:
//   1. Phone screens (PhoneZodl, PhoneCakeWallet, PhoneEdge, PhoneAddressBook,
//      PhoneMessages) — static wallet/app mockups rendered inside PhoneFrame.
//      They receive phoneSuffixMode to toggle .zcash/.zec display.
//   2. PhoneCarouselCard — wraps each screen with hover tilt (perspective transform)
//      and stack positioning (desktop fan layout vs mobile stack).
//   3. SecurityBadge — individual chip with floating animation + hover 3D tilt.
//   4. DraggableChip — wraps SecurityBadge in @dnd-kit Draggable for free
//      repositioning. On drag-end, detects horizontal overflow and snaps back.
//   5. PhoneStage (main) — manages carousel state (activeCardIndex), auto-advance
//      timer (9s), touch swipe, keyboard nav (ArrowLeft/Right), and the DndContext
//      for all four chips. Resets chip positions on window resize.
//   6. StageGlow — decorative layered blurs behind the phones.
//
// Embedded mode (embedded=true) is used when PhoneStage is passed as Hero's rightPanel.
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
} from "@dnd-kit/core";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";
/* Security badge icons */

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="var(--hero-chip-icon-identity-stroke)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" stroke="var(--hero-chip-icon-identity-stroke)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" stroke="var(--hero-chip-icon-endtoend-stroke)" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="var(--hero-chip-icon-endtoend-stroke)" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="var(--hero-chip-icon-endtoend-stroke)" strokeWidth="1.8" />
      <path d="M8.4 10.8l7.2-4.2M8.4 13.2l7.2 4.2" stroke="var(--hero-chip-icon-endtoend-stroke)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="var(--hero-chip-icon-yourname-fill)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="var(--hero-chip-icon-yourname-fill)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--hero-chip-icon-nologs-fill)" />
      <path d="M7.8 12.4l2.8 2.8 5.8-5.8" stroke="var(--hero-chip-icon-nologs-stroke)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Chip data */

type ChipDef = {
  id: string; icon: React.ReactNode; title: string; subtitle: string;
  themeClassName: string; background: string; glowShadow: string;
  floatDurationSeconds: number; floatDelaySeconds: number;
};

const CHIP_DEFS: ChipDef[] = [
  { id: "identity", icon: <UserIcon />, title: "Own Names", subtitle: "No Renewals", themeClassName: "hero-chip-identity", background: "var(--hero-chip-bg-fallback-identity)", glowShadow: "var(--hero-chip-glow-fallback-identity)", floatDurationSeconds: 9.8, floatDelaySeconds: -1.2 },
  { id: "endtoend", icon: <ShareIcon />, title: "Share Names", subtitle: "Not Transactions", themeClassName: "hero-chip-endtoend", background: "var(--hero-chip-bg-fallback-endtoend)", glowShadow: "var(--hero-chip-glow-fallback-endtoend)", floatDurationSeconds: 9.1, floatDelaySeconds: -4.1 },
  { id: "yourname", icon: <ChainIcon />, title: "On-Chain", subtitle: "No Middlemen", themeClassName: "hero-chip-yourname", background: "var(--hero-chip-bg-fallback-yourname)", glowShadow: "var(--hero-chip-glow-fallback-yourname)", floatDurationSeconds: 10.4, floatDelaySeconds: -2.5 },
  { id: "nologs", icon: <CheckIcon />, title: "ZcashMe Ready", subtitle: "Avoid Imposters", themeClassName: "hero-chip-nologs", background: "var(--hero-chip-bg-fallback-nologs)", glowShadow: "var(--hero-chip-glow-fallback-nologs)", floatDurationSeconds: 9.5, floatDelaySeconds: -5.0 },
];

type SlotDef = { positionClassName: string; tiltClassName: string };

const SLOT_DEFS: SlotDef[] = [
  { positionClassName: "-left-1 -top-[24px] z-30 sm:left-1 sm:top-[68px] md:left-4 md:-top-[24px] xl:-left-9 xl:-top-[14px]", tiltClassName: "-rotate-[8deg]" },
  { positionClassName: "-right-4 top-[58px] z-30 sm:right-0 sm:top-[66px] md:right-2 md:-top-[26px] xl:-right-9 xl:-top-[16px]", tiltClassName: "rotate-[6deg]" },
  { positionClassName: "-left-1 top-[500px] z-30 sm:left-10 sm:top-auto sm:bottom-[44px] md:left-[56px] xl:left-[62px] xl:bottom-[24px]", tiltClassName: "-rotate-[9deg]" },
  { positionClassName: "-right-4 top-[540px] z-30 sm:right-8 sm:top-auto sm:bottom-[44px] md:right-12 xl:right-[18px] xl:bottom-[24px]", tiltClassName: "rotate-[8deg]" },
];

/* Security badge */

function SecurityBadge({
  icon, title, subtitle, themeClassName = "", tiltClassName = "",
  background, glowShadow, floatDurationSeconds = 9.4, floatDelaySeconds = 0,
  pauseFloat = false,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  themeClassName?: string; tiltClassName?: string;
  background: string; glowShadow: string;
  floatDurationSeconds?: number; floatDelaySeconds?: number;
  pauseFloat?: boolean;
}) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -12,
      y: ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 12,
    });
  }, []);

  return (
    <div
      className="will-change-transform motion-reduce:!animate-none"
      style={pauseFloat ? {} : { animationName: "security-badge-float", animationDuration: `${floatDurationSeconds}s`, animationDelay: `${floatDelaySeconds}s`, animationTimingFunction: "cubic-bezier(0.42,0,0.58,1)", animationIterationCount: "infinite" }}
    >
      <div className={tiltClassName}>
        <div
          ref={badgeRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => { setIsHovering(false); setTilt({ x: 0, y: 0 }); }}
          className={`flex cursor-grab items-center gap-2.5 rounded-[16px] border px-3 py-2.5 backdrop-blur-[2px] transition-[transform,box-shadow] duration-150 ease-out sm:gap-3 sm:rounded-[18px] sm:px-4 sm:py-3 ${themeClassName}`}
          style={{
            transform: `perspective(860px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovering ? 1.24 : 1})`,
            transformStyle: "preserve-3d", willChange: "transform",
            background: `var(--hero-chip-bg, ${background})`,
            borderColor: "var(--hero-chip-border)",
            boxShadow: isHovering
              ? `var(--hero-chip-shell-highlight), var(--hero-chip-shell-shadow), 0 0 68px var(--hero-chip-glow, ${glowShadow}), var(--hero-chip-depth-hover)`
              : `var(--hero-chip-shell-highlight), var(--hero-chip-shell-shadow), 0 0 44px var(--hero-chip-glow, ${glowShadow}), var(--hero-chip-depth)`,
          }}
        >
          <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full sm:h-8 sm:w-8" style={{ background: "var(--hero-chip-icon-bg)" }}>
            {icon}
          </div>
          <div className="leading-[1.02]">
            <div className="text-[13px] font-semibold tracking-[-0.01em] sm:text-[15px]" style={{ color: "var(--hero-chip-title)", textShadow: "var(--hero-chip-text-shadow, none)" }}>{title}</div>
            <div className="mt-1 text-[11px] font-medium tracking-[-0.01em] sm:text-[13px]" style={{ color: "var(--hero-chip-subtitle)", textShadow: "var(--hero-chip-text-shadow, none)" }}>{subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Draggable chip */

function DraggableChip({ chip, tiltClassName, offset, isBeingDragged, register }: {
  chip: ChipDef; tiltClassName: string;
  offset: { x: number; y: number }; isBeingDragged: boolean;
  register: (key: string, node: HTMLDivElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: chip.id });
  const tx = offset.x + (transform?.x ?? 0);
  const ty = offset.y + (transform?.y ?? 0);
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        register(chip.id, node);
      }}
      className="touch-none select-none outline-none"
      style={{
        transform: `translate(${tx}px, ${ty}px) scale(var(--prox-scale, 1))`,
        filter: isBeingDragged ? "drop-shadow(0 16px 48px rgba(0,0,0,0.45))" : "drop-shadow(0 16px 40px rgba(0,0,0,var(--prox-shadow-opacity, 0)))",
        cursor: isBeingDragged ? "grabbing" : "grab",
      }}
      {...listeners}
      {...attributes}
      aria-label={`${chip.title}: ${chip.subtitle}. Drag to reposition.`}
    >
      <SecurityBadge
        icon={chip.icon} title={chip.title} subtitle={chip.subtitle}
        themeClassName={chip.themeClassName} tiltClassName={tiltClassName}
        background={chip.background} glowShadow={chip.glowShadow}
        floatDurationSeconds={chip.floatDurationSeconds} floatDelaySeconds={chip.floatDelaySeconds}
        pauseFloat={isBeingDragged}
      />
    </div>
  );
}

/* Stage glow */

function StageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      <div className="absolute -left-8 top-10 h-[300px] w-[300px] rounded-full blur-2xl" style={{ background: "var(--phone-stage-glow-a)" }} />
      <div className="absolute -right-6 top-14 h-[260px] w-[260px] rounded-full blur-2xl" style={{ background: "var(--phone-stage-glow-b)" }} />
      <div className="absolute left-4 bottom-0 h-[240px] w-[300px] rounded-full blur-[52px]" style={{ background: "var(--phone-stage-glow-c)" }} />
      <div className="absolute right-4 bottom-2 h-[250px] w-[290px] rounded-full blur-[54px]" style={{ background: "var(--phone-stage-glow-d)" }} />
      <div className="absolute left-1/2 top-[30%] h-[360px] w-[390px] -translate-x-1/2 rounded-full blur-[62px]" style={{ background: "var(--phone-stage-glow-e)" }} />
    </div>
  );
}

/* Phone screens */

function applySuffix(text: string, mode: string | null) {
  if (mode === "zec") return text.replace(/\.zcash\b/g, ".zec");
  if (mode === "zcash") return text.replace(/\.zec\b/g, ".zcash");
  return text;
}

function StatusBar({ light = true }: { light?: boolean }) {
  const c = light ? "#fff" : "#000";
  return (
    <div style={{ height: 44, position: "relative", flexShrink: 0 }}>
      <span style={{ position: "absolute", left: 26, bottom: 8, fontSize: 14, fontWeight: 600, color: c, letterSpacing: -0.3 }}>9:41</span>
      <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 92, height: 25, background: "#000", borderRadius: 14, zIndex: 10 }} />
      <div style={{ position: "absolute", right: 22, bottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill={c}>
          <rect x="0" y="7" width="3" height="5" rx="0.8" opacity="0.3" />
          <rect x="4.5" y="4.5" width="3" height="7.5" rx="0.8" opacity="0.55" />
          <rect x="9" y="2" width="3" height="10" rx="0.8" opacity="0.8" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.8" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke={c} strokeLinecap="round">
          <circle cx="8" cy="11" r="1.3" fill={c} stroke="none" />
          <path d="M4.5 7.8C5.6 6.7 6.7 6.1 8 6.1s2.4.6 3.5 1.7" strokeWidth="1.4" />
          <path d="M1.5 4.8C3.4 2.9 5.6 1.8 8 1.8s4.6 1.1 6.5 3" strokeWidth="1.4" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <div style={{ width: 22, height: 11, borderRadius: 3, border: `1.5px solid ${c}`, position: "relative", opacity: 0.9 }}>
            <div style={{ position: "absolute", inset: 1.5, background: c, borderRadius: 1, width: "80%" }} />
          </div>
          <div style={{ width: 2, height: 5, background: c, borderRadius: "0 1px 1px 0", opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ children, screenBg = "#1c1c1e", statusLight = true }: { children: React.ReactNode; screenBg?: string; statusLight?: boolean }) {
  return (
    <div className="flex-shrink-0 theme-media-home" style={{ position: "relative", width: 288, height: 596 }}>
      <div style={{ position: "absolute", left: -3, top: 108, width: 3, height: 28, background: "#3c3c3e", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", left: -3, top: 148, width: 3, height: 58, background: "#3c3c3e", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", left: -3, top: 215, width: 3, height: 58, background: "#3c3c3e", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", right: -3, top: 168, width: 3, height: 82, background: "#3c3c3e", borderRadius: "0 2px 2px 0" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 52, background: "linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 40%, #111113 100%)", boxShadow: "0 0 0 1px rgba(60,50,40,0.15), inset 0 0 0 1px #3a3a3c, 0 40px 90px rgba(60,40,20,0.25), 0 10px 30px rgba(60,40,20,0.15)" }}>
        <div style={{ position: "absolute", inset: 4, borderRadius: 48, overflow: "hidden", background: screenBg, display: "flex", flexDirection: "column" }}>
          <StatusBar light={statusLight} />
          <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
          <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 116, height: 5, background: statusLight ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.2)", borderRadius: 100 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneZodl({ mode }: { mode: string | null }) {
  return (
    <PhoneFrame screenBg="#1c1c1e">
      <div style={{ padding: "6px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b37f5" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>Send</span>
      </div>
      <div style={{ margin: "16px 20px 10px" }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>To</div>
        <div style={{ background: "#2c2c2e", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(91,55,245,0.4)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "#fff" }}>{applySuffix("zooko.zcash", mode)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
      </div>
      <div style={{ margin: "0 20px 10px" }}>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Amount</div>
        <div style={{ background: "#2c2c2e", borderRadius: 12, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>5.0</span>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 14, fontWeight: 600, color: "#5b37f5" }}>ZEC</div><div style={{ fontSize: 11, color: "#888" }}>$1,153.50 USD</div></div>
        </div>
      </div>
      <div style={{ margin: "0 20px 14px" }}><div style={{ fontSize: 11, color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Memo</div><div style={{ background: "#2c2c2e", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "#fff" }}>grocery money - {new Date().toLocaleString("en-US", { month: "long" }).toLowerCase()}</div></div>
      <div style={{ margin: "0 20px 16px", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "#666" }}>Network fee</span><span style={{ fontSize: 12, color: "#888" }}>0.00001 ZEC</span></div>
      <div style={{ margin: "0 20px" }}><button style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #5b37f5, #7c5cfc)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Send</button></div>
    </PhoneFrame>
  );
}

function PhoneCakeWallet({ mode }: { mode: string | null }) {
  return (
    <PhoneFrame screenBg="#19233c">
      <div style={{ padding: "6px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00b8fa" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 16 }}>Send Zcash</span>
      </div>
      <div style={{ margin: "12px 20px", background: "rgba(0,184,250,0.12)", borderRadius: 12, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 12, color: "#9ab0cc" }}>Available</span><span style={{ fontSize: 14, fontWeight: 600, color: "#00b8fa" }}>12.408 ZEC</span></div>
      <div style={{ margin: "0 20px 10px" }}>
        <div style={{ fontSize: 11, color: "#7a90b0", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Recipient</div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(0,184,250,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "#fff" }}>{applySuffix("satoshi.zcash", mode)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a90b0" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
        </div>
      </div>
      <div style={{ margin: "0 20px 10px" }}><div style={{ fontSize: 11, color: "#7a90b0", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Amount</div><div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>2.5</span><div style={{ textAlign: "right" }}><div style={{ fontSize: 14, fontWeight: 600, color: "#00b8fa" }}>ZEC</div><div style={{ fontSize: 11, color: "#7a90b0" }}>$576.25 USD</div></div></div></div>
      <div style={{ margin: "0 20px 14px" }}><div style={{ fontSize: 11, color: "#7a90b0", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Memo</div><div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>for coffee</div></div>
      <div style={{ margin: "0 20px" }}><button style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Send</button></div>
    </PhoneFrame>
  );
}

function PhoneEdge({ mode }: { mode: string | null }) {
  return (
    <PhoneFrame screenBg="#06090c">
      <div style={{ padding: "6px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <svg width="52" height="18" viewBox="0 0 52 18" fill="none"><text x="0" y="14" fill="#00f1a2" fontSize="16" fontWeight="700" fontFamily="system-ui">edge</text></svg>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
      </div>
      <div style={{ margin: "0 16px 10px", borderRadius: 14, background: "linear-gradient(135deg, #00604d, #003d30)", padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Zcash</div><div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>4.208 ZEC</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>$970.44</div></div>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(0,241,162,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18 }}>Z</span></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Send</button>
          <button style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Receive</button>
        </div>
      </div>
      <div style={{ margin: "0 16px 10px", background: "#111316", borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: 10, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Send to</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: "#e0e0e0" }}>{applySuffix("nakamoto.zcash", mode)}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></div></div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Recent</div>
        {[{ label: "Received", amount: "+1.2 ZEC", color: "#00f1a2", sub: "2 hrs ago" }, { label: "Sent", amount: "-0.5 ZEC", color: "#e85466", sub: "Yesterday" }].map(({ label, amount, color, sub }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #1a1a1a" }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: "#e0e0e0" }}>{label}</div><div style={{ fontSize: 11, color: "#555" }}>{sub}</div></div>
            <span style={{ fontSize: 13, fontWeight: 600, color }}>{amount}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", borderTop: "1px solid #1a1a1a", padding: "10px 0 0" }}>{["Wallets", "Exchange", "Profile"].map((item, i) => (<div key={item} style={{ flex: 1, textAlign: "center", fontSize: 10, color: i === 0 ? "#00f1a2" : "#444", fontWeight: i === 0 ? 600 : 400 }}>{item}</div>))}</div>
    </PhoneFrame>
  );
}

function PhoneAddressBook({ mode }: { mode: string | null }) {
  return (
    <PhoneFrame screenBg="linear-gradient(180deg, #1F2E4A 0%, #0F1C33 100%)">
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "0 20px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AFC3E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
          <span style={{ fontSize: 22, fontWeight: 600, color: "#C9D4E8", letterSpacing: 0.5 }}>Address Book</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AFC3E6" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 24 }}>
          <span style={{ fontSize: 20, fontWeight: 500, color: "#7F92B8" }}>Directory</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#9EB6E8" }}>Contacts</span>
            <div style={{ width: 100, height: 4, borderRadius: 2, background: "#7FA4FF", marginTop: 8 }} />
          </div>
        </div>

        {/* Contact Cards */}
        {["jswihart.zcash", "viksharma.zcash", "paulpuey.zcash", "esengulov.zcash", "kenbak.zcash"].map((name) => (
          <div key={name} style={{ margin: "8px 16px 0", height: 56, borderRadius: 16, background: "#2A3B5F", boxShadow: "0 6px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", padding: "0 16px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: "#C49A2A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{name[0].toUpperCase()}</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 500, color: "#C9D4E8", marginLeft: 12 }}>{applySuffix(name, mode)}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Bottom Nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ margin: "0 16px 0", height: 52, borderRadius: 26, background: "#2A3B5F", boxShadow: "0 4px 25px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AFC3E6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AFC3E6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="M2 10h20" /></svg>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#3A4E78", borderRadius: 24, padding: "10px 20px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D6E2FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#D6E2FF" }}>Contacts</span>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AFC3E6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M17.5 14v7M14 17.5h7" /></svg>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function PhoneMessages({ mode }: { mode: string | null }) {
  const messages: { sender: string; text: string; time: string; outgoing: boolean; compact?: boolean }[] = [
    { sender: applySuffix("satoshi.zcash", mode), text: "Hey, just sent 2 ZEC your way", time: "Mar 24, 10:22", outgoing: true },
    { sender: applySuffix("hal.zcash", mode), text: "Got it, thanks! What was it for?", time: "Mar 24, 10:23", outgoing: false },
    { sender: applySuffix("satoshi.zcash", mode), text: "For the server costs last month", time: "Mar 24, 10:24", outgoing: true },
    { sender: applySuffix("hal.zcash", mode), text: "Perfect, appreciate it", time: "Mar 24, 10:25", outgoing: false, compact: true },
    { sender: applySuffix("satoshi.zcash", mode), text: "Anytime", time: "Mar 24, 10:26", outgoing: true, compact: true },
  ];

  return (
    <PhoneFrame screenBg="linear-gradient(180deg, #0C1A12 0%, #081210 100%)">
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ textAlign: "center", padding: "8px 16px 12px", borderBottom: "1px solid rgba(207,232,214,0.1)" }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#CFE8D6" }}>Messages</span>
        </div>

        {/* Message List */}
        <div style={{ flex: 1, overflow: "hidden", padding: "8px 12px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.outgoing ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "85%", borderRadius: 24, padding: msg.compact ? "10px 16px" : "14px 16px", background: msg.outgoing ? (msg.compact ? "linear-gradient(90deg, #2A6A35, #245E30)" : "linear-gradient(90deg, #1E4D2B, #184326)") : (msg.compact ? "linear-gradient(90deg, #1A3A3A, #153232)" : "linear-gradient(90deg, #163030, #122A2A)") }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#A7CBB3", marginBottom: 6 }}>{msg.sender}</div>
                  <div style={{ fontSize: 14, fontWeight: 400, color: "#CFE8D6", lineHeight: 1.45 }}>{msg.text}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 6, gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#9FC3AC" }}>{msg.time}</span>
                    {msg.outgoing && <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 12l5 5L18 6" stroke="#4CD964" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 12l5 5L24 6" stroke="#4CD964" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* Carousel card (tilt + positioning) */

interface PhoneCarouselCardProps {
  isMobile: boolean; isActive: boolean; stackIndex: number;
  isSpotlit: boolean; rotation: number; offset: number;
  verticalOffset: number; zIndex: number;
  onClick: () => void; children: React.ReactNode;
}

function PhoneCarouselCard({ isMobile, isActive, stackIndex, isSpotlit, rotation, offset, verticalOffset, zIndex, onClick, children }: PhoneCarouselCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isMobile) return;
    const rect = cardRef.current.getBoundingClientRect();
    setTilt({
      x: ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -10,
      y: ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 10,
    });
  }, [isMobile]);

  if (isMobile) {
    const stackOffset = isActive ? -16 : stackIndex * 8;
    const stackScale = isActive ? 1.05 : 1 - stackIndex * 0.03;
    const stackRotation = stackIndex === 0 ? 0 : (stackIndex % 2 === 0 ? 2 : -2) * (stackIndex * 0.5);

    return (
      <div ref={cardRef} onClick={onClick} className="absolute cursor-pointer left-1/2" style={{ transform: `translateX(-50%) translateY(${stackOffset}px) scale(${stackScale}) rotate(${isActive ? 0 : stackRotation}deg)`, zIndex: 60 - stackIndex, transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)", opacity: isActive ? 1 : Math.max(0.4, 1 - stackIndex * 0.15), transformOrigin: "center center", willChange: "transform", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
        <div style={{ filter: "var(--phone-stage-drop-shadow)" }}>{children}</div>
      </div>
    );
  }

  const isHighlighted = isHovering || isSpotlit;

  return (
    <div ref={cardRef} onClick={onClick} onMouseMove={handleMouseMove} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => { setIsHovering(false); setTilt({ x: 0, y: 0 }); }} className="absolute cursor-pointer" style={{ transform: `translateX(${offset}px) translateY(${isHighlighted ? verticalOffset - 30 : verticalOffset}px) rotate(${isHighlighted ? 0 : rotation}deg) scale(${isHovering ? 1.05 : isHighlighted ? 1.02 : 1})`, zIndex: isHovering ? 100 : isSpotlit ? 50 : zIndex, transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s", perspective: "1000px" }}>
      <div style={{ transform: isHovering ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.08)` : isSpotlit ? "rotateX(0) rotateY(0) scale(1.05)" : "rotateX(0) rotateY(0) scale(1)", transformStyle: "preserve-3d", transition: "transform 0.2s ease-out", filter: "var(--phone-stage-drop-shadow)" }}>{children}</div>
    </div>
  );
}

/* Helpers */

function isTypingInEditableField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return !!target.closest("[contenteditable='true'], [contenteditable='']");
}

/* Main component */

interface PhoneStageProps {
  embedded?: boolean;
  phoneSuffixMode?: string | null;
}

export default function PhoneStage({ embedded = false, phoneSuffixMode = null }: PhoneStageProps) {
  const cards = [
    <PhoneZodl key="zodl" mode={phoneSuffixMode} />,
    <PhoneAddressBook key="addressbook" mode={phoneSuffixMode} />,
    <PhoneMessages key="messages" mode={phoneSuffixMode} />,
  ];

  const [isMobile, setIsMobile] = useState(false);
  const [hasTouchInput, setHasTouchInput] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(Math.floor(cards.length / 2));
  const activeCardIndexRef = useRef(activeCardIndex);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const suppressTapUntilRef = useRef(0);


  // Chip drag-and-drop state (free positioning)
  const [chipOffsets, setChipOffsets] = useState<Record<string, { x: number; y: number }>>(
    () => Object.fromEntries(CHIP_DEFS.map((c) => [c.id, { x: 0, y: 0 }]))
  );
  const [activeChipId, setActiveChipId] = useState<string | null>(null);
  const [chipAnnouncement, setChipAnnouncement] = useState("");
  const chipProximity = usePointerProximity<HTMLDivElement>({
    radius: 190,
    maxScaleBoost: 0.08,
    maxShadowOpacity: 0.22,
  });

  const chipSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleChipDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveChipId(active.id as string);
  }, []);

  const handleChipDragEnd = useCallback(({ active, delta }: DragEndEvent) => {
    setActiveChipId(null);
    const chipId = active.id as string;
    setChipOffsets((prev) => ({
      ...prev,
      [chipId]: { x: prev[chipId].x + delta.x, y: prev[chipId].y + delta.y },
    }));
    // If the chip landed off-screen causing horizontal scroll, snap it back
    requestAnimationFrame(() => {
      if (document.documentElement.scrollWidth > window.innerWidth) {
        setChipOffsets((prev) => ({ ...prev, [chipId]: { x: 0, y: 0 } }));
      }
    });
    const chip = CHIP_DEFS.find((c) => c.id === chipId);
    if (chip) setChipAnnouncement(`${chip.title} repositioned`);
  }, []);

  const SWIPE_THRESHOLD_PX = 45;
  const TAP_CANCEL_THRESHOLD_PX = 12;

  useEffect(() => { activeCardIndexRef.current = activeCardIndex; }, [activeCardIndex]);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768);
      setHasTouchInput("ontouchstart" in window || navigator.maxTouchPoints > 0);
      // Reset chip drag offsets on resize/orientation change to prevent overflow
      setChipOffsets(Object.fromEntries(CHIP_DEFS.map((c) => [c.id, { x: 0, y: 0 }])));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const getDesktopPosition = (index: number) => {
    const count = cards.length;
    const centerIdx = Math.floor(count / 2);
    const relativePos = index - activeCardIndex;
    const visualIdx = ((centerIdx + relativePos) % count + count) % count;
    const distanceFromCenter = Math.abs(visualIdx - centerIdx);
    const isLeft = visualIdx < centerIdx;
    return {
      rotation: distanceFromCenter === 0 ? 0 : (isLeft ? -12 : 12) + (distanceFromCenter - 1) * -2,
      offset: distanceFromCenter === 0 ? 0 : (isLeft ? -1 : 1) * (120 + distanceFromCenter * 50),
      verticalOffset: distanceFromCenter * 15,
      zIndex: count - distanceFromCenter,
    };
  };

  const getStackIndex = (index: number) => {
    if (!isMobile) return index;
    return (index - activeCardIndex + cards.length) % cards.length;
  };

  const canTouchSwipe = hasTouchInput && cards.length > 1;

  const autoAdvanceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shiftActiveCardRef = useRef<(delta: number) => void>(() => {});

  const shiftActiveCard = useCallback((delta: number) => {
    const count = cards.length;
    if (count <= 1) return;
    const next = ((activeCardIndexRef.current + delta) % count + count) % count;
    activeCardIndexRef.current = next;
    setActiveCardIndex(next);
  }, []);

  useEffect(() => { shiftActiveCardRef.current = shiftActiveCard; }, [shiftActiveCard]);

  const AUTO_ADVANCE_MS = 9000;

  const startAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    autoAdvanceRef.current = setInterval(() => shiftActiveCardRef.current(1), AUTO_ADVANCE_MS);
  }, []);

  const resetAutoAdvance = useCallback(() => { startAutoAdvance(); }, [startAutoAdvance]);

  useEffect(() => {
    if (cards.length <= 1) return;
    startAutoAdvance();
    return () => { if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current); };
  }, [startAutoAdvance]);

  useEffect(() => {
    if (cards.length <= 1) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (isTypingInEditableField(event.target)) return;
      event.preventDefault();
      shiftActiveCard(event.key === "ArrowRight" ? 1 : -1);
      resetAutoAdvance();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shiftActiveCard, resetAutoAdvance]);

  const handleCarouselTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!canTouchSwipe) return;
    const touch = event.touches[0];
    if (!touch) return;
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeDeltaRef.current = { x: 0, y: 0 };
  };

  const handleCarouselTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!canTouchSwipe || !swipeStartRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    swipeDeltaRef.current = { x: deltaX, y: deltaY };
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > TAP_CANCEL_THRESHOLD_PX) {
      suppressTapUntilRef.current = Date.now() + 250;
      if (event.cancelable) event.preventDefault();
    }
  };

  const handleCarouselTouchEnd = () => {
    if (!canTouchSwipe) { swipeStartRef.current = null; swipeDeltaRef.current = { x: 0, y: 0 }; return; }
    const { x: deltaX, y: deltaY } = swipeDeltaRef.current;
    if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY)) {
      shiftActiveCard(deltaX < 0 ? 1 : -1);
      resetAutoAdvance();
      suppressTapUntilRef.current = Date.now() + 300;
    }
    swipeStartRef.current = null;
    swipeDeltaRef.current = { x: 0, y: 0 };
  };

  const handleCarouselTouchCancel = () => { swipeStartRef.current = null; swipeDeltaRef.current = { x: 0, y: 0 }; };

  const handleCardClick = (index: number) => {
    if (Date.now() < suppressTapUntilRef.current) return;
    if (index !== activeCardIndex) { setActiveCardIndex(index); resetAutoAdvance(); }
  };

  const carouselClassName = embedded
    ? "relative flex justify-center items-start h-[620px] md:h-[680px] pt-6 md:pt-8"
    : "relative flex justify-center items-start h-[640px] md:h-[700px] pt-14 md:pt-20";

  const carouselContent = (
    <div
      className="relative isolate w-full overflow-visible"
      onPointerMove={chipProximity.handlePointerMove}
      onPointerLeave={chipProximity.handlePointerLeave}
    >
      <StageGlow />

      <DndContext sensors={chipSensors} onDragStart={handleChipDragStart} onDragEnd={handleChipDragEnd}>
        {CHIP_DEFS.map((chip, idx) => {
          const slot = SLOT_DEFS[idx];
          const isBeingDragged = activeChipId === chip.id;
          return (
            <div
              key={chip.id}
              className={`absolute pointer-events-auto ${slot.positionClassName}`}
              style={{ zIndex: isBeingDragged ? 9999 : undefined }}
            >
              <DraggableChip
                chip={chip}
                tiltClassName={slot.tiltClassName}
                offset={chipOffsets[chip.id]}
                isBeingDragged={isBeingDragged}
                register={chipProximity.register}
              />
            </div>
          );
        })}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{chipAnnouncement}</div>
      </DndContext>

      <div
        className={`${carouselClassName} relative z-20`}
        style={{ overflowX: embedded ? "visible" : "clip", touchAction: canTouchSwipe ? "pan-y" : undefined }}
        onTouchStart={handleCarouselTouchStart}
        onTouchMove={handleCarouselTouchMove}
        onTouchEnd={handleCarouselTouchEnd}
        onTouchCancel={handleCarouselTouchCancel}
      >
        {cards.map((card, index) => {
          const stackIndex = getStackIndex(index);
          const isActive = isMobile && index === activeCardIndex;
          const isSpotlit = !isMobile && index === activeCardIndex;
          const desktopPos = getDesktopPosition(index);
          return (
            <PhoneCarouselCard key={`phone-${index}`} isMobile={isMobile} isActive={isActive} stackIndex={stackIndex} isSpotlit={isSpotlit} rotation={desktopPos.rotation} offset={desktopPos.offset} verticalOffset={desktopPos.verticalOffset} zIndex={desktopPos.zIndex} onClick={() => handleCardClick(index)}>
              {card}
            </PhoneCarouselCard>
          );
        })}
      </div>

      {isMobile && cards.length > 1 && (
        <div className="relative z-30 mt-2 flex justify-center gap-2">
          {cards.map((_, index) => (
            <button
              key={`indicator-${index}`}
              onClick={() => setActiveCardIndex(index)}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${index === activeCardIndex ? "w-6" : ""}`}
              style={{ backgroundColor: index === activeCardIndex ? "var(--phone-stage-indicator-active)" : "var(--phone-stage-indicator-inactive)" }}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return <div className="phone-stage w-full overflow-visible relative z-20">{carouselContent}</div>;
  }

  return <section className="phone-stage w-full pt-8 pb-20 md:pt-2 md:-mt-4 overflow-visible relative z-20">{carouselContent}</section>;
}
