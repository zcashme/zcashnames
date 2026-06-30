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

export interface EmailHeaderMark {
  primaryHref?: string;
  primarySrc?: string;
  primaryAlt?: string;
  secondarySrc?: string;
  secondaryAlt?: string;
}

export const ZCASHNAMES_HEADER_MARK: Required<
  Pick<EmailHeaderMark, "primaryHref" | "primarySrc" | "primaryAlt">
> = {
  primaryHref: "https://www.zcashnames.com",
  primarySrc: "https://www.zcashnames.com/brandkit/zcashnames-primary-logo-white-transparent-377x403.png",
  primaryAlt: "ZcashNames",
};

export function createZcashNamesHeaderMark(
  overrides: EmailHeaderMark = {},
): Required<Pick<EmailHeaderMark, "primaryHref" | "primarySrc" | "primaryAlt">> &
  Pick<EmailHeaderMark, "secondarySrc" | "secondaryAlt"> {
  return {
    ...ZCASHNAMES_HEADER_MARK,
    ...overrides,
  };
}

export function EmailLayout({
  preview,
  headingText,
  children,
  headerMark,
  unsubscribeLinks,
}: {
  preview: string;
  headingText: string;
  children: ReactNode;
  headerMark?: EmailHeaderMark;
  unsubscribeLinks?: {
    seriesHref: string;
    allHref: string;
  } | null;
}) {
  const mark = createZcashNamesHeaderMark(headerMark);
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={{ padding: "40px 40px 24px", textAlign: "center" as const }}>
            <table role="presentation" style={{ margin: "0 auto", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle" }}>
                    <Link
                      href={mark.primaryHref ?? "https://zcashnames.com"}
                      style={{ textDecoration: "none", display: "inline-block" }}
                    >
                      <Img
                        src={mark.primarySrc}
                        alt={mark.primaryAlt}
                        width="48"
                        height="48"
                        style={{
                          display: "block",
                          margin: "0 auto",
                          border: "0",
                          width: 48,
                          height: 48,
                          objectFit: "contain",
                        }}
                      />
                    </Link>
                  </td>
                  {mark.secondarySrc && (
                    <>
                      <td
                        style={{
                          verticalAlign: "middle",
                          padding: "0 10px",
                          fontSize: 14,
                          lineHeight: "14px",
                          color: "#52525b",
                          fontWeight: 500,
                        }}
                      >
                        x
                      </td>
                      <td style={{ verticalAlign: "middle" }}>
                        <Img
                          src={mark.secondarySrc}
                          alt={mark.secondaryAlt ?? "Wallet"}
                          width="48"
                          height="48"
                          style={{
                            display: "block",
                            margin: "0 auto",
                            border: "0",
                            width: 48,
                            height: 48,
                            objectFit: "contain",
                            borderRadius: 10,
                          }}
                        />
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
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
                  {SOCIALS.map(({ href, iconSrc, alt }) => (
                    <td key={alt} style={{ padding: "0 6px" }}>
                      <Link href={href} style={{ textDecoration: "none", display: "inline-block" }}>
                        <Img
                          src={iconSrc}
                          alt={alt}
                          width="60"
                          height="60"
                          style={{
                            display: "block",
                            width: 60,
                            height: 60,
                            border: 0,
                          }}
                        />
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
          {unsubscribeLinks && (
            <Section style={{ textAlign: "center" as const, padding: "0 40px 32px" }}>
              <Hr style={{ ...dividerStyle, margin: "0 0 24px" }} />
              <Text style={{ margin: 0, fontSize: 11, color: "#a1a1aa", lineHeight: "18px" }}>
                <Link href={unsubscribeLinks.seriesHref} style={{ color: "#a1a1aa", textDecoration: "underline" }}>
                  Unsubscribe
                </Link>
              </Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
}
