import { Manrope, Dancing_Script, Inter } from "next/font/google";
import "./globals.css";

const uiSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const uiCursive = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cursive",
  display: "swap",
});

const brandSans = Inter({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-brand",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${uiSans.variable} ${uiCursive.variable} ${brandSans.variable}`}>
        {children}
      </body>
    </html>
  );
}
