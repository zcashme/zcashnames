"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

// Dismissable launch-announcement banner rendered on cabal pages. Visibility
// is gated on pathname prefix /cabal. Dismissing hides the bar until reload.
// Links to an external X/Twitter launch video post.
export default function CabalLaunchBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

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
        className="site-announcement-dismiss"
        onClick={() => setVisible(false)}
        aria-label="Dismiss launch video banner"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
