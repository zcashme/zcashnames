import SoftRedirect from "@/components/SoftRedirect";
import { RESERVE_METADATA } from "@/lib/reserve-metadata";

export const metadata = RESERVE_METADATA;

type WaitlistReserveAliasProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildReserveHref(params: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null && item !== "") qs.append(key, item);
      }
    } else if (value != null && value !== "") {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  return query ? `/reserve?${query}` : "/reserve";
}

/** Alias of `/reserve` so `/waitlist/reserve` shares the same Open Graph link preview. */
export default async function WaitlistReserveAliasPage({
  searchParams,
}: WaitlistReserveAliasProps) {
  const params = (await searchParams) ?? {};
  const href = buildReserveHref(params);
  return <SoftRedirect href={href} label="Continue to reservation dashboard" />;
}
