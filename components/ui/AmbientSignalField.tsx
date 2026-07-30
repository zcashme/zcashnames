"use client";

import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from "react";

type ParticleKind = "node" | "ring" | "streak";
type DepthLayer = "background" | "middle" | "foreground";
type Density = "low" | "medium" | "high";

interface SignalParticle {
  id: string;
  kind: ParticleKind;
  layer: DepthLayer;
  size: number;
  y: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
  pathVariant: number;
  startX: number;
  endX: number;
  width?: number;
}

type AmbientSignalFieldProps = {
  density?: Density;
  timerExclusionRef?: RefObject<HTMLElement | null>;
  className?: string;
  styleOverride?: CSSProperties;
};

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return ((value >>> 0) % 10000) / 10000;
  };
}

function useViewportBucket() {
  const [bucket, setBucket] = useState<"mobile" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setBucket("mobile");
        return;
      }
      if (width < 1024) {
        setBucket("tablet");
        return;
      }
      setBucket("desktop");
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return bucket;
}

function getParticleTargetCount(bucket: "mobile" | "tablet" | "desktop", density: Density) {
  const counts = {
    mobile: { low: 8, medium: 11, high: 12 },
    tablet: { low: 10, medium: 15, high: 16 },
    desktop: { low: 14, medium: 19, high: 20 },
  } as const;

  return counts[bucket][density];
}

function pickSpanningY(random: () => number, index: number, count: number) {
  const coverageBands = [
    [6, 20],
    [16, 32],
    [28, 48],
    [44, 66],
    [60, 82],
    [74, 95],
  ] as const;
  const band = coverageBands[index % coverageBands.length];
  const [start, end] = band;
  const jitter = (random() - 0.5) * ((end - start) * 0.22);
  const value = start + random() * (end - start) + jitter;
  return Math.min(95, Math.max(6, value));
}

function buildParticles(
  count: number,
  seedKey: string,
  bucket: "mobile" | "tablet" | "desktop",
): SignalParticle[] {
  const random = createSeededRandom(hashSeed(seedKey));
  const particles: SignalParticle[] = [];
  const desktopPathVariants = bucket === "desktop" ? 5 : bucket === "tablet" ? 4 : 3;

  const pickKind = (index: number): ParticleKind => {
    const ratio = index / count;
    if (ratio < 0.6) return "node";
    if (ratio < 0.85) return "ring";
    return "streak";
  };

  const pickLayer = (): DepthLayer => {
    const pattern: DepthLayer[] = [
      "background",
      "middle",
      "foreground",
      "background",
      "middle",
      "foreground",
    ];
    return pattern[particles.length % pattern.length];
  };

  for (let index = 0; index < count; index += 1) {
    const kind = pickKind(index);
    const layer = pickLayer();
    const y = pickSpanningY(random, index, count);

    const startX = 68 + Math.pow(random(), 0.42) * 48;
    const endX = -18 - random() * 18;
    const layerScale = layer === "background" ? 0 : layer === "middle" ? 1 : 2;
    const baseSize = kind === "streak" ? 10 : kind === "ring" ? 7 : 6;
    const size = baseSize + layerScale * (kind === "streak" ? 5 : 3) + random() * 3;
    const driftRange = layer === "background" ? 18 : layer === "middle" ? 24 : 30;
    const drift = (random() - 0.5) * driftRange;
    const durationBase = layer === "background" ? 46 : layer === "middle" ? 36 : 28;
    const duration = durationBase + random() * 14;
    const opacityBase = layer === "background" ? 0.16 : layer === "middle" ? 0.28 : 0.4;
    const opacity = opacityBase + random() * 0.18;
    const delay = -random() * duration;
    const width = kind === "streak"
      ? (bucket === "mobile" ? 26 : bucket === "tablet" ? 32 : 38) + random() * 20
      : undefined;

    particles.push({
      id: `particle-${index}`,
      kind,
      layer,
      size,
      y,
      duration,
      delay,
      drift,
      opacity,
      pathVariant: Math.floor(random() * desktopPathVariants),
      startX,
      endX,
      width,
    });
  }

  return particles;
}

export function AmbientSignalField({
  density = "medium",
  timerExclusionRef: _timerExclusionRef,
  className,
  styleOverride,
}: AmbientSignalFieldProps) {
  const bucket = useViewportBucket();
  const count = getParticleTargetCount(bucket, density);

  const particles = useMemo(
    () => buildParticles(count, `ambient-signal-${density}-${bucket}`, bucket),
    [bucket, count, density],
  );

  const backgroundParticles = particles.filter((particle) => particle.layer === "background");
  const middleParticles = particles.filter((particle) => particle.layer === "middle");
  const foregroundParticles = particles.filter((particle) => particle.layer === "foreground");

  return (
    <div
      className={["ambient-signal-field", className].filter(Boolean).join(" ")}
      style={styleOverride}
      aria-hidden="true"
    >
      <div className="signal-layer signal-layer--background">
        {backgroundParticles.map((particle) => (
          <SignalParticleNode key={particle.id} particle={particle} />
        ))}
      </div>
      <div className="signal-layer signal-layer--middle">
        {middleParticles.map((particle) => (
          <SignalParticleNode key={particle.id} particle={particle} />
        ))}
      </div>
      <div className="signal-layer signal-layer--foreground">
        {foregroundParticles.map((particle) => (
          <SignalParticleNode key={particle.id} particle={particle} />
        ))}
      </div>
    </div>
  );
}

function SignalParticleNode({ particle }: { particle: SignalParticle }) {
  return (
    <span
      className={`signal-particle signal-particle--${particle.kind} signal-particle--${particle.layer} signal-path-${particle.pathVariant}`}
      style={{
        ["--signal-size" as string]: `${particle.size}px`,
        ["--signal-width" as string]: `${particle.width ?? particle.size}px`,
        ["--signal-y" as string]: `${particle.y}%`,
        ["--signal-start-x" as string]: `${particle.startX}%`,
        ["--signal-end-x" as string]: `${particle.endX}%`,
        ["--signal-drift" as string]: `${particle.drift}px`,
        ["--signal-duration" as string]: `${particle.duration}s`,
        ["--signal-delay" as string]: `${particle.delay}s`,
        ["--signal-opacity" as string]: `${particle.opacity}`,
      }}
    >
      <span className="signal-particle__visual" />
    </span>
  );
}
