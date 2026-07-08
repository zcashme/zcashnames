import { Hr, Img, Link, Section, Text } from "@react-email/components";
import {
  type EmailBlockAlignment,
  type EmailContentBlock,
  parseEmailContent,
  parseEmailInlineContent,
} from "@/lib/campaigns/content";
import { paragraph } from "@/lib/email/styles";

function InlineText({ text }: { text: string }) {
  const parts = parseEmailInlineContent(text);
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "link") {
          return (
            <Link
              key={`${part.href}-${index}`}
              href={part.href}
              style={{ color: "#F4B728", textDecoration: "underline" }}
            >
              {part.text}
            </Link>
          );
        }
        if (part.type === "bold") {
          return (
            <strong key={`${part.text}-${index}`} style={{ fontWeight: 700 }}>
              {part.text}
            </strong>
          );
        }
        if (part.type === "italic") {
          return (
            <em key={`${part.text}-${index}`} style={{ fontStyle: "italic" }}>
              {part.text}
            </em>
          );
        }
        if (part.type === "underline") {
          return (
            <span
              key={`${part.text}-${index}`}
              style={{ textDecoration: "underline" }}
            >
              {part.text}
            </span>
          );
        }
        return <span key={`${part.text}-${index}`}>{part.text}</span>;
      })}
    </>
  );
}

function textAlignForBlock(align: EmailBlockAlignment): "left" | "center" | "justify" {
  return align;
}

function headingStyle(level: 1 | 2 | 3, align: EmailBlockAlignment) {
  if (level === 1) {
    return {
      margin: "0 0 14px",
      fontSize: 28,
      lineHeight: "34px",
      fontWeight: 700,
      color: "#fafafa",
      textAlign: textAlignForBlock(align),
    } as const;
  }
  if (level === 2) {
    return {
      margin: "0 0 12px",
      fontSize: 22,
      lineHeight: "30px",
      fontWeight: 700,
      color: "#f4f4f5",
      textAlign: textAlignForBlock(align),
    } as const;
  }
  return {
    margin: "0 0 10px",
    fontSize: 18,
    lineHeight: "24px",
    fontWeight: 700,
    color: "#e4e4e7",
    textAlign: textAlignForBlock(align),
  } as const;
}

function renderBlock(block: EmailContentBlock, key: string): React.ReactNode {
  if (block.type === "paragraph") {
    return (
      <Text key={key} style={{ ...paragraph, textAlign: textAlignForBlock(block.align) }}>
        <InlineText text={block.text} />
      </Text>
    );
  }

  if (block.type === "heading") {
    return (
      <Text key={key} style={headingStyle(block.level, block.align)}>
        <InlineText text={block.text} />
      </Text>
    );
  }

  if (block.type === "divider") {
    return (
      <Hr
        key={key}
        style={{
          margin: "20px 0",
          border: "none",
          borderTop: "1px solid #2a2a2a",
        }}
      />
    );
  }

  if (block.type === "image") {
    const image = (
      <Img
        src={block.src}
        alt={block.alt}
        style={{
          display: "inline-block",
          maxWidth: "100%",
          height: "auto",
          border: 0,
        }}
      />
    );

    return (
      <Section
        key={key}
        style={{
          marginBottom: 16,
          textAlign: textAlignForBlock(block.align),
        }}
      >
        {block.href ? (
          <Link href={block.href} style={{ display: "inline-block" }}>
            {image}
          </Link>
        ) : (
          image
        )}
      </Section>
    );
  }

  if (block.type === "box") {
    return (
      <Section
        key={key}
        style={{
          marginBottom: 16,
          padding: "16px 18px",
          borderRadius: 10,
          backgroundColor: "#18181b",
          border: "1px solid #2a2a2a",
        }}
      >
        {block.blocks.map((child, index) => renderBlock(child, `${key}-${child.type}-${index}`))}
      </Section>
    );
  }

  return (
    <Section
      key={key}
      style={{
        marginBottom: 16,
        padding: "18px 20px",
        borderRadius: 10,
        backgroundColor: "#18181b",
        border: "1px solid #2a2a2a",
        textAlign: textAlignForBlock(block.align),
      }}
    >
      <Text
        style={{
          margin: 0,
          fontSize: 22,
          lineHeight: "28px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#f4b728",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          wordBreak: "break-word" as const,
          textAlign: textAlignForBlock(block.align),
        }}
      >
        <InlineText text={block.text} />
      </Text>
    </Section>
  );
}

export default function EmailRichBody({ bodyText }: { bodyText: string }) {
  const blocks = parseEmailContent(bodyText);
  return <>{blocks.map((block, index) => renderBlock(block, `${block.type}-${index}`))}</>;
}
