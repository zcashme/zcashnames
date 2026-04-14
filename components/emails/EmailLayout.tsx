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
import { FROM_EMAIL, SOCIALS } from "@/lib/email/constants";
import {
  body as bodyStyle,
  container as containerStyle,
  heading as headingStyle,
  divider as dividerStyle,
} from "@/lib/email/styles";

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
            <Img
              src="https://zcashnames.com/logo.svg"
              alt="ZcashNames"
              width="48"
              height="48"
              style={{ display: "block", margin: "0 auto", border: "0" }}
            />
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
                  {SOCIALS.map(({ href, icon, alt }) => (
                    <td key={alt} style={{ padding: "0 8px" }}>
                      <Link href={href} style={{ textDecoration: "none", display: "inline-block" }}>
                        <Img
                          src={`https://zcashnames.com/icons/${icon}.svg`}
                          alt={alt}
                          width="20"
                          height="20"
                          style={{ display: "block" }}
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
              zcashnames.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}