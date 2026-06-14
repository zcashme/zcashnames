/**
 * Shared React Email layout wrapper for all email templates. Provides the outer
 * <Html>/<Body>/<Container> structure, dark background theme, ZcashNames logo,
 * preview text, heading, dividers, and a social links footer. Every email
 * component in this directory composes with EmailLayout to ensure consistent
 * branding and rendering across email clients.
 */
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { SOCIALS } from "@/lib/email/constants";
import {
  body as bodyStyle,
  container as containerStyle,
  heading as headingStyle,
  divider as dividerStyle,
} from "@/lib/email/styles";

function socialBadgeLabel(alt: string): string {
  if (alt === "X / Twitter") return "X";
  if (alt === "Discord") return "D";
  if (alt === "Signal") return "S";
  if (alt === "Telegram") return "T";
  return alt.slice(0, 1).toUpperCase();
}

export function EmailLayout({
  preview,
  headingText,
  children,
}: {
  preview: string;
  headingText: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={{ padding: "40px 40px 24px", textAlign: "center" as const }}>
            <Link href="https://zcashnames.com" style={{ textDecoration: "none", display: "inline-block" }}>
              <Img
                src="https://zcashnames.com/brandkit/zcashnames-primary-logo-white-black-square-background-403x403.png"
                alt="ZcashNames"
                width="48"
                height="48"
                style={{ display: "block", margin: "0 auto", border: "0" }}
              />
            </Link>
          </Section>

          <Heading style={headingStyle}>{headingText}</Heading>

          <Hr style={dividerStyle} />

          {children}

          <Hr style={{ ...dividerStyle, margin: "0 40px 24px" }} />

          <Section style={{ textAlign: "center" as const, padding: "0 40px 12px" }}>
            <Text style={{ margin: "0 0 12px", fontSize: 13, color: "#d4d4d8" }}>
              Join the community
            </Text>
            <table role="presentation" style={{ margin: "0 auto", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  {SOCIALS.map(({ href, alt }) => (
                    <td key={alt} style={{ padding: "0 8px" }}>
                      <Link
                        href={href}
                        aria-label={alt}
                        title={alt}
                        style={{
                          display: "inline-block",
                          width: "28px",
                          height: "28px",
                          lineHeight: "28px",
                          borderRadius: "999px",
                          border: "1px solid #3f3f46",
                          color: "#d4d4d8",
                          textAlign: "center",
                          textDecoration: "none",
                          fontSize: "12px",
                          fontWeight: "700",
                          fontFamily: "Arial, sans-serif",
                          backgroundColor: "#111111",
                        }}
                      >
                        {socialBadgeLabel(alt)}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ textAlign: "center" as const, padding: "0 40px 32px" }}>
            <Text style={{ margin: 0, fontSize: 12, color: "#d4d4d8" }}>
              <Link href="https://zcashnames.com" style={{ color: "#d4d4d8", textDecoration: "underline" }}>
                zcashnames.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
