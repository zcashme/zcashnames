import type { ReactNode } from "react";

export type FaqSurface = "home" | "waitlist-view";

export type FaqHomeGroup =
  | "The basics"
  | "Privacy & payments"
  | "Getting access"
  | "Community, builders & team";

export type FaqItem = {
  id: string;
  question: string;
  answer: ReactNode;
  surfaces?: FaqSurface[];
  homeGroup?: FaqHomeGroup;
};

export type FaqSection = {
  id: string;
  href: string;
  title: string;
  blurb: string;
  /** Jump-pill label. Defaults to `href`. */
  pill?: string;
  items: FaqItem[];
};
