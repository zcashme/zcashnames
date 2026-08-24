export const RESERVEINFO_POST_TEMPLATE_VARIANTS = ["original", "light"] as const;

export type ReserveinfoPostTemplateVariant = (typeof RESERVEINFO_POST_TEMPLATE_VARIANTS)[number];

type ReserveinfoPostTemplateTheme = {
  backgroundFile: string;
  canvasColor: string;
  textColor: string;
  titleColor: string;
};

const TEMPLATE_THEMES: Record<ReserveinfoPostTemplateVariant, ReserveinfoPostTemplateTheme> = {
  original: {
    backgroundFile: "template-image-original.png",
    canvasColor: "#08130d",
    textColor: "#dfff72",
    titleColor: "#dfff72",
  },
  light: {
    backgroundFile: "template-image.png",
    canvasColor: "#f7f0e3",
    textColor: "#111111",
    titleColor: "#111111",
  },
};

export function isReserveinfoPostTemplateVariant(value: string | null | undefined): value is ReserveinfoPostTemplateVariant {
  return typeof value === "string" && (RESERVEINFO_POST_TEMPLATE_VARIANTS as readonly string[]).includes(value);
}

export function normalizeReserveinfoPostTemplateVariant(value: string | null | undefined): ReserveinfoPostTemplateVariant {
  return isReserveinfoPostTemplateVariant(value) ? value : "original";
}

export function getReserveinfoPostTemplateTheme(variant: ReserveinfoPostTemplateVariant): ReserveinfoPostTemplateTheme {
  return TEMPLATE_THEMES[variant];
}
