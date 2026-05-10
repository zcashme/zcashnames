//
// Root layout — intentionally passes children through without any wrapper.
//
// Next.js requires a root layout, but because we have two separate route
// groups with different HTML shells (the marketing site and the docs site),
// the actual <html>/<body>/<head> tags live in each group's layout:
//   - app/(site)/layout.tsx — marketing site (Manrope + Dancing Script fonts)
//   - app/(docs)/layout.tsx   — docs site (Manrope only, Nextra theme)
//
// This pass-through lets both groups coexist under one Next.js app.
//
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
