type ParsedReserveMemo = {
  name: string | null;
  uuid: string | null;
  uaddr: string | null;
  fields: Record<string, string>;
};

function normalizeReserveMemoInput(fullMemo: string): string {
  return fullMemo.startsWith("ZNS:RESERVE|")
    ? fullMemo.slice("ZNS:RESERVE|".length)
    : fullMemo;
}

export function parseWaitlistReserveMemo(fullMemo: string | null | undefined): ParsedReserveMemo | null {
  const trimmed = fullMemo?.replace(/\0+$/, "").trim();
  if (!trimmed) return null;

  const normalized = normalizeReserveMemoInput(trimmed);
  const fields: Record<string, string> = {};

  for (const part of normalized.split("|")) {
    const separatorIndex = part.indexOf("::");
    if (separatorIndex <= 0) continue;

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 2).trim();
    if (!key || !value) continue;
    fields[key.toLowerCase()] = value;
  }

  return {
    name: fields["name"] ?? null,
    uuid: fields["uuid"] ?? null,
    uaddr: fields["uaddr"] ?? null,
    fields,
  };
}

