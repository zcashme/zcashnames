import { Button, Hr, Img, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton, divider } from "@/lib/email/styles";
import { parseInlineLinks } from "@/lib/campaigns/content";

interface BetaInviteEmailProps {
  displayName: string;
  joinUrl: string;
  inviteCode: string;
  bodyParagraphs: string[];
  walletCta?: {
    walletName: string;
    platformName: string;
    logoSrc: string;
    logoAlt: string;
    primaryLink: {
      href: string;
      label: string;
    };
    alternateLinks: { href: string; label: string }[];
  } | null;
}

function Paragraph({ text }: { text: string }) {
  const parts = parseInlineLinks(text);
  return (
    <Text style={paragraph}>
      {parts.map((part, index) =>
        part.type === "link" && part.href ? (
          <Link key={`${part.href}-${index}`} href={part.href} style={{ color: "#F4B728" }}>
            {part.text}
          </Link>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </Text>
  );
}

export default function BetaInviteEmail({
  displayName,
  joinUrl,
  inviteCode,
  bodyParagraphs,
  walletCta,
}: BetaInviteEmailProps) {
  return (
    <EmailLayout preview="You've been accepted to the ZcashNames beta." headingText="You're invited">
      <Section style={content}>
        <Text style={paragraph}>Hi {displayName},</Text>
        {bodyParagraphs.map((text, index) => (
          <Paragraph key={`${index}-${text.slice(0, 24)}`} text={text} />
        ))}
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "8px 40px 20px" }}>
        <Button href={joinUrl} style={ctaButton}>
          Join Beta
        </Button>
        <Text
          style={{
            margin: "12px 0 0",
            fontSize: 12,
            lineHeight: "18px",
            color: "#a1a1aa",
            wordBreak: "break-all" as const,
          }}
        >
          {joinUrl}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 12px" }}>
        <Text style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#a1a1aa" }}>
          Or, go to{" "}
          <Link href="https://zcashnames.com" style={{ color: "#d4d4d8", textDecoration: "underline" }}>
            https://zcashnames.com
          </Link>
          , select Mainnet, and enter this access code:
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 32px" }}>
        <Text
          style={{
            margin: 0,
            fontSize: 22,
            lineHeight: "28px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: "#f4b728",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {inviteCode}
        </Text>
      </Section>

      {walletCta && (
        <>
          <Hr style={{ ...divider, margin: "0 40px 24px" }} />
          <Section style={{ textAlign: "center" as const, padding: "0 40px 32px" }}>
          <Text style={{ margin: "0 0 12px", fontSize: 13, lineHeight: "20px", color: "#a1a1aa" }}>
            You chose {walletCta.walletName} on {walletCta.platformName} to perform your beta testing with.
          </Text>
          <Text style={{ margin: "0 0 14px", fontSize: 13, lineHeight: "20px", color: "#d4d4d8" }}>
            Don&apos;t have {walletCta.walletName} yet?
          </Text>
          <table role="presentation" style={{ margin: "0 auto", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: 12, verticalAlign: "middle" }}>
                  <Img
                    src={walletCta.logoSrc}
                    alt={walletCta.logoAlt}
                    width="40"
                    height="40"
                    style={{
                      display: "block",
                      width: 40,
                      height: 40,
                      objectFit: "contain",
                      border: 0,
                    }}
                  />
                </td>
                <td style={{ verticalAlign: "middle" }}>
                  <Link
                    href={walletCta.primaryLink.href}
                    style={{
                      color: "#F4B728",
                      textDecoration: "underline",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Download for {walletCta.primaryLink.label}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
          {walletCta.alternateLinks.length > 0 && (
            <Text style={{ margin: "14px 0 0", fontSize: 12, lineHeight: "18px", color: "#a1a1aa" }}>
              Also available on{" "}
              {walletCta.alternateLinks.map((link, index) => (
                <span key={`${link.label}-${link.href}`}>
                  {index > 0 ? ", " : ""}
                  <Link href={link.href} style={{ color: "#d4d4d8", textDecoration: "underline" }}>
                    {link.label}
                  </Link>
                </span>
              ))}
              .
            </Text>
          )}
          </Section>
        </>
      )}
    </EmailLayout>
  );
}
