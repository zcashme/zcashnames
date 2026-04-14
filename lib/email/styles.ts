import type { CSSProperties } from "react";

export const body: CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: "#f4f4f5",
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

export const container: CSSProperties = {
  maxWidth: 480,
  margin: "40px auto",
  backgroundColor: "#0a0a0a",
  borderRadius: 12,
  overflow: "hidden",
};

export const heading: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
  color: "#f0f0f0",
  textAlign: "center" as const,
  padding: "0 40px 8px",
};

export const divider: CSSProperties = {
  border: "none",
  borderTop: "1px solid #2a2a2a",
  margin: "0 40px",
  padding: 0,
};

export const content: CSSProperties = {
  padding: "16px 40px 0",
};

export const paragraph: CSSProperties = {
  margin: "0 0 16px",
  fontSize: 15,
  lineHeight: "1.6",
  color: "#d4d4d8",
};

export const ctaButton: CSSProperties = {
  display: "inline-block",
  backgroundColor: "#F4B728",
  color: "#0a0a0a",
  fontSize: 14,
  fontWeight: 700,
  textDecoration: "none",
  padding: "14px 32px",
  borderRadius: 8,
};