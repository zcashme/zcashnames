"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NameLengthCount } from "@/lib/press/types";

const WAITLIST_COLOR = "var(--leaders-area-non-referred)";
const RESERVED_COLOR = "var(--leaders-area-reserved)";

type SeriesKey = "waitlist" | "reserved";

function ChartLegendItem({
  label,
  color,
  visible,
  onToggle,
}: {
  label: string;
  color: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-fg-heading select-none transition-colors hover:text-[var(--color-accent-interactive)]"
      aria-pressed={visible}
      onClick={onToggle}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={
          visible
            ? { background: color }
            : {
                background: "transparent",
                border: "1px solid color-mix(in srgb, var(--fg-muted) 55%, transparent)",
              }
        }
      />
      {label}
    </button>
  );
}

function LengthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const waitlist = payload.find((item) => item.dataKey === "waitlist");
  const reserved = payload.find((item) => item.dataKey === "reserved");
  const total = (waitlist?.value ?? 0) + (reserved?.value ?? 0);

  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm backdrop-blur-md"
      style={{
        background: "var(--leaders-tooltip-bg)",
        borderColor: "var(--leaders-tooltip-border)",
        color: "var(--fg-body)",
      }}
    >
      <p className="mb-1.5 font-semibold text-fg-heading">{label} characters</p>
      <p>
        Total: <span className="font-semibold text-fg-heading">{total.toLocaleString()}</span>
      </p>
      {waitlist ? (
        <p>
          Waitlist:{" "}
          <span className="font-semibold" style={{ color: WAITLIST_COLOR }}>
            {waitlist.value.toLocaleString()}
          </span>
        </p>
      ) : null}
      {reserved ? (
        <p>
          Reserved:{" "}
          <span className="font-semibold" style={{ color: RESERVED_COLOR }}>
            {reserved.value.toLocaleString()}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function NameLengthChart({ rows }: { rows: NameLengthCount[] | null }) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    waitlist: true,
    reserved: true,
  });

  if (!rows) {
    return <p className="text-sm leading-6">Live length counts were unavailable.</p>;
  }

  const toggle = (key: SeriesKey) => setVisible((current) => ({ ...current, [key]: !current[key] }));

  return (
    <section
      className="rounded-2xl border p-4 sm:p-6"
      style={{
        background: "var(--leaders-card-bg)",
        borderColor: "var(--leaders-card-border)",
      }}
      aria-label="Name length chart"
    >
      <p className="mb-3 text-sm font-semibold text-fg-heading">
        Email-confirmed waitlist names and paid reservations, by how many characters are in the name. Tap the bar to see the breakdown.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={36}
            tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <Tooltip content={<LengthTooltip />} cursor={{ fill: "color-mix(in srgb, var(--fg-muted) 12%, transparent)" }} />
          <Bar
            dataKey="waitlist"
            name="Waitlist"
            stackId="names"
            fill={WAITLIST_COLOR}
            hide={!visible.waitlist}
            maxBarSize={22}
          />
          <Bar
            dataKey="reserved"
            name="Reserved"
            stackId="names"
            fill={RESERVED_COLOR}
            hide={!visible.reserved}
            maxBarSize={22}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap items-center gap-4 px-2">
        <ChartLegendItem
          label="Waitlist"
          color={WAITLIST_COLOR}
          visible={visible.waitlist}
          onToggle={() => toggle("waitlist")}
        />
        <ChartLegendItem
          label="Reserved"
          color={RESERVED_COLOR}
          visible={visible.reserved}
          onToggle={() => toggle("reserved")}
        />
      </div>
      <p className="mt-3 px-2 text-xs leading-5" style={{ color: "var(--fg-muted)" }}>
        Character length of the name. 6+ is six characters or longer. Waitlist counts email-confirmed names that are not reserved. Reserved counts paid reservations.
      </p>
    </section>
  );
}
