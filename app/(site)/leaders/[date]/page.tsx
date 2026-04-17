"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  getDailyNewNames,
  getDailyRankings,
  getLeadersTimeSeries,
  type ReferralScope,
  type DailyNewNameEntry,
  type DailyRow,
  type RankingEntry,
  type TimeSeriesPoint,
} from "@/lib/leaders/leaders";

export default function LeaderSnapshotPage() {
  const params = useParams<{ date: string }>();
  const selectedDate = typeof params?.date === "string" ? params.date : "";

  const [loading, setLoading] = useState(true);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [newNames, setNewNames] = useState<DailyNewNameEntry[]>([]);
  const [referralScope, setReferralScope] = useState<ReferralScope>("all");
  const [namesCopied, setNamesCopied] = useState(false);
  const [hiddenNameKeys, setHiddenNameKeys] = useState<Set<string>>(new Set());

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const namesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [rows, series, names] = await Promise.all([
        getDailyRankings(referralScope),
        getLeadersTimeSeries(referralScope),
        getDailyNewNames(selectedDate),
      ]);
      if (cancelled) return;
      setDailyRows(rows);
      setTimeSeries(series);
      setNewNames(names);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, referralScope]);

  const filteredRows = useMemo(() => dailyRows, [dailyRows]);
  const snapshotBackgroundSeries = useMemo(
    () => timeSeries.map((point, index) => ({ ...point, x: index })),
    [timeSeries],
  );

  const dailyTopBadgeByKey = useMemo(() => {
    const badges = new Map<string, "red" | "blue">();
    let previousDate: string | null = null;
    let previousTopCode: string | null = null;
    let currentStreak = 0;

    for (const row of filteredRows) {
      const topEntry = row.daily[0];
      if (!topEntry) {
        previousDate = row.date;
        previousTopCode = null;
        currentStreak = 0;
        continue;
      }

      const continuesStreak =
        previousTopCode === topEntry.referral_code &&
        previousDate !== null &&
        isNextDay(previousDate, row.date);

      currentStreak = continuesStreak ? currentStreak + 1 : 1;
      badges.set(`${row.date}:${topEntry.referral_code}`, currentStreak >= 2 ? "red" : "blue");
      previousDate = row.date;
      previousTopCode = topEntry.referral_code;
    }

    return badges;
  }, [filteredRows]);

  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.date === selectedDate),
    [filteredRows, selectedDate],
  );

  const pointByDate = useMemo(() => {
    const map = new Map<string, TimeSeriesPoint>();
    for (const point of timeSeries) map.set(point.date, point);
    return map;
  }, [timeSeries]);

  const selectedPoint = pointByDate.get(selectedDate);
  const previousPoint = pointByDate.get(previousUtcDate(selectedDate));

  const aggregate = {
    waitlist: selectedPoint?.total ?? 0,
    referred: selectedPoint?.referred ?? 0,
    maxPay: roundZec((selectedPoint?.referred ?? 0) * 0.05),
  };

  const deltas = {
    waitlist: selectedPoint && previousPoint ? selectedPoint.total - previousPoint.total : null,
    referred: selectedPoint && previousPoint ? selectedPoint.referred - previousPoint.referred : null,
    maxPay:
      selectedPoint && previousPoint
        ? roundZec((selectedPoint.referred - previousPoint.referred) * 0.05)
        : null,
  };

  const selectedBadgeType =
    selectedRow?.daily[0]
      ? dailyTopBadgeByKey.get(`${selectedRow.date}:${selectedRow.daily[0].referral_code}`) ?? null
      : null;

  const uniqueNewNames = useMemo(() => {
    const byName = new Map<string, DailyNewNameEntry>();
    for (const entry of newNames) {
      const key = entry.name.trim().toLowerCase();
      if (!key) continue;
      const existing = byName.get(key);
      if (!existing) {
        byName.set(key, entry);
        continue;
      }
      if (!existing.email_verified && entry.email_verified) {
        byName.set(key, { ...existing, email_verified: true });
      }
    }
    return Array.from(byName.values());
  }, [newNames]);

  const visibleNewNames = useMemo(
    () => uniqueNewNames.filter((entry) => !hiddenNameKeys.has(entry.name.trim().toLowerCase())),
    [uniqueNewNames, hiddenNameKeys],
  );

  const namesClipboardText = useMemo(
    () =>
      visibleNewNames
        .map((entry) => `${entry.name}, ${selectedDate}, ${entry.referred_by ? "referred" : "direct"}`)
        .join("\n"),
    [visibleNewNames, selectedDate],
  );

  const handleCopyNames = async () => {
    if (!namesClipboardText) return;
    await navigator.clipboard.writeText(namesClipboardText);
    setNamesCopied(true);
    setTimeout(() => setNamesCopied(false), 1600);
  };

  const handleSaveSnapshotSvg = async () => {
    if (!snapshotRef.current) return;
    await exportNodeAsSvg(snapshotRef.current, `leaders-${selectedDate || "snapshot"}.svg`);
  };

  const handleSaveNamesSvg = async () => {
    if (!namesRef.current) return;
    await exportNodeAsSvg(namesRef.current, `leaders-${selectedDate || "snapshot"}-names.svg`);
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
        <p className="py-20 text-center text-fg-muted">Loading snapshot...</p>
      </main>
    );
  }

  if (!selectedRow) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
        <div
          className="mt-4 rounded-2xl border p-6"
          style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
        >
          <h1 className="text-xl font-bold text-fg-heading">Snapshot not found</h1>
          <p className="mt-2 text-sm text-fg-muted">
            No daily snapshot is available for <span className="font-mono">{selectedDate}</span>.
          </p>
          <Link href="/leaders" className="mt-4 inline-block text-sm font-semibold text-fg-heading underline underline-offset-4">
            Back to Leaders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-2 pb-10 pt-3 sm:px-4">
      <section className="mx-auto w-[min(96vw,calc(90vh*16/9))]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Link href="/leaders" className="text-sm font-semibold text-fg-muted hover:text-fg-heading transition-colors">
            ← Back to Leaderboard
          </Link>
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveSnapshotSvg}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-fg-muted hover:text-fg-heading transition-colors cursor-pointer"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            Save 16:9 SVG
          </button>
            <div
              className="inline-flex items-center rounded-full border p-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              <button
                type="button"
                className="rounded-full px-3 py-1 transition-colors cursor-pointer"
                style={
                  referralScope === "all"
                    ? { background: "var(--leaders-rank-gold)", color: "var(--leaders-rank-text)" }
                    : { color: "var(--fg-muted)" }
                }
                onClick={() => setReferralScope("all")}
              >
                All
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full px-3 py-1 transition-colors cursor-pointer"
                style={
                  referralScope === "confirmed"
                    ? { background: "var(--leaders-rank-gold)", color: "var(--leaders-rank-text)" }
                    : { color: "var(--fg-muted)" }
                }
                onClick={() => setReferralScope("confirmed")}
                title="Confirmed email referrals"
                aria-label="Confirmed email referrals"
              >
                <EmailConfirmedIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={snapshotRef}
          className="relative flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border"
          style={{
            aspectRatio: "16 / 9",
            background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
            borderColor: "var(--leaders-card-border)",
            boxShadow: "0 26px 64px rgba(0,0,0,0.45)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-38">
            {snapshotBackgroundSeries.length > 1 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshotBackgroundSeries} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    type="number"
                    dataKey="x"
                    hide
                    allowDataOverflow
                    domain={[0, Math.max(0, snapshotBackgroundSeries.length - 1)]}
                  />
                  <YAxis type="number" hide allowDataOverflow domain={["dataMin", "dataMax"]} />
                  <Line
                    type="monotone"
                    dataKey="referred"
                    stroke="var(--leaders-area-referred)"
                    strokeWidth={2.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="nonReferred"
                    stroke="var(--leaders-area-non-referred)"
                    strokeWidth={2.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <SnapshotHeader title={`Referral Snapshot - ${selectedDate}`} />

          <div className="relative z-10 grid min-h-0 flex-1 grid-cols-12 gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="col-span-4 min-h-0">
              <SnapshotRankingSection
                title="24h Rankings"
                entries={selectedRow.daily}
                topBadgeType={selectedBadgeType}
              />
            </div>
            <div className="col-span-4 min-h-0">
              <SnapshotRankingSection
                title="All-time Rankings"
                entries={selectedRow.allTime}
              />
            </div>
            <div className="col-span-4 min-h-0">
              <AggregatePanel aggregate={aggregate} deltas={deltas} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 w-[min(92vw,620px)] max-w-[620px]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyNames}
              className="rounded-full border px-3 py-1 text-xs font-semibold text-fg-muted hover:text-fg-heading transition-colors cursor-pointer"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              {namesCopied ? "Copied" : "Copy Names"}
            </button>
            {hiddenNameKeys.size > 0 && (
              <button
                type="button"
                onClick={() => setHiddenNameKeys(new Set())}
                className="rounded-full border px-3 py-1 text-xs font-semibold text-fg-muted hover:text-fg-heading transition-colors cursor-pointer"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                Reset hidden
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveNamesSvg}
              className="rounded-full border px-3 py-1 text-xs font-semibold text-fg-muted hover:text-fg-heading transition-colors cursor-pointer"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              Save 1:1 SVG
            </button>
          </div>
        </div>

        <div
          ref={namesRef}
          className="flex max-h-[92vw] flex-col overflow-hidden rounded-2xl border"
          style={{
            aspectRatio: "1 / 1",
            background: "var(--leaders-card-bg)",
            borderColor: "var(--leaders-card-border)",
            boxShadow: "0 20px 48px rgba(0,0,0,0.35)",
          }}
        >
          <SnapshotHeader title={`New Names - ${selectedDate}`} />
          <div className="min-h-0 flex-1 p-4">
            <NewNamesSection
              entries={visibleNewNames}
              showConfirmedIcons={referralScope === "confirmed"}
              onHide={(entry) => {
                const key = entry.name.trim().toLowerCase();
                setHiddenNameKeys((prev) => new Set(prev).add(key));
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function EmailConfirmedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.6 7L10 11.5L16.4 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.6" cy="15.8" r="3.9" fill="var(--leaders-card-bg-solid, var(--leaders-card-bg))" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.9 15.9L17.1 17.1L19.4 14.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SnapshotHeader({ title }: { title: string }) {
  return (
    <header
      className="relative z-10 flex items-center justify-between gap-3 border-b px-4 py-3"
      style={{ borderColor: "var(--leaders-card-border)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative block h-9 w-9 shrink-0">
          <img
            src="/brandkit/zcashnames-primary-logo-white-black-square-background-403x403.png"
            alt="ZcashNames"
            width={36}
            height={36}
            className="h-9 w-9"
          />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight text-fg-heading">ZcashNames</p>
          <p className="whitespace-nowrap text-[0.68rem] uppercase tracking-[0.06em] text-fg-muted">{title}</p>
        </div>
      </div>
    </header>
  );
}

function NewNamesSection({
  entries,
  showConfirmedIcons,
  onHide,
}: {
  entries: DailyNewNameEntry[];
  showConfirmedIcons: boolean;
  onHide: (entry: DailyNewNameEntry) => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl p-1 sm:p-2">
      {entries.length === 0 ? (
        <p className="text-base text-fg-muted">No new names on this date.</p>
      ) : (
        <div className="snapshot-scroll min-h-0 overflow-auto pr-0.5">
          <div className="grid grid-cols-2 gap-2">
          {entries.map((entry) => (
            <div
              key={`${entry.created_at}:${entry.referral_code}`}
              className="group flex items-center justify-between rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-lg font-semibold text-fg-heading">
                  <span className="truncate">{entry.name}</span>
                  {showConfirmedIcons && entry.email_verified && (
                    <EmailConfirmedIcon className="h-4 w-4 shrink-0" />
                  )}
                </p>
                <p className="font-mono text-sm text-fg-muted">{entry.created_at.slice(11, 16)} UTC</p>
              </div>
              <div className="ml-2 shrink-0 text-right">
                <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  {entry.referred_by ? "referred" : "direct"}
                </span>
                <button
                  type="button"
                  className="mt-1 cursor-pointer text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-fg-heading"
                  onClick={() => onHide(entry)}
                >
                  Hide
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SnapshotRankingSection({
  title,
  entries,
  topBadgeType = null,
}: {
  title: string;
  entries: [RankingEntry?, RankingEntry?, RankingEntry?];
  topBadgeType?: "red" | "blue" | null;
}) {
  const labels = ["1st", "2nd", "3rd"] as const;
  const maxCount = Math.max(1, ...entries.map((entry) => entry?.count ?? 0));

  return (
    <section className="flex h-full min-h-0 flex-col">
      <h3 className="mb-2 text-[1.02rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">{title}</h3>

        <div
          className="relative flex-[1.15] overflow-hidden rounded-xl border p-3 sm:p-4"
          style={{
            borderColor: "var(--leaders-card-border)",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--leaders-card-bg-solid, var(--leaders-card-bg)) 72%, var(--leaders-area-referred) 28%), color-mix(in srgb, var(--leaders-card-bg-solid, var(--leaders-card-bg)) 88%, var(--leaders-area-referred) 12%))",
          }}
        >
        <MiniReferralLine entry={entries[0]} maxCount={maxCount} />
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">{labels[0]}</p>
        <SnapshotEntryContent entry={entries[0]} badgeType={topBadgeType} prominent />
      </div>

      <div className="mt-3 grid flex-1 grid-cols-2 gap-2.5">
        <div
          className="relative overflow-hidden rounded-xl border p-3"
          style={{
            borderColor: "var(--leaders-card-border)",
            background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
          }}
        >
          <MiniReferralLine entry={entries[1]} maxCount={maxCount} />
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">{labels[1]}</p>
          <SnapshotEntryContent entry={entries[1]} compact />
        </div>
        <div
          className="relative overflow-hidden rounded-xl border p-3"
          style={{
            borderColor: "var(--leaders-card-border)",
            background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
          }}
        >
          <MiniReferralLine entry={entries[2]} maxCount={maxCount} />
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">{labels[2]}</p>
          <SnapshotEntryContent entry={entries[2]} compact />
        </div>
      </div>
    </section>
  );
}

function SnapshotEntryContent({
  entry,
  badgeType = null,
  prominent = false,
  compact = false,
}: {
  entry?: RankingEntry;
  badgeType?: "red" | "blue" | null;
  prominent?: boolean;
  compact?: boolean;
}) {
  if (!entry) {
    return <p className="mt-2 text-sm text-fg-muted">-</p>;
  }

  return (
    <div className="relative z-10 mt-1.5">
      <div
        className={`${prominent ? "text-[1.82rem] font-bold leading-tight" : compact ? "text-[1.14rem] font-semibold leading-tight" : "text-[1.32rem] font-semibold leading-tight"} text-fg-heading inline-flex items-center gap-1 whitespace-nowrap`}
      >
        <span>{entry.name}</span>
        {badgeType && (
          <img
            src={badgeType === "red" ? "/icons/fire-red.apng" : "/icons/fire-blue.apng"}
            alt={badgeType === "red" ? "streak" : "top 24h"}
            className="h-5 w-5 shrink-0"
          />
        )}
      </div>
      <div className={compact ? "mt-1 text-[0.96rem] tabular-nums text-fg-body" : "mt-1 text-[1.2rem] tabular-nums text-fg-body"}>
        {entry.count}
        <span className="mx-2 text-fg-muted">/</span>
        <ZecSymbol className="mr-1 inline-block" /> {formatPayout(entry.payout)}
      </div>
    </div>
  );
}

function MiniReferralLine({ entry, maxCount }: { entry?: RankingEntry; maxCount: number }) {
  if (!entry) return null;
  const ratio = Math.max(0.08, Math.min(1, entry.count / maxCount));
  const startY = 84;
  const endY = 84 - ratio * 52;
  const controlY = endY + 8;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-28"
      aria-hidden="true"
    >
      <path
        d={`M 0 ${startY} C 28 ${startY}, 64 ${controlY}, 100 ${endY}`}
        fill="none"
        stroke="var(--leaders-area-referred)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AggregatePanel({
  aggregate,
  deltas,
}: {
  aggregate: { waitlist: number; referred: number; maxPay: number };
  deltas: { waitlist: number | null; referred: number | null; maxPay: number | null };
}) {
  const rows: Array<{
    label: string;
    value: string;
    deltaText: string;
    isZec: boolean;
    dotColor?: string;
  }> = [
    {
      label: "Total Waitlist",
      value: aggregate.waitlist.toLocaleString(),
      deltaText: formatAggregateDelta(deltas.waitlist, false),
      dotColor: "var(--leaders-area-non-referred)",
      isZec: false,
    },
    {
      label: "Total Referred",
      value: aggregate.referred.toLocaleString(),
      deltaText: formatAggregateDelta(deltas.referred, false),
      dotColor: "var(--leaders-area-referred)",
      isZec: false,
    },
    {
      label: "Rewards",
      value: formatPayout(aggregate.maxPay),
      deltaText: formatAggregateDelta(deltas.maxPay, true),
      isZec: true,
    },
  ];
  const valueWidthCh = Math.max(3, ...rows.map((row) => row.value.length));
  const deltaWidthCh = Math.max(2, ...rows.map((row) => row.deltaText.length));

  return (
    <section className="flex h-full min-h-0 flex-col justify-center py-1 text-right">
      <div className="grid content-center gap-6">
        {rows.map((row) => (
          <AggregateRow
            key={row.label}
            label={row.label}
            value={row.value}
            deltaText={row.deltaText}
            isZec={row.isZec}
            dotColor={row.dotColor}
            valueWidthCh={valueWidthCh}
            deltaWidthCh={deltaWidthCh}
          />
        ))}
      </div>
    </section>
  );
}

function AggregateRow({
  label,
  value,
  deltaText,
  isZec = false,
  dotColor,
  valueWidthCh,
  deltaWidthCh,
}: {
  label: string;
  value: string;
  deltaText: string;
  isZec?: boolean;
  dotColor?: string;
  valueWidthCh: number;
  deltaWidthCh: number;
}) {
  return (
    <div>
      <p className="flex items-center justify-end gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted whitespace-nowrap">
        {dotColor && (
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
            aria-hidden="true"
          />
        )}
        <span className="shrink-0 whitespace-nowrap">{label}</span>
      </p>
      <div className="mt-1 flex flex-nowrap items-end justify-end gap-2 tabular-nums whitespace-nowrap">
        <p className="flex items-end text-[2.28rem] font-bold leading-none text-fg-heading whitespace-nowrap">
          {isZec && <ZecSymbol className="mr-0.5 inline-block" />}
          <span className="inline-block text-right" style={{ width: `${valueWidthCh}ch` }}>
            {value}
          </span>
        </p>
        <p className="shrink-0 text-base leading-none text-fg-muted whitespace-nowrap">
          <span
            className="inline-block text-right"
            style={{ width: `${deltaWidthCh}ch`, transform: "translateY(-0.08em)" }}
          >
            {deltaText}
          </span>
        </p>
      </div>
    </div>
  );
}

function formatAggregateDelta(delta: number | null, isZec: boolean): string {
  if (delta === null) return "-";
  if (isZec) return `${delta > 0 ? "+" : ""}${formatPayout(delta)}`;
  return `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
}

function ZecSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        width: "0.72em",
        height: "0.72em",
        verticalAlign: "baseline",
        marginBottom: "0.06em",
      }}
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6H14L6 14H14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function isNextDay(previousDate: string, nextDate: string): boolean {
  const previous = new Date(`${previousDate}T00:00:00.000Z`).getTime();
  const next = new Date(`${nextDate}T00:00:00.000Z`).getTime();
  return next - previous === 24 * 60 * 60 * 1000;
}

function previousUtcDate(date: string): string {
  const ts = new Date(`${date}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(ts)) return "";
  const previous = new Date(ts - 24 * 60 * 60 * 1000);
  return previous.toISOString().slice(0, 10);
}

function roundZec(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatPayout(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

async function exportNodeAsSvg(node: HTMLElement, fileName: string): Promise<void> {
  const { svg } = await buildSnapshotSvg(node);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildSnapshotSvg(node: HTMLElement): Promise<{ svg: string; width: number; height: number }> {
  const width = Math.max(1, Math.round(node.offsetWidth));
  const height = Math.max(1, Math.round(node.offsetHeight));
  const cloned = (await cloneWithInlineStylesAsync(node)) as HTMLElement;
  const serializedNode = new XMLSerializer().serializeToString(cloned);
  const nodeBg = window.getComputedStyle(node).backgroundColor;
  const pageBg = window.getComputedStyle(document.body).backgroundColor;
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
  const fallbackBg = pickOpaqueBackground([pageBg, htmlBg, "rgb(10, 10, 10)"]);
  const background = flattenColorOver(nodeBg, fallbackBg);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect x="0" y="0" width="${width}" height="${height}" fill="${background}" />
      <foreignObject x="0" y="0" width="100%" height="100%">${serializedNode}</foreignObject>
    </svg>
  `;
  return { svg, width, height };
}

function isTransparentColor(color: string): boolean {
  const normalized = color.trim().toLowerCase();
  return normalized === "transparent" || normalized === "rgba(0, 0, 0, 0)";
}

function pickOpaqueBackground(candidates: string[]): string {
  for (const color of candidates) {
    if (!isTransparentColor(color) && color.trim()) {
      const parsed = parseColor(color);
      if (!parsed) return color;
      if (parsed.a > 0.001) {
        return parsed.a >= 1 ? `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})` : color;
      }
    }
  }
  return "rgb(10, 10, 10)";
}

function flattenColorOver(top: string, bottom: string): string {
  const topColor = parseColor(top);
  if (!topColor) return top;
  if (topColor.a >= 0.999) {
    return `rgb(${topColor.r}, ${topColor.g}, ${topColor.b})`;
  }
  const bottomColor = parseColor(bottom);
  if (!bottomColor) {
    return `rgb(${topColor.r}, ${topColor.g}, ${topColor.b})`;
  }
  const alphaTop = Math.max(0, Math.min(1, topColor.a));
  const alphaBottom = Math.max(0, Math.min(1, bottomColor.a));
  const outA = alphaTop + alphaBottom * (1 - alphaTop);
  if (outA <= 0.001) return "rgb(10, 10, 10)";
  const r = Math.round((topColor.r * alphaTop + bottomColor.r * alphaBottom * (1 - alphaTop)) / outA);
  const g = Math.round((topColor.g * alphaTop + bottomColor.g * alphaBottom * (1 - alphaTop)) / outA);
  const b = Math.round((topColor.b * alphaTop + bottomColor.b * alphaBottom * (1 - alphaTop)) / outA);
  return `rgb(${r}, ${g}, ${b})`;
}

function parseColor(input: string): { r: number; g: number; b: number; a: number } | null {
  const color = input.trim().toLowerCase();
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    return null;
  }
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) return null;
  const parts = rgba[1].split(",").map((p) => p.trim());
  if (parts.length < 3) return null;
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  const a = parts.length >= 4 ? Number(parts[3]) : 1;
  if (![r, g, b, a].every(Number.isFinite)) return null;
  return {
    r: Math.max(0, Math.min(255, Math.round(r))),
    g: Math.max(0, Math.min(255, Math.round(g))),
    b: Math.max(0, Math.min(255, Math.round(b))),
    a: Math.max(0, Math.min(1, a)),
  };
}

async function cloneWithInlineStylesAsync(node: Node): Promise<Node> {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || "");
  }
  if (!(node instanceof Element)) {
    return node.cloneNode(false);
  }

  const clone = node.cloneNode(false) as Element;
  const computed = window.getComputedStyle(node);
  clone.setAttribute(
    "style",
    Array.from(computed)
      .map((key) => `${key}:${computed.getPropertyValue(key)};`)
      .join(""),
  );

  if (node instanceof HTMLImageElement && clone instanceof HTMLImageElement) {
    const source = node.currentSrc || node.src;
    if (source) {
      const dataUrl = await urlToDataUrl(source);
      if (dataUrl) {
        clone.src = dataUrl;
        clone.srcset = "";
      }
    }
  }

  if (node instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
    clone.setAttribute("value", node.value);
  }

  if (node instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
    clone.value = node.value;
    clone.textContent = node.value;
  }

  if (node instanceof HTMLCanvasElement) {
    const img = document.createElement("img");
    try {
      img.src = node.toDataURL();
    } catch {
      img.src = "";
    }
    img.style.width = `${node.width}px`;
    img.style.height = `${node.height}px`;
    return img;
  }

  for (const child of Array.from(node.childNodes)) {
    clone.appendChild(await cloneWithInlineStylesAsync(child));
  }

  return clone;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url;
  try {
    const response = await fetch(url, { mode: "cors", credentials: "same-origin" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

