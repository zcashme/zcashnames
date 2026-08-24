import type { ReferinfoDeterministicLayout, ReferinfoDeterministicTextBlock } from "@/lib/referinfo-post/types";

export const REFERINFO_POST_TEMPLATE_VARIANTS = ["original", "light"] as const;

export type ReferinfoPostTemplateVariant = (typeof REFERINFO_POST_TEMPLATE_VARIANTS)[number];

type ReferinfoPostTemplateTheme = {
  backgroundFile: string;
  canvasColor: string;
  titleGradient: readonly [string, string, string];
  textColor: string | null;
  gridColor: string;
  groupGridColor: string;
};

const TEMPLATE_THEMES: Record<ReferinfoPostTemplateVariant, ReferinfoPostTemplateTheme> = {
  original: {
    backgroundFile: "template-image.png",
    canvasColor: "#08130d",
    titleGradient: ["#f3ff8f", "#dfff72", "#94d11a"],
    textColor: null,
    gridColor: "rgba(223, 255, 114, 0.28)",
    groupGridColor: "rgba(223, 255, 114, 0.52)",
  },
  light: {
    backgroundFile: "template-image-light.png",
    canvasColor: "#f7f0e3",
    titleGradient: ["#111111", "#111111", "#111111"],
    textColor: "#111111",
    gridColor: "rgba(37, 99, 168, 0.24)",
    groupGridColor: "rgba(37, 99, 168, 0.42)",
  },
};

export function isReferinfoPostTemplateVariant(value: string | null | undefined): value is ReferinfoPostTemplateVariant {
  return typeof value === "string" && (REFERINFO_POST_TEMPLATE_VARIANTS as readonly string[]).includes(value);
}

export function normalizeReferinfoPostTemplateVariant(value: string | null | undefined): ReferinfoPostTemplateVariant {
  return isReferinfoPostTemplateVariant(value) ? value : "original";
}

export function getReferinfoPostTemplateTheme(variant: ReferinfoPostTemplateVariant): ReferinfoPostTemplateTheme {
  return TEMPLATE_THEMES[variant];
}

function applyTextTheme(block: ReferinfoDeterministicTextBlock, theme: ReferinfoPostTemplateTheme): ReferinfoDeterministicTextBlock {
  return theme.textColor ? { ...block, color: theme.textColor } : block;
}

export function applyReferinfoPostTemplateTheme(
  layout: ReferinfoDeterministicLayout,
  variant: ReferinfoPostTemplateVariant,
): ReferinfoDeterministicLayout {
  const theme = getReferinfoPostTemplateTheme(variant);
  if (!theme.textColor) return layout;

  return {
    ...layout,
    header: {
      eyebrow: applyTextTheme(layout.header.eyebrow, theme),
      title: applyTextTheme(layout.header.title, theme),
      subtitle: applyTextTheme(layout.header.subtitle, theme),
    },
    table: {
      ...layout.table,
      columns: layout.table.columns.map((column) => ({ ...column, color: theme.textColor! })),
      note: applyTextTheme(layout.table.note, theme),
    },
    footer: applyTextTheme(layout.footer, theme),
  };
}
