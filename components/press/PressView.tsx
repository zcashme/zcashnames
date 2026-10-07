"use client";

import Link from "next/link";
import { useLayoutEffect, useState, type ReactNode } from "react";
import PartnerReel from "@/components/landing/PartnerReel";
import { PhoneSoloCarousel } from "@/components/landing/PhoneStage";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import type { FaqItem } from "@/lib/faq";
import {
  APPS,
  HOW_DESIGN,
  HOW_GETTING_A_NAME,
  HOW_NAME_IN_USE,
  LAUNCH_PRICES,
  QUESTIONS_TRUST,
  QUESTIONS_WHO_CAN_CHANGE,
  STORY,
  WALLETS,
  type Qa,
} from "@/lib/press/copy";
import type { TimeSeriesPoint } from "@/lib/leaders/leaders";
import type { PressStats } from "@/lib/press/types";
import { BackgroundList } from "./BackgroundList";
import { LeadersSignupChart } from "./LeadersSignupChart";
import { NameLengthChart } from "./NameLengthChart";
import { SocialPosts } from "./SocialPosts";
import { StoryList } from "./StoryList";

const INTEGRATION_COUNT = WALLETS.length + APPS.length;

const JUMPS = [
  ["story", "Story"],
  ["background", "Background"],
  ["how", "How it works"],
  ["ens", "ENS versus ZNS"],
  ["integrations", "Integrations"],
  ["statistics", "Statistics"],
  ["coverage", "Coverage"],
  ["assets", "Assets"],
  ["interviews", "Interviews"],
] as const;

