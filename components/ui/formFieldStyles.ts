import type { CSSProperties } from "react";

type BuildTextFieldStyleOptions = {
  fill?: string;
  invalid?: boolean;
  borderColor?: string;
  textColor?: string;
  invalidBorderColor?: string;
};

const DEFAULT_BORDER_COLOR =
  "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))";
const DEFAULT_INVALID_BORDER_COLOR = "var(--accent-red, #e05252)";
const DEFAULT_TEXT_COLOR = "var(--fg-heading)";

export function buildTextFieldStyle({
  fill = "var(--input-fill)",
  invalid = false,
  borderColor = DEFAULT_BORDER_COLOR,
  textColor = DEFAULT_TEXT_COLOR,
  invalidBorderColor = DEFAULT_INVALID_BORDER_COLOR,
}: BuildTextFieldStyleOptions = {}): CSSProperties {
  return {
    background: fill,
    border: `1.5px solid ${invalid ? invalidBorderColor : borderColor}`,
    color: textColor,
  };
}

export function buildVerifyTextFieldStyle(invalid = false): CSSProperties {
  return buildTextFieldStyle({ fill: "var(--verify-input-fill)", invalid });
}

export function buildFaqTextFieldStyle(invalid = false): CSSProperties {
  return buildTextFieldStyle({
    fill: "var(--input-fill)",
    invalid,
    borderColor: "var(--faq-border)",
  });
}

export const defaultTextFieldStyle = buildTextFieldStyle();
