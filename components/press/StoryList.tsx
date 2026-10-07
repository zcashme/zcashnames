"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

function Cite({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className="font-semibold underline decoration-from-font underline-offset-2"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

const ATTENTION_PAGE = 5;
const ATTENTION_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ATTENTION_HEADLINES: { href: string; title: string; date: string }[] = [
  {
    href: "https://u.today/zcash-miners-are-earning-bitcoin-beating-returns-heres-the-catch",
    title: "Zcash miners are earning Bitcoin-beating returns. Here's the catch.",
    date: "2026-10-05",
  },
  {
    href: "https://www.coindesk.com/tech/2026/10/05/zcash-s-25-second-blocks-go-live-on-public-testnet-ahead-of-schedule",
    title: "Zcash's 25-second blocks go live on public testnet ahead of schedule",
    date: "2026-10-05",
  },
  {
    href: "https://www.cryptotimes.io/2026/10/02/shielded-labs-launches-epoch-to-develop-post-quantum-cryptography-for-zcash/",
    title: "Shielded Labs Launches Epoch to Develop Post-Quantum Cryptography for Zcash",
    date: "2026-10-01",
  },
  {
    href: "https://cryptobriefing.com/zcash-tachyon-udon-zakura-common-integration/",
    title: "Zcash developers integrate Tachyon code into Zakura Common software",
    date: "2026-09-29",
  },
  {
    href: "https://decrypt.co/379105/zcash-wall-street-europe-first-etp",
    title: "Zcash's Wall Street Moment Reaches Europe With Its First ETP Listing",
    date: "2026-09-23",
  },
  {
    href: "https://bitcoinethereumnews.com/bitcoin/miners-chase-zcash-as-zec-rally-makes-it-4x-more-profitable-than-bitcoin/",
    title: "Miners chase Zcash as ZEC rally makes it 4X more profitable than Bitcoin",
    date: "2026-09-11",
  },
  {
    href: "https://beincrypto.com/bitcoin-whales-zcash-rally-1000/",
    title: "Bitcoin Whales Were Urging Friends to Buy Zcash Before Its Rally to $1,000",
    date: "2026-09-09",
  },
  {
    href: "https://www.fxstreet.com/cryptocurrencies/news/privacy-sector-surges-213-as-zcash-leads-crypto-recovery-202609072013",
    title: "Privacy sector surges 213% as Zcash leads crypto recovery",
    date: "2026-09-07",
  },
  {
    href: "https://news.bitcoin.com/featured/grayscales-zcash-etf-begins-trading-on-nyse-arca-with-spot-zec/",
    title: "Grayscale's Zcash ETF Begins Trading on NYSE Arca With Spot ZEC",
    date: "2026-08-25",
  },
  {
    href: "https://cryptobriefing.com/cypherpunk-mining-zcash-winklevoss-deal/",
    title: "Cypherpunk Technologies launches largest Zcash mining operation with $33M Winklevoss backing",
    date: "2026-08-18",
  },
  {
    href: "https://www.coindesk.com/research/building-the-zcash-machine-tachyon-and-quantum-readiness",
    title: "Building the Zcash Machine: Tachyon and Quantum Readiness",
    date: "2026-07-29",
  },
  {
    href: "https://blockchain.news/news/foundry-digital-zcash-mining-pool-launch-hashrate",
    title: "Foundry Digital Grabs 29% of ZEC Hashrate in Pool Launch",
    date: "2026-04-14",
  },
  {
    href: "https://www.theblock.co/news/deals/2026-03-09-zcash-open-development-lab-raises-25-million-crypto-investors-paradigm-a16z-others-392878",
    title: "Zcash Open Development Lab raises $25 million from leading crypto investors Paradigm, a16z and others",
    date: "2026-03-09",
  },
  {
    href: "https://decrypt.co/348274/zcash-treasury-company-launches-with-winklevoss-backing",
    title: "Zcash Treasury Company Launches With Winklevoss Backing",
    date: "2025-11-12",
  },
];

function attentionDateLabel(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${ATTENTION_MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function AttentionList() {
  const [count, setCount] = useState(ATTENTION_PAGE);
  const shown = ATTENTION_HEADLINES.slice(0, count);
  const canMore = count < ATTENTION_HEADLINES.length;
  const canLess = count > ATTENTION_PAGE;

  return (
    <>
      <ul>
        {shown.map((item) => (
          <li key={item.href}>
            <Cite href={item.href}>{item.title}</Cite>
            {` — ${attentionDateLabel(item.date)}`}
          </li>
        ))}
      </ul>
      {canMore || canLess ? (
        <div className="mt-3 flex gap-4 pl-5">
          {canMore ? (
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold underline decoration-from-font underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--color-accent-interactive)" }}
              onClick={() =>
                setCount((current) => Math.min(ATTENTION_HEADLINES.length, current + ATTENTION_PAGE))
              }
            >
              More
            </button>
          ) : null}
          {canLess ? (
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold underline decoration-from-font underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--color-accent-interactive)" }}
              onClick={() => setCount(ATTENTION_PAGE)}
            >
              Less
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function HistoryTable() {
  const line = "1px solid var(--faq-border)";
  const head = {
    color: "var(--fg-muted)",
    borderBottom: line,
  } as const;
  const cell = {
    color: "var(--fg-body)",
    borderBottom: line,
  } as const;
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--faq-border)" }}>
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="w-1/2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]" style={head}>
              ETH
            </th>
            <th className="w-1/2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]" style={head}>
              ZEC
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-3 py-3 align-top leading-6" style={cell}>
              Market cap: <strong>$83B → $569B</strong> (2021).{" "}
              <Cite href="https://coinmarketcap.com/historical/">CoinMarketCap</Cite>
            </td>
            <td className="px-3 py-3 align-top leading-6" style={cell}>
              Market cap: <strong>$8.4B → $22.7B</strong> (2026), <strong>2.7×</strong>.{" "}
              <Cite href="https://www.coingecko.com/en/coins/zcash/historical_data">CoinGecko</Cite>
            </td>
          </tr>
          <tr>
            <td className="px-3 py-3 align-top leading-6" style={cell}>
              NFT sales: <strong>$10M → $3.1B/month</strong> (Dec. 2020 → Dec. 2021).{" "}
              <Cite href="https://etp.coinshares.com/fr/insights/research-data/2022-outlook/">CoinShares</Cite>
            </td>
            <td className="px-3 py-3 align-top leading-6" style={cell}>
              NFTs emerging via <Cite href="https://www.zordinals.fun/">Zordinals</Cite>. Shielded Assets
              for tokens/NFTs are proposed, not mainnet.{" "}
              <Cite href="https://zips.z.cash/zip-0226">ZIP 226</Cite>
              {" · "}
              <Cite href="https://zips.z.cash/zip-0227">ZIP 227</Cite>
            </td>
          </tr>
          <tr>
            <td className="px-3 py-3 align-top leading-6" style={{ color: "var(--fg-body)" }}>
              ENS registrations: <strong>5,158 → 109,280/month</strong> (Dec. 2020 → Dec. 2021).{" "}
              <Cite href="https://etp.coinshares.com/fr/insights/research-data/2022-outlook/">CoinShares</Cite>
            </td>
            <td className="px-3 py-3 align-top leading-6" style={{ color: "var(--fg-body)" }}>
              <strong>Zcash Names:</strong> accepted name actions recorded on-chain.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const POINTS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "attention",
    title: "Zcash is receiving attention.",
    body: null,
  },
  {
    id: "addresses",
    title: "Crypto addresses are difficult to use.",
    body: (
      <ul>
        <li>People are accustomed to domain names, email addresses, and usernames.</li>
        <li>People don't go to a website by typing an IP address. They go to something.com.</li>
        <li>People don't remember phone numbers anymore. They search a contact list by name.</li>
        <li>
          A shielded address is much longer than others people already avoid copying. Bitcoin
          (26–34 chars), Zcash transparent (35), Ethereum (42), Taproot (62), Zcash Sapling (78), Monero
          (95), Monero integrated (106), Zcash unified (213).
        </li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "Zcash names do not reveal transactions.",
    body: (
      <ul>
        <li>
          On Etherscan,{" "}
          <Cite href="https://etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045">
            vitalik.eth
          </Cite>{" "}
          resolves to a public address and lists their activity.
        </li>
        <li>
          On Solscan, <Cite href="https://solscan.io/account/toly.sol">toly.sol</Cite> resolves to a
          public address and lists their activity.
        </li>
        <li>
          On ZecBlock, <Cite href="https://zecblock.com/name/james">james</Cite> resolves to a public
          address and does not list any{" "}
          <Cite href="https://zecblock.com/address/u100kaexr6pzft97m4gehnm5yvcgjtghg2cz9heqr6clm9p420k4mqfgslmdrc8wf46xqvhph30qdu7xg0xr5x4zsqwnfs07tnpwu4xlxyhnraefkrakpz6t3jhhq7ljt0fv3q3x8u6jms5jnqug86ajmftd0u38au2hrymctsrycecq3m">
            activity
          </Cite>
          .
        </li>
      </ul>
    ),
  },
  {
    id: "record",
    title: "Zcash doesn't have smart contracts or wallet signing: ZNS is innovative.",
    body: (
      <ul>
        <li>
          Name actions are sent through encrypted Zcash memos. One-time passcodes used to prove control
          of an address.
        </li>
        <li>
          Accepted actions are recorded on-chain, while verifiable Mint software checks availability,
          payment, expiry, and authorization by the current holder.
        </li>
        <li>
          Each accepted action links to the previous one, allowing wallets to reconstruct the current
          owner and state of a name without relying on a central database.
        </li>
      </ul>
    ),
  },
  {
    id: "history",
    title: "History may repeat. ENS grew with Ethereum's market cap.",
    body: <HistoryTable />,
  },
];

const BODY_CLASS =
  "text-sm leading-6 [&_a]:text-[var(--fg-body)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5";

const WIDE_QUERY = "(min-width: 768px)";
const FIRST_ID = POINTS[0].id;

export function StoryList() {
  const [openIds, setOpenIds] = useState<string[]>([FIRST_ID]);
  const [wide, setWide] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(FIRST_ID);
  const [shownId, setShownId] = useState<string | null>(FIRST_ID);
  const [visible, setVisible] = useState(true);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const swapTimer = useRef(0);

  useEffect(() => {
    const media = window.matchMedia(WIDE_QUERY);
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.clearTimeout(swapTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const measure = () => setPanelHeight(shownId ? node.scrollHeight : 0);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [shownId, visible]);

  function showOnSide(id: string | null) {
    window.clearTimeout(swapTimer.current);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (id === null) {
      setActiveId(null);
      if (reduce || !shownId) {
        setShownId(null);
        setVisible(false);
        return;
      }
      setVisible(false);
      swapTimer.current = window.setTimeout(() => setShownId(null), 180);
      return;
    }
    if (reduce || !shownId) {
      setActiveId(id);
      setShownId(id);
      setVisible(true);
      return;
    }
    setActiveId(id);
    setVisible(false);
    swapTimer.current = window.setTimeout(() => {
      setShownId(id);
      setVisible(true);
    }, 160);
  }

  function toggle(id: string) {
    if (window.matchMedia(WIDE_QUERY).matches) {
      const closing = activeId === id;
      showOnSide(closing ? null : id);
      setOpenIds(closing ? [] : [id]);
      return;
    }
    setOpenIds((current) => (current.includes(id) ? [] : [id]));
  }

  const shown = POINTS.find((point) => point.id === shownId);

  return (
    <div className="-mx-5 sm:-mx-6 md:grid md:grid-cols-2 md:items-start">
      <ol>
        {POINTS.map((point, index) => {
          const inlineOpen = openIds.includes(point.id);
          const open = wide ? activeId === point.id : inlineOpen;
          const panelId = `story-${point.id}`;
          return (
            <li
              key={point.id}
              className={index === 0 ? "border-b border-t" : "border-b"}
              style={{ borderColor: "var(--faq-border)" }}
            >
              <button
                id={`story-tab-${point.id}`}
                type="button"
                className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left text-sm leading-6 transition-colors duration-200 hover:text-[var(--color-accent-interactive)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-6 sm:text-base"
                style={{
                  color: open ? "var(--color-accent-interactive)" : "var(--fg-heading)",
                  background: open ? "var(--color-accent-interactive-soft)" : undefined,
                }}
                aria-expanded={open}
                aria-current={open ? "true" : undefined}
                aria-controls={wide ? "story-side-panel" : panelId}
                onClick={() => toggle(point.id)}
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-block w-4 shrink-0 text-center text-lg leading-none transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{
                    color: open ? "var(--color-accent-interactive)" : "var(--fg-muted)",
                    transform: open ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
                <span>{point.title}</span>
              </button>
              <div
                id={panelId}
                role="region"
                aria-hidden={!inlineOpen}
                className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none md:hidden"
                style={{
                  gridTemplateRows: inlineOpen ? "1fr" : "0fr",
                  opacity: inlineOpen ? 1 : 0,
                }}
              >
                <div className="min-h-0 overflow-hidden" inert={!inlineOpen ? true : undefined}>
                  <div className={`px-5 py-4 pl-12 sm:px-6 sm:pl-14 ${BODY_CLASS}`}>
                    {point.id === "attention" ? <AttentionList /> : point.body}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div
        id="story-side-panel"
        role="region"
        aria-labelledby={shownId ? `story-tab-${shownId}` : undefined}
        className="hidden min-w-0 md:block"
        style={{ borderLeft: "1px solid var(--faq-border)" }}
      >
        <div
          className="overflow-hidden motion-reduce:transition-none"
          style={{
            height: !shownId ? 0 : panelHeight == null ? "auto" : panelHeight,
            transition: panelHeight == null ? "none" : "height 280ms ease",
          }}
        >
          <div
            ref={contentRef}
            className={`px-6 py-4 motion-reduce:transition-none ${BODY_CLASS}`}
            style={{
              opacity: visible && shown ? 1 : 0,
              transition: "opacity 180ms ease",
            }}
            inert={!visible || !shown ? true : undefined}
          >
            {shown?.id === "attention" ? <AttentionList /> : shown?.body}
          </div>
        </div>
      </div>
    </div>
  );
}
