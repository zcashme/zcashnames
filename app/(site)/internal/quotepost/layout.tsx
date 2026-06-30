import type { ReactNode } from "react";
import { Cormorant_Garamond, Oswald, Playfair_Display, Space_Grotesk } from "next/font/google";

const quotepostPlayfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-quotepost-playfair",
  display: "swap",
});

const quotepostCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-quotepost-cormorant",
  display: "swap",
});

const quotepostOswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-quotepost-oswald",
  display: "swap",
});

const quotepostSpace = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-quotepost-space",
  display: "swap",
});

export default function QuotepostLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${quotepostPlayfair.variable} ${quotepostCormorant.variable} ${quotepostOswald.variable} ${quotepostSpace.variable}`}
    >
      {children}
    </div>
  );
}
