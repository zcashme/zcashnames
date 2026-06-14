/**
 * Docs route-group wrapper. The actual html/body shell now lives in app/layout.tsx.
 * Any docs-specific head tags are provided by app/(docs)/head.tsx.
 */
export default function DocsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
