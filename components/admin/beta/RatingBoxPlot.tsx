import type { RatingBoxPlotStats, RatingPlotPoint } from "@/lib/beta/report";

interface Props {
  stats: RatingBoxPlotStats | null;
  points: RatingPlotPoint[];
}

const CATEGORY_STYLES: Record<
  string,
  { label: string; color: string; shadow: string; shape: "circle" | "diamond" | "triangle" }
> = {
  user: {
    label: "User flow",
    color: "#f6a313",
    shadow: "drop-shadow(0 0 10px rgba(246, 163, 19, 0.35))",
    shape: "circle",
  },
  developer: {
    label: "Developer flow",
    color: "#4da7ff",
    shadow: "drop-shadow(0 0 10px rgba(77, 167, 255, 0.35))",
    shape: "diamond",
  },
  uncategorized: {
    label: "Uncategorized",
    color: "#d6d973",
    shadow: "drop-shadow(0 0 10px rgba(214, 217, 115, 0.3))",
    shape: "triangle",
  },
};

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 1000;
const PLOT_LEFT = 86;
const PLOT_RIGHT = 80;
const PLOT_TOP = 470;
const PLOT_BOTTOM = 120;
const AXIS_Y_TOP = 520;
const AXIS_Y_BOTTOM = 830;
const BOX_Y = 685;
const BOX_HEIGHT = 120;
const TICK_VALUES = [1, 2, 3, 4, 5];

function xScale(value: number) {
  const plotWidth = SVG_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  return PLOT_LEFT + ((value - 1) / 4) * plotWidth;
}

function categoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.uncategorized;
}

function pointOffset(indexWithinRating: number) {
  const offsets = [-54, -28, -6, 18, 42, -80, 66, -104, 92];
  return offsets[indexWithinRating % offsets.length] ?? 0;
}

function renderPoint(
  point: RatingPlotPoint,
  indexWithinRating: number,
) {
  const x = xScale(point.rating);
  const y = BOX_Y + pointOffset(indexWithinRating);
  const style = categoryStyle(point.category);

  if (style.shape === "diamond") {
    return (
      <path
        d={`M ${x} ${y - 12} L ${x + 12} ${y} L ${x} ${y + 12} L ${x - 12} ${y} Z`}
        fill={style.color}
        stroke="#11250d"
        strokeWidth="2.5"
        style={{ filter: style.shadow }}
      />
    );
  }

  if (style.shape === "triangle") {
    return (
      <path
        d={`M ${x} ${y - 14} L ${x + 12} ${y + 10} L ${x - 12} ${y + 10} Z`}
        fill={style.color}
        stroke="#11250d"
        strokeWidth="2.5"
        style={{ filter: style.shadow }}
      />
    );
  }

  return (
    <circle
      cx={x}
      cy={y}
      r="13"
      fill={style.color}
      stroke="#11250d"
      strokeWidth="2.5"
      style={{ filter: style.shadow }}
    />
  );
}

