"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readLocalStorage, writeLocalStorage } from "@/components/hooks/useLocalStorage";

// Dismissable launch-announcement banner rendered on cabal pages. Visibility
// is gated on pathname prefix /cabal and a localStorage flag. Dismissing
// persists the flag and hides the bar permanently for that browser.
// Links to an external X/Twitter launch video post.
export default function CabalLaunchBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(readLocalStorage<string>("cabal-launch-banner-dismissed", "false") !== "true");
  }, []);

  if (!pathname.startsWith("/cabal") || !visible) return null;

  return (
    <div className="influencer-launch-banner">
      <a
        href="https://x.com/ZcashNames/status/2043720836197290392?s=20"
        target="_blank"
        rel="noreferrer"
      >
        <span className="influencer-launch-badge">NEW</span>
        <span className="influencer-launch-copy">
          Watch our launch video <span>&rarr;</span>
        </span>
      </a>
      <button
        type="button"
        onClick={() => {
          writeLocalStorage("cabal-launch-banner-dismissed", "true");
          setVisible(false);
        }}
        aria-label="Dismiss launch video banner"
      >
        x
      </button>
    </div>
  );
}
