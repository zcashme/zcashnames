"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AmbientSignalField } from "@/components/ui/AmbientSignalField";
import { VerifyEarlyAccessCounter } from "@/components/verify/WaitlistVerifyClient";

export default function VerifyAmbientHeroSection({
  earlyAccessStartAt,
  hero,
  footer,
  bandInsetClassName = "-mt-10 pt-10 sm:-mt-14 sm:pt-14",
}: {
  earlyAccessStartAt: string;
  hero: ReactNode;
  footer?: ReactNode;
  bandInsetClassName?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [fieldHeight, setFieldHeight] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (!sectionRef.current || !heroRef.current) return;

      const sectionRect = sectionRef.current.getBoundingClientRect();
      const heroRect = heroRef.current.getBoundingClientRect();
      const overlap = window.innerWidth < 640 ? 28 : 40;
      const height = Math.max(0, heroRect.top - sectionRect.top + overlap);
      setFieldHeight(height);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={["relative isolate overflow-x-clip", bandInsetClassName].join(" ")}
    >
      <AmbientSignalField
        density="medium"
        className="absolute left-1/2 top-0 w-[100dvw] max-w-none -translate-x-1/2"
        styleOverride={fieldHeight ? { height: `${fieldHeight}px` } : undefined}
      />
      <div className="relative z-10">
        <div className="mb-10 text-center sm:mb-12">
          <VerifyEarlyAccessCounter earlyAccessStartAt={earlyAccessStartAt} />
        </div>
        <div ref={heroRef}>{hero}</div>
        {footer}
      </div>
    </section>
  );
}
