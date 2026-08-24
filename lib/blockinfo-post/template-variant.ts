import type { BlockinfoPostDeterministicLayout, BlockinfoPostLayoutTextBlock } from "@/lib/blockinfo-post/types";

export const BLOCKINFO_POST_TEMPLATE_VARIANTS = ["original", "light"] as const;

export type BlockinfoPostTemplateVariant = (typeof BLOCKINFO_POST_TEMPLATE_VARIANTS)[number];

type BlockinfoPostTemplateTheme = {
  backgroundFile: string;
  canvasColor: string;
  titleGradient: readonly [string, string, string];
  textColor: string | null;
  gridColor: string;
};

const TEMPLATE_THEMES: Record<BlockinfoPostTemplateVariant, BlockinfoPostTemplateTheme> = {
  original: {
    backgroundFile: "template-image.png",
    canvasColor: "#08130d",
    titleGradient: ["#f3ff8f", "#dfff72", "#94d11a"],
    textColor: null,
    gridColor: "rgba(223, 255, 114, 0.28)",
  },
  light: {
    backgroundFile: "template-image-light.png",
    canvasColor: "#f7f0e3",
    titleGradient: ["#111111", "#111111", "#111111"],
    textColor: "#111111",
    gridColor: "rgba(37, 99, 168, 0.24)",
  },
};

export function isBlockinfoPostTemplateVariant(value: string | null | undefined): value is BlockinfoPostTemplateVariant {
  return typeof value === "string" && (BLOCKINFO_POST_TEMPLATE_VARIANTS as readonly string[]).includes(value);
}

export function normalizeBlockinfoPostTemplateVariant(value: string | null | undefined): BlockinfoPostTemplateVariant {
  return isBlockinfoPostTemplateVariant(value) ? value : "light";
}

export function getBlockinfoPostTemplateTheme(variant: BlockinfoPostTemplateVariant): BlockinfoPostTemplateTheme {
  return TEMPLATE_THEMES[variant];
}

function applyTextTheme(block: BlockinfoPostLayoutTextBlock, theme: BlockinfoPostTemplateTheme): BlockinfoPostLayoutTextBlock {
  return theme.textColor ? { ...block, color: theme.textColor } : block;
}

export function applyBlockinfoPostTemplateTheme(
  layout: BlockinfoPostDeterministicLayout,
  variant: BlockinfoPostTemplateVariant,
): BlockinfoPostDeterministicLayout {
  const theme = getBlockinfoPostTemplateTheme(variant);
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
      note: applyTextTheme(layout.table.note, theme),
      columns: {
        label: applyTextTheme(layout.table.columns.label, theme),
        current: applyTextTheme(layout.table.columns.current, theme),
        delta1d: applyTextTheme(layout.table.columns.delta1d, theme),
        delta7d: applyTextTheme(layout.table.columns.delta7d, theme),
        delta30d: applyTextTheme(layout.table.columns.delta30d, theme),
      },
    },
    footer: applyTextTheme(layout.footer, theme),
  };
}