export default function RatingBoxPlot({ stats, points }: Props) {
  if (!stats || points.length === 0) {
    return (
      <div className="aspect-square rounded-[2rem] border border-[#4f6422] bg-[radial-gradient(circle_at_30%_20%,rgba(26,79,16,0.9),rgba(3,40,10,1)_60%,rgba(2,28,8,1))] p-8 text-sm text-[#d8e48e]">
        No experience ratings available yet.
      </div>
    );
  }

  const legendEntries = Array.from(new Set(points.map((point) => point.category))).map((category) => ({
    key: category,
    ...categoryStyle(category),
  }));

  const whiskerLeft = xScale(stats.min);
  const whiskerRight = xScale(stats.max);
  const q1 = xScale(stats.q1);
  const median = xScale(stats.median);
  const q3 = xScale(stats.q3);

  const ratingStackCount = new Map<number, number>();

  return (
    <div className="relative aspect-square overflow-hidden rounded-[2.25rem] border border-[#47631c] bg-[radial-gradient(circle_at_22%_18%,rgba(18,94,22,0.65),rgba(5,56,14,0.96)_48%,rgba(3,36,10,1))] p-0 shadow-[inset_0_0_0_1px_rgba(189,230,68,0.06),0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(182,216,47,0.05),transparent_46%),linear-gradient(135deg,rgba(190,255,90,0.04),transparent_35%,transparent_65%,rgba(190,255,90,0.03))]" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-12 pt-12">
        <div className="max-w-[52%]">
          <h3 className="text-[4.25rem] font-semibold leading-[0.95] tracking-[-0.05em] text-[#b8d71f] [text-shadow:0_0_18px_rgba(184,215,31,0.16)]">
            Experience Rating Distribution
          </h3>
          <p className="mt-16 text-[2rem] font-medium tracking-[-0.03em] text-[#dce898]">
            {points.length} rated submissions
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-10 text-[1.55rem] text-[#dce898]">
            {legendEntries.map((entry) => (
              <span key={entry.key} className="inline-flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  {entry.shape === "circle" ? (
                    <circle cx="12" cy="12" r="9" fill={entry.color} stroke="#11250d" strokeWidth="2" />
                  ) : entry.shape === "diamond" ? (
                    <path d="M 12 2.5 L 21.5 12 L 12 21.5 L 2.5 12 Z" fill={entry.color} stroke="#11250d" strokeWidth="2" />
                  ) : (
                    <path d="M 12 3 L 21 20.5 L 3 20.5 Z" fill={entry.color} stroke="#11250d" strokeWidth="2" />
                  )}
                </svg>
                {entry.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center pt-2 text-center">
          <img
            src="/brandkit/zcashnames-primary-logo-monochrome-green-transparent-377x403.svg"
            alt="ZcashNames"
            className="h-28 w-28 object-contain opacity-95 [filter:drop-shadow(0_0_18px_rgba(184,215,31,0.18))]"
          />
          <span className="mt-3 text-[1.05rem] tracking-[-0.03em] text-[#b8d71f]">
            ZcashNames
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Experience rating distribution boxplot"
      >
        {TICK_VALUES.map((tick) => {
          const x = xScale(tick);
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={AXIS_Y_TOP}
                x2={x}
                y2={AXIS_Y_BOTTOM}
                stroke="#b8d71f"
                strokeWidth="2.5"
                opacity="0.95"
              />
              <text
                x={x}
                y={880}
                textAnchor="middle"
                fill="#b8d71f"
                fontSize="24"
                fontWeight="700"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={whiskerLeft}
          y1={BOX_Y}
          x2={q1}
          y2={BOX_Y}
          stroke="#9fc41c"
          strokeWidth="2"
          strokeDasharray="8 8"
          opacity="0.85"
        />
        <line
          x1={q3}
          y1={BOX_Y}
          x2={whiskerRight}
          y2={BOX_Y}
          stroke="#9fc41c"
          strokeWidth="2"
          opacity="0.92"
        />
        <line x1={median} y1={BOX_Y + BOX_HEIGHT / 2} x2={median} y2={AXIS_Y_BOTTOM} stroke="#9fc41c" strokeWidth="2.5" />

        <rect
          x={q1}
          y={BOX_Y - BOX_HEIGHT / 2}
          width={Math.max(q3 - q1, 8)}
          height={BOX_HEIGHT}
          rx="18"
          fill="rgba(2,36,10,0.38)"
          stroke="#a6cb1d"
          strokeWidth="3.2"
          style={{ filter: "drop-shadow(0 0 12px rgba(166,203,29,0.18))" }}
        />

        {points.map((point) => {
          const seenAtRating = ratingStackCount.get(point.rating) ?? 0;
          ratingStackCount.set(point.rating, seenAtRating + 1);
          return (
            <g key={point.id}>
              {renderPoint(point, seenAtRating)}
              <title>{`${point.testerName}: ${point.rating}/5 (${categoryStyle(point.category).label})`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
