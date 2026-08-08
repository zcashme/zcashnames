import { Button } from "@react-email/components";
import type { ReactNode } from "react";
import { ctaButton } from "@/lib/email/styles";

/** Gold CTA with black label (clients often force link text white otherwise). */
export function EmailCtaButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button href={href} style={ctaButton}>
      <span style={{ color: "#000000", fontWeight: 700 }}>{children}</span>
    </Button>
  );
}
