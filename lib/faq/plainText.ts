import type { ReactNode } from "react";

/** Flatten a React node into searchable / JSON-LD plaintext. */
export function reactNodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    return node.map((child) => reactNodeToText(child)).join(" ");
  }
  if (typeof node === "object" && "props" in node) {
    const props = node.props as { children?: ReactNode } | null;
    return reactNodeToText(props?.children);
  }
  return "";
}

export function compactPlainText(node: ReactNode): string {
  return reactNodeToText(node).replace(/\s+/g, " ").trim();
}
