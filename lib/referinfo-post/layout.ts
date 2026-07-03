import type {
  ReferinfoDeterministicLayout,
  ReferinfoDeterministicTextBlock,
  ReferinfoPlannedPost,
} from "@/lib/referinfo-post/types";

export type ReferinfoVisibleColumn = {
  block: ReferinfoDeterministicLayout["table"]["columns"][number];
  key: string;
  label: string;
};

export type ReferinfoComputedRow = {
  key: string;
  topY: number;
  lineY: number;
  height: number;
  cells: string[][];
};

function averageCharacterWidth(fontSize: number, letterSpacing: number) {
  return Math.max(1, fontSize * 0.56 + letterSpacing);
}

function hardWrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const parts: string[] = [];
  let remaining = line;
  while (remaining.length > maxChars) {
    parts.push(remaining.slice(0, maxChars));
    remaining = remaining.slice(maxChars);
  }
  if (remaining.length > 0) parts.push(remaining);
  return parts;
}

export function wrapTextToBlock(text: string, block: ReferinfoDeterministicTextBlock): string[] {
  const maxChars = Math.max(1, Math.floor(block.maxWidth / averageCharacterWidth(block.fontSize, block.letterSpacing)));
  const sourceLines = text.split("\n");
  const wrapped: string[] = [];

  for (const sourceLine of sourceLines) {
    if (!sourceLine.trim()) {
      wrapped.push("");
      continue;
    }

    const words = sourceLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      wrapped.push("");
      continue;
    }

    let current = "";
    for (const word of words) {
      if (!current) {
        if (word.length <= maxChars) {
          current = word;
          continue;
        }
        const segments = hardWrapLine(word, maxChars);
        wrapped.push(...segments.slice(0, -1));
        current = segments.at(-1) ?? "";
        continue;
      }

      const candidate = `${current} ${word}`;
      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }

      wrapped.push(current);
      if (word.length <= maxChars) {
        current = word;
        continue;
      }
      const segments = hardWrapLine(word, maxChars);
      wrapped.push(...segments.slice(0, -1));
      current = segments.at(-1) ?? "";
    }

    wrapped.push(current);
  }

  return wrapped.length > 0 ? wrapped : [text];
}

export function visibleReferinfoColumns(
  layout: ReferinfoDeterministicLayout,
  post: Pick<ReferinfoPlannedPost, "table">,
): ReferinfoVisibleColumn[] {
  const layoutByKey = new Map(layout.table.columns.map((column) => [column.key, column]));
  return post.table.columns
    .map((column, index) => {
      const block = layoutByKey.get(column.key) ?? layout.table.columns[index];
      if (!block || !block.visible) return null;
      return { block, label: column.label, key: column.key };
    })
    .filter((entry): entry is ReferinfoVisibleColumn => !!entry);
}

export function referinfoReferralColumnGroup(columns: ReferinfoVisibleColumn[]) {
  const directIndex = columns.findIndex((entry) => entry.key === "direct");
  const indirectIndex = columns.findIndex((entry) => entry.key === "indirect");
  if (directIndex === -1 || indirectIndex === -1 || indirectIndex !== directIndex + 1) return null;
  const metricColumn = columns[indirectIndex + 1];
  const changeColumn = columns[indirectIndex + 2];
  const includeMetric = metricColumn?.key === "metric" && metricColumn.label === "Σ";
  const includeChange = includeMetric && changeColumn?.key === "change" && changeColumn.label === "Δ";
  return {
    start: columns[directIndex]!,
    end: includeChange ? changeColumn : includeMetric ? metricColumn : columns[indirectIndex]!,
  };
}

export function referinfoIndirectReferralColumnGroup(columns: ReferinfoVisibleColumn[]) {
  const depth2Index = columns.findIndex((entry) => entry.key === "depth2");
  const depth3Index = columns.findIndex((entry) => entry.key === "depth3");
  const depth4PlusIndex = columns.findIndex((entry) => entry.key === "depth4plus");
  const metricIndex = columns.findIndex((entry) => entry.key === "metric");
  if (depth2Index === -1 || depth3Index !== depth2Index + 1 || depth4PlusIndex !== depth3Index + 1 || metricIndex !== depth4PlusIndex + 1) {
    return null;
  }
  return {
    start: columns[depth2Index]!,
    end: columns[metricIndex]!,
  };
}

export function referinfoRewardColumnGroup(columns: ReferinfoVisibleColumn[]) {
  const rewardIndex = columns.findIndex((entry) => entry.key === "reward");
  const totalIndex = columns.findIndex((entry) => entry.key === "total");
  if (rewardIndex === -1 || totalIndex === -1 || totalIndex !== rewardIndex + 1) return null;
  return {
    start: columns[rewardIndex]!,
    end: columns[totalIndex]!,
  };
}

export function referinfoDividerX(
  left: ReferinfoDeterministicLayout["table"]["columns"][number],
  right: ReferinfoDeterministicLayout["table"]["columns"][number],
) {
  return Math.round((left.x + left.maxWidth + right.x) / 2);
}

export function computeReferinfoRows(args: {
  layout: ReferinfoDeterministicLayout;
  post: Pick<ReferinfoPlannedPost, "table">;
  columns: ReferinfoVisibleColumn[];
}): ReferinfoComputedRow[] {
  const rows: ReferinfoComputedRow[] = [];
  let cursorY = args.layout.table.startY;

  for (const row of args.post.table.rows) {
    const wrappedCells = row.cells.map((cell, cellIndex) => {
      const block = args.columns[cellIndex]?.block;
      if (!block) return [cell];
      return wrapTextToBlock(cell, block);
    });

    const contentHeight = wrappedCells.reduce((maxHeight, lines, cellIndex) => {
      const block = args.columns[cellIndex]?.block;
      if (!block) return maxHeight;
      const lineCount = Math.max(1, lines.length);
      return Math.max(maxHeight, lineCount * block.fontSize * block.lineHeight);
    }, 0);

    const height = Math.max(args.layout.table.rowHeight, Math.ceil(contentHeight + 18));
    rows.push({
      key: row.key,
      topY: cursorY,
      lineY: cursorY + height - 18,
      height,
      cells: wrappedCells,
    });
    cursorY += height;
  }

  return rows;
}