function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <p>
      {parts.map((part, index) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={index}>{part.slice(1, -1)}</code>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

function QuestionGroup({
  title,
  items,
  openId,
  onToggle,
}: {
  title: string;
  items: FaqItem[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <h3 className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
        {title}
      </h3>
      <FaqAccordion items={items} openId={openId} onToggle={onToggle} variant="card" maxAnswerPx={4800} />
    </>
  );
}

function toFaqItems(items: Qa[]): FaqItem[] {
  return items.map((item) => ({
    id: item.id,
    question: item.question,
    answer: (
      <div className="space-y-3">
        {item.paragraphs.map((paragraph) => (
          <RichText key={paragraph.slice(0, 48)} text={paragraph} />
        ))}
      </div>
    ),
  }));
}

function pricingTableItem(): FaqItem {
  return {
    id: "pricing",
    question: "Pricing",
    answer: (
      <div className="space-y-3">
        <p>
          Launch policy, from the public 7 September 2026 price article. Prices are shown in USD and paid in ZEC. Forever-tier is 3× the yearly price.
        </p>
        <TableWrap compact>
          <thead>
            <tr>
              <Th>Length</Th>
              <Th>Yearly</Th>
              <Th>Forever-tier</Th>
            </tr>
          </thead>
          <tbody>
            {LAUNCH_PRICES.map((row) => (
              <tr key={row.length}>
                <Td>{row.length}</Td>
                <Td>{row.yearly}</Td>
                <Td>{row.forever}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p>The article wrote the last band as 6–63 characters. The protocol maximum is 62.</p>
      </div>
    ),
  };
}

function Section({
  id,
  title,
  children,
  collapsible = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const heading = (
    <h2 className="type-kicker" style={{ color: "var(--section-title-accent)" }}>
      {title}
    </h2>
  );
  const body = (
    <div className="space-y-4 text-base leading-7" style={{ color: "var(--fg-body)" }}>
      {children}
    </div>
  );

  return (
    <section id={id} className="scroll-mt-24">
      <div className={`flex flex-wrap items-center gap-3 ${collapsible && !open ? "" : "mb-3"}`}>
        {collapsible ? (
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 text-left"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            onClick={() => setOpen((value) => !value)}
          >
            <span
              aria-hidden="true"
              className="inline-block w-4 text-center text-2xl leading-none transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{
                color: "var(--section-title-accent)",
                transform: open ? "rotate(45deg)" : "rotate(0deg)",
              }}
            >
              +
            </span>
            {heading}
          </button>
        ) : (
          heading
        )}
      </div>
      {collapsible ? (
        <div
          id={`${id}-panel`}
          className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
        >
          <div className="min-h-0 overflow-hidden" inert={!open ? true : undefined}>
            {body}
          </div>
        </div>
      ) : (
        body
      )}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border px-5 py-5 sm:px-6"
      style={{
        borderColor: "var(--faq-border)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
      }}
    >
      {children}
    </div>
  );
}

function InProgressPill() {
  return (
    <span
      className="ml-1.5 inline-flex rounded-full px-1.5 py-0.5 align-middle text-[10px] font-semibold leading-4"
      style={{
        color: "var(--color-accent-interactive)",
        background: "var(--color-accent-interactive-soft)",
      }}
    >
      In-Progress
    </span>
  );
}

function TableWrap({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--faq-border)" }}>
      <table className={compact ? "w-full border-collapse text-left text-sm" : "w-full min-w-[36rem] border-collapse text-left text-sm"}>
        {children}
      </table>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th
      className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
      style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--faq-border)" }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td
      className="px-4 py-3 align-top leading-6"
      style={{ color: "var(--fg-body)", borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)" }}
    >
      {children}
    </td>
  );
}

function formatWhen(stats: PressStats): string {
  if (!stats.namesLive && !stats.betaLive && !stats.emailVerifiedLive) {
    return `Snapshot ${stats.asOf}`;
  }
  const date = new Date(stats.asOf);
  if (Number.isNaN(date.getTime())) return stats.asOf;
  return `${date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  })} ET`;
}

function heroAsOf(when: string): string {
  const dated = when.startsWith("Snapshot ") ? when.slice("Snapshot ".length) : when;
  return `As of ${dated}`;
}

const EARLY_ACCESS_LINE =
  "Oct 15: Early Access opens at 12:00 PM Eastern for waitlisters who reserved a name. Reservations close then.";

const OPEN_REGISTRATION_LINE =
  "Oct 30: open registration begins after those reservations have had a chance to claim the name they are waiting for.";

type ScheduleEvent = { key: string; text: string; note?: string; extra?: ReactNode };

function ScheduleList({ events, className }: { events: ScheduleEvent[]; className?: string }) {
  const tone = "var(--color-accent-interactive-soft)";
  return (
    <ol className={className}>
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <li key={event.key} className={`relative flex gap-3 ${last ? "" : "pb-5"}`}>
            <span
              className="relative z-10 mt-[9px] h-2 w-2 shrink-0 rounded-full"
              style={{ background: tone }}
              aria-hidden="true"
            />
            {last ? null : (
              <span
                aria-hidden="true"
                className="absolute left-[3px] top-[13px] h-full w-0.5"
                style={{ background: tone }}
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-6" style={{ color: "var(--fg-muted)" }}>
                {event.text}
              </p>
              {event.extra ? <div className="mt-4">{event.extra}</div> : null}
              {event.note ? (
                <p className="mt-1 text-xs font-normal leading-5" style={{ color: "var(--fg-muted)" }}>
                  {event.note}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const DATE_EVENTS: ScheduleEvent[] = [
  { key: "early", text: EARLY_ACCESS_LINE },
  { key: "open", text: OPEN_REGISTRATION_LINE },
];

function HeroCounts({ stats }: { stats: PressStats }) {
  return (
    <div className="flex flex-wrap items-start justify-start gap-x-8 gap-y-3 text-sm sm:text-base">
      <Stat value={stats.emailVerified} label="waitlisted names" since="since April" icon={<SearchIcon />} />
      <Stat value={stats.reserved} label="paid reservations" since="since August 18th" icon={<CheckIcon />} />
      <Stat
        value={stats.protectedListCount}
        label="protected names"
        since="to prevent phishing; plus top ENS"
        icon={<PadlockSymbol className="h-3.5 w-3.5" />}
      />
      <Stat
        value={INTEGRATION_COUNT}
        suffix="+"
        label="integrations"
        since="wallets, dexes, explorers, more"
        icon={<IntegrationsIcon />}
      />
    </div>
  );
}

function HeroSchedule({ asOfLabel, children }: { asOfLabel: string; children?: ReactNode }) {
  return (
    <ScheduleList
      className="mt-6 max-w-2xl"
      events={[{ key: "asof", text: `${asOfLabel}:`, extra: children }, ...DATE_EVENTS]}
    />
  );
}

export default function PressView({
  stats,
  signupSeries,
}: {
  stats: PressStats;
  signupSeries: TimeSeriesPoint[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggleQuestion = (id: string) => setOpenId((current) => (current === id ? null : id));
  const when = formatWhen(stats);
  const asOfLabel = heroAsOf(when);

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-6">
      {/* One outer stroke. Jump to has no border of its own, so the side lines run straight through. */}
      <div className="rounded-2xl border" style={{ borderColor: "var(--faq-border)" }}>
        <section
          className="rounded-t-2xl border-b px-3 py-6 sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
          }}
        >
          <h1 className="sr-only">Zcash Names</h1>
          <div className="mb-4 text-center sm:hidden">
            <p className="text-3xl font-bold leading-tight" style={{ color: "var(--fg-heading)" }}>
              Alice.zec
            </p>
            <p className="mt-2 text-base leading-7" style={{ color: "var(--fg-body)" }}>
              Personal names for shielded addresses.
            </p>
          </div>
          <div className="flex items-start gap-4 sm:gap-10">
            <PhoneSoloCarousel className="sm:mt-1" />
            <div className="min-w-0 flex-1 text-left">
              <div className="hidden max-w-2xl text-left sm:block">
                <p className="text-3xl font-bold leading-tight" style={{ color: "var(--fg-heading)" }}>
                  Alice.zec
                </p>
                <p className="mt-2 text-base leading-7 sm:text-lg sm:leading-8" style={{ color: "var(--fg-body)" }}>
                  Personal names for shielded addresses.
                </p>
              </div>
              <div className="hidden sm:block">
                <HeroSchedule asOfLabel={asOfLabel}>
                  <HeroCounts stats={stats} />
                </HeroSchedule>
              </div>
              <div className="sm:hidden">
                <HeroCounts stats={stats} />
              </div>
            </div>
          </div>
          <ScheduleList className="mt-6 max-w-2xl sm:hidden" events={DATE_EVENTS} />
          <div className="-mx-3 mt-8 sm:-mx-8">
            <PartnerReel embedded />
          </div>
        </section>

        <div
          className="rounded-b-2xl px-5 py-5 sm:px-6"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
          }}
        >
          <nav className="flex flex-col items-center gap-3 text-center" aria-label="Press sections">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--fg-muted)" }}>
              Jump to
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {JUMPS.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="rounded-md border border-border-muted px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-[920px] flex-col gap-12">
        <p className="text-base leading-7" style={{ color: "var(--fg-body)" }}>
          {STORY}
        </p>

        <Section id="story" title="Story">
          <Card>
            <StoryList />
          </Card>
        </Section>

        <Section id="background" title="Background">
          <Card>
            <BackgroundList />
          </Card>
        </Section>

        <Section id="how" title="How it works">
          <QuestionGroup
            title="Getting a name"
            items={[...toFaqItems(HOW_GETTING_A_NAME), pricingTableItem()]}
            openId={openId}
            onToggle={toggleQuestion}
          />
          <QuestionGroup title="A name in use" items={toFaqItems(HOW_NAME_IN_USE)} openId={openId} onToggle={toggleQuestion} />
          <QuestionGroup title="Design" items={toFaqItems(HOW_DESIGN)} openId={openId} onToggle={toggleQuestion} />
          <QuestionGroup
            title="Who can change a name"
            items={toFaqItems(QUESTIONS_WHO_CAN_CHANGE)}
            openId={openId}
            onToggle={toggleQuestion}
          />
          <QuestionGroup
            title="What a reader has to trust"
            items={toFaqItems(QUESTIONS_TRUST)}
            openId={openId}
            onToggle={toggleQuestion}
          />
        </Section>

        <Section id="ens" title="ENS versus ZNS">
          <TableWrap>
            <thead>
              <tr>
                <Th> </Th>
                <Th>ENS</Th>
                <Th>ZNS</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td>Human-readable names</Td>
                <Td>Yes</Td>
                <Td>Yes</Td>
              </tr>
              <tr>
                <Td>Address resolution</Td>
                <Td>Yes</Td>
                <Td>Yes</Td>
              </tr>
              <tr>
                <Td>Smart contracts</Td>
                <Td>Yes</Td>
                <Td>No, TEE</Td>
              </tr>
              <tr>
                <Td>Transaction history</Td>
                <Td>Public</Td>
                <Td>Shielded</Td>
              </tr>
              <tr>
                <Td>Website hosting</Td>
                <Td>Yes</Td>
                <Td>Not the focus</Td>
              </tr>
              <tr>
                <Td>Identity/login</Td>
                <Td>Yes</Td>
                <Td>Roadmap/prototype status</Td>
              </tr>
              <tr>
                <Td>Registration model</Td>
                <Td>Annual renewal</Td>
                <Td>Annual &amp; Lifetime with Liveliness check</Td>
              </tr>
              <tr>
                <Td>Subdomains</Td>
                <Td>Yes</Td>
                <Td>Roadmap</Td>
              </tr>
              <tr>
                <Td>Multi-chain resolution</Td>
                <Td>Yes</Td>
                <Td>Roadmap</Td>
              </tr>
            </tbody>
          </TableWrap>
        </Section>

        <Section id="integrations" title="Integrations">
          <p>
            ZNS is already live in Zingo, the longest-running Zcash wallet; Noir, a web wallet connecting Zcash to DeFi; Cake Wallet, the most popular Monero wallet; Edge, a multicurrency wallet operating since 2014; and Cyze, which supports multisig transactions. More integrations are in progress.
          </p>
          <LogoGrid items={[...WALLETS, ...APPS]} />
          <p>
            Open these wallets and type in any name you find in our beta{" "}
            <Link href="/explorer" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
              /explorer
            </Link>{" "}
            in the Zcash address field.
          </p>
        </Section>

        <Section id="statistics" title="Statistics">
          <LeadersSignupChart series={signupSeries} />
          <NameLengthChart rows={stats.nameLengths} />
        </Section>

        <Section id="coverage" title="Coverage">
          <SocialPosts />
        </Section>

        <Section id="assets" title="Assets">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <Link href="/brandkit" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                Brand kit
              </Link>
            </li>
            <li>
              <Link href="/docs" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                Docs
              </Link>
              <InProgressPill />
              ,{" "}
              <Link href="/docs/sdk" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                SDK
              </Link>
              <InProgressPill />
              ,{" "}
              <Link href="/docs/learn/pricing" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                pricing
              </Link>
              ,{" "}
              <Link href="/roadmap" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                roadmap
              </Link>
            </li>
            <li>
              <Link href="/explorer" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                Explorer
              </Link>
              ,{" "}
              <Link href="/waitlist/view" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                waitlist
              </Link>
              ,{" "}
              <Link href="/protected" className="underline" style={{ color: "var(--color-accent-interactive)" }}>
                protected names
              </Link>
            </li>
            <li>
              <a className="underline" href="https://github.com/zcashme/zcashnames">
                GitHub
              </a>
            </li>
          </ul>
        </Section>

        <Section id="interviews" title="Interviews">
          <p>
            <a
              className="underline"
              href="https://cal.com/zcash"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-accent-interactive)" }}
            >
              cal.com/zcash
            </a>
            ,{" "}
            <a className="underline" href="mailto:support@zcashnames.com" style={{ color: "var(--color-accent-interactive)" }}>
              support@zcashnames.com
            </a>{" "}
            and{" "}
            <a className="underline" href="https://x.com/ZcashNames" style={{ color: "var(--color-accent-interactive)" }}>
              @ZcashNames
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}

function IntegrationsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PadlockSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.6C7 4.61 8.57 3 10.5 3C12.43 3 14 4.61 14 6.6V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function scrambleDigits(formatted: string, locked: number): string {
  let seen = 0;
  return formatted.replace(/\d/g, (digit) => {
    const place = seen;
    seen += 1;
    if (place < locked) return digit;
    return String(Math.floor(Math.random() * 10));
  });
}

function RollingNumber({ value }: { value: number }) {
  const formatted = value.toLocaleString("en-US");
  const [display, setDisplay] = useState(formatted);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setDisplay(formatted);
      return;
    }

    const digitCount = formatted.match(/\d/g)?.length ?? 0;
    const started = performance.now();
    const duration = 1500;
    let timer = 0;

    const tick = () => {
      const elapsed = performance.now() - started;
      if (elapsed >= duration) {
        setDisplay(formatted);
        return;
      }
      const locked = Math.floor((elapsed / duration) * (digitCount + 1));
      setDisplay(scrambleDigits(formatted, locked));
      timer = window.setTimeout(tick, 48);
    };

    setDisplay(scrambleDigits(formatted, 0));
    timer = window.setTimeout(tick, 48);
    return () => window.clearTimeout(timer);
  }, [formatted]);

  return (
    <span className="relative inline-block" style={{ fontVariantNumeric: "tabular-nums" }}>
      <span className="sr-only">{formatted}</span>
      <span className="inline-grid" aria-hidden="true">
        <span className="invisible col-start-1 row-start-1">{formatted}</span>
        <span className="col-start-1 row-start-1">{display}</span>
      </span>
    </span>
  );
}

function Stat({
  value,
  label,
  icon,
  since,
  suffix,
}: {
  value: number;
  label: string;
  icon: ReactNode;
  since?: string;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-start gap-2" style={{ color: "var(--fg-body)" }}>
      <span
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "var(--color-accent-interactive-soft)",
          color: "var(--color-accent-interactive)",
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>
        <span className="block">
          <strong style={{ color: "var(--fg-heading)" }}>
            <RollingNumber value={value} />
            {suffix}
          </strong>{" "}
          {label}
        </span>
        {since ? (
          <span className="block text-xs font-normal leading-4" style={{ color: "var(--fg-muted)" }}>
            {since}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function LogoGrid({
  items,
}: {
  items: readonly {
    name: string;
    href: string;
    icon: string;
    lightIcon?: string;
    iconClassName?: string;
    note?: string;
    badge?: string;
  }[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const iconClass = item.iconClassName ?? "h-8 w-8 object-contain";
        return (
          <li key={item.name}>
            <a
              href={item.href}
              className="flex items-center gap-3 rounded-xl border px-3 py-3"
              style={{ borderColor: "var(--faq-border)" }}
            >
              {item.lightIcon ? (
                <span className="relative shrink-0">
                  <img src={item.icon} alt="" className={`${iconClass} [[data-theme=light]_&]:hidden`} />
                  <img src={item.lightIcon} alt="" className={`hidden ${iconClass} [[data-theme=light]_&]:block`} />
                </span>
              ) : (
                <img src={item.icon} alt="" className={iconClass} />
              )}
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
                  <span>{item.name}</span>
                  {item.badge ? (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-4"
                      style={{
                        color: "var(--color-accent-interactive)",
                        background: "var(--color-accent-interactive-soft)",
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                {item.note ? (
                  <span className="block text-xs leading-5" style={{ color: "var(--fg-muted)" }}>
                    {item.note}
                  </span>
                ) : null}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
