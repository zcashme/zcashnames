export const EASTERN_TIME_ZONE = "America/New_York";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function getEasternFormatter(
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    ...options,
  });
}

function getEasternParts(date: Date): Record<string, string> {
  return getEasternFormatter({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((parts, part) => {
    if (part.type !== "literal") parts[part.type] = part.value;
    return parts;
  }, {});
}

function getEasternOffsetMinutes(date: Date): number {
  const zonePart = getEasternFormatter({
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = zonePart?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function parseDateTimeInput(value: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function easternDateTimeInputToIso(value: string): string | null {
  const parsed = parseDateTimeInput(value);
  if (!parsed) return null;

  const { year, month, day, hour, minute } = parsed;
  let utcMs = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMinutes = getEasternOffsetMinutes(new Date(utcMs));
    const adjustedUtcMs =
      Date.UTC(year, month - 1, day, hour, minute) -
      offsetMinutes * 60_000;
    if (adjustedUtcMs === utcMs) break;
    utcMs = adjustedUtcMs;
  }

  return new Date(utcMs).toISOString();
}

export function defaultScheduledSendIso(): string {
  const now = new Date();
  const nowParts = getEasternParts(now);
  let year = Number(nowParts.year);
  let month = Number(nowParts.month);
  let day = Number(nowParts.day);

  let targetIso = easternDateTimeInputToIso(
    `${year}-${pad(month)}-${pad(day)}T14:00`,
  );
  if (!targetIso) return now.toISOString();

  if (new Date(targetIso) <= now) {
    const nextDay = addCalendarDays(year, month, day, 1);
    year = nextDay.year;
    month = nextDay.month;
    day = nextDay.day;
    targetIso =
      easternDateTimeInputToIso(
        `${year}-${pad(month)}-${pad(day)}T14:00`,
      ) ?? now.toISOString();
  }

  return targetIso;
}

export function formatLocalDateTimeInput(iso: string): string {
  const date = new Date(iso);
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

export function formatEasternDateTimeInput(iso: string): string {
  const parts = getEasternParts(new Date(iso));
  return [
    parts.year,
    "-",
    parts.month,
    "-",
    parts.day,
    "T",
    parts.hour,
    ":",
    parts.minute,
  ].join("");
}

export function formatEasternDateTime(
  iso: string | null | undefined,
): string {
  if (!iso) return "-";
  return getEasternFormatter({
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function getEasternTimeZoneLabel(
  iso: string | Date = new Date(),
): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return (
    getEasternFormatter({ timeZoneName: "short" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? "ET"
  );
}
