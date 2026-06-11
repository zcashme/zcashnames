const EASTERN_TZ = "America/New_York";

function easternParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

function easternOffsetMinutes(date: Date): number {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")
    ?.value;

  const match = value?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return -300;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? "0");
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function easternDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offsetMinutes = easternOffsetMinutes(approxUtc);
  return new Date(approxUtc.getTime() - offsetMinutes * 60_000);
}

export function nextEastern8am(): Date {
  const now = new Date();

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const probe = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const parts = easternParts(probe);
    const candidate = easternDateTimeToUtc(parts.year, parts.month, parts.day, 8, 0);
    if (candidate > now) return candidate;
  }

  const fallback = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const parts = easternParts(fallback);
  return easternDateTimeToUtc(parts.year, parts.month, parts.day, 8, 0);
}

export function formatEastern(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
