import type { ReactNode } from "react";
import { Anton, Bebas_Neue, Oswald, Playfair_Display, Space_Grotesk } from "next/font/google";

const namepostAnton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-namepost-anton",
  display: "swap",
});

const namepostBebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-namepost-bebas",
  display: "swap",
});

const namepostOswald = Oswald({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-namepost-oswald",
  display: "swap",
});

const namepostSpace = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-namepost-space",
  display: "swap",
});

const namepostPlayfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-namepost-playfair",
  display: "swap",
});

export default function NamepostLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${namepostAnton.variable} ${namepostBebas.variable} ${namepostOswald.variable} ${namepostSpace.variable} ${namepostPlayfair.variable}`}
    >
      {children}
    </div>
  );
}
