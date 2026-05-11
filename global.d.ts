import type { ReactNode } from "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: number | string;
  }
}

declare module "next-themes" {
  interface ThemeProviderProps {
    children?: ReactNode;
  }
}
