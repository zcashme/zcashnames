import { Head as NextraHead } from "nextra/components";

export default function Head() {
  // Docs are dark-only (forcedTheme); keep FOUC/background aligned.
  return <NextraHead backgroundColor={{ dark: "#0a0a0a", light: "#0a0a0a" }} />;
}
