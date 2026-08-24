import type { ReserveinfoName, ReserveinfoReportWindow } from "@/lib/reserveinfo-post/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 30;
const TIME_ZONE = "America/New_York";

type WaitlistReservation = { name: string; reservedAt: string };

const RESERVE_MEMO_PATTERN = /^ZNS:RESERVE\|Name::([^|]+)\|UUID::/;

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(read("year")), month: Number(read("month")), day: Number(read("day")),
    hour: Number(read("hour")), minute: Number(read("minute")), second: Number(read("second")),
    weekday: weekdays[read("weekday")] ?? 0,
  };
}

function plainDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function zonedDateTimeToUtc(date: Date, minutes: number, timeZone: string): Date {
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), Math.floor(minutes / 60), minutes % 60);
  let guess = target;
  for (let index = 0; index < 3; index += 1) {
    const observed = zoneParts(new Date(guess), timeZone);
    const observedUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    guess = target - (observedUtc - guess);
  }
  return new Date(guess);
}

function formatWeekLabel(start: Date, endExclusive: Date): string {
  const end = addDays(endExclusive, -1);
  const startMonth = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return startMonth === endMonth
    ? `${startMonth} ${start.getUTCDate()}-${end.getUTCDate()}, ${end.getUTCFullYear()}`
    : `${startMonth} ${start.getUTCDate()}-${endMonth} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
}

export function buildCompletedReserveinfoWindow(now = new Date(), timeZone = TIME_ZONE): ReserveinfoReportWindow {
  const current = zoneParts(now, timeZone);
  const today = plainDate(current.year, current.month, current.day);
  const currentMonday = addDays(today, -((current.weekday + 6) % 7));
  const weekStart = addDays(currentMonday, -7);
  const weekEnd = currentMonday;
  return {
    timeZone,
    weekStartIso: zonedDateTimeToUtc(weekStart, 0, timeZone).toISOString(),
    weekEndIso: zonedDateTimeToUtc(weekEnd, 0, timeZone).toISOString(),
    weekStartDateKey: dateKey(weekStart),
    weekEndDateKey: dateKey(weekEnd),
    weekLabel: formatWeekLabel(weekStart, weekEnd),
  };
}

export function normalizeReservedNames(rows: WaitlistReservation[]): ReserveinfoName[] {
  const unique = new Map<string, ReserveinfoName>();
  for (const row of rows) {
    const name = row.name.trim();
    const reservedAtMs = new Date(row.reservedAt).getTime();
    if (!name || /^\d+$/.test(name) || Number.isNaN(reservedAtMs)) continue;
    const key = name.toLocaleLowerCase("en-US");
    const current = unique.get(key);
    if (!current || reservedAtMs < new Date(current.reservedAt).getTime()) unique.set(key, { name, reservedAt: row.reservedAt });
  }
  return [...unique.values()].sort((left, right) => {
    const digitOrder = Number(/\d/.test(left.name)) - Number(/\d/.test(right.name));
    if (digitOrder !== 0) return digitOrder;
    const timeOrder = new Date(left.reservedAt).getTime() - new Date(right.reservedAt).getTime();
    return timeOrder || left.name.localeCompare(right.name, "en-US", { sensitivity: "base" });
  });
}

export function parseReservedNameMemo(memo: string | null | undefined): string | null {
  const match = memo?.match(RESERVE_MEMO_PATTERN);
  return match?.[1]?.trim() || null;
}

export function paginateReservedNames(names: ReserveinfoName[]): Array<{ names: ReserveinfoName[]; shownStart: number; shownEnd: number }> {
  return Array.from({ length: Math.ceil(names.length / PAGE_SIZE) }, (_, pageIndex) => {
    const shownStart = pageIndex * PAGE_SIZE + 1;
    const pageNames = names.slice(pageIndex * PAGE_SIZE, shownStart - 1 + PAGE_SIZE);
    return { names: pageNames, shownStart, shownEnd: shownStart + pageNames.length - 1 };
  });
}

function slotMinutesForDay(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [11 * 60 + 30];
  if (count === 2) return [11 * 60 + 30, 16 * 60 + 30];
  if (count === 3) return [11 * 60 + 30, 16 * 60 + 30, 20 * 60 + 30];
  const slots = [8 * 60 + 30, 11 * 60 + 30, 16 * 60 + 30, 20 * 60 + 30];
  if (count >= 5) slots.splice(2, 0, 14 * 60);
  while (slots.length < count) {
    let bestIndex = 0;
    let bestGap = -1;
    for (let index = 0; index < slots.length - 1; index += 1) {
      const gap = slots[index + 1] - slots[index];
      if (gap > bestGap) { bestGap = gap; bestIndex = index; }
    }
    const candidate = Math.floor((slots[bestIndex] + slots[bestIndex + 1]) / 2);
    if (candidate === slots[bestIndex] || candidate === slots[bestIndex + 1]) break;
    slots.splice(bestIndex + 1, 0, candidate);
  }
  return slots;
}

export function buildReserveinfoSchedule(pageCount: number, weekStartDateKey: string, timeZone = TIME_ZONE): string[] {
  if (pageCount <= 0) return [];
  const [year, month, day] = weekStartDateKey.split("-").map(Number);
  const followingMonday = addDays(plainDate(year, month, day), 7);
  const base = Math.floor(pageCount / 5);
  const remainder = pageCount % 5;
  const scheduled: string[] = [];
  for (let weekday = 0; weekday < 5; weekday += 1) {
    const count = base + (weekday < remainder ? 1 : 0);
    const day = addDays(followingMonday, weekday);
    for (const minutes of slotMinutesForDay(count)) scheduled.push(zonedDateTimeToUtc(day, minutes, timeZone).toISOString());
  }
  return scheduled;
}

export const RESERVEINFO_PAGE_SIZE = PAGE_SIZE;
