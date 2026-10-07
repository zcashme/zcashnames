"use client";

import { useState, type ReactNode } from "react";

function Cite({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-semibold underline decoration-from-font underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

function ProductEvolution() {
  return (
    <div className="px-5 py-4 pl-12 text-sm leading-6 sm:px-6 sm:pl-14 [&_a]:text-[var(--fg-body)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      <p style={{ color: "var(--fg-body)" }}>
        ZECpages made users discoverable. ZcashMe made identities verifiable. ZNS made names on-chain.
      </p>
      <ul className="mt-3" style={{ color: "var(--fg-body)" }}>
        <li>
          2020: We built <Cite href="https://zecpages.com/about">ZECpages</Cite>, a directory of names
          and Zcash addresses, after using encrypted Zcash memos to send a newsletter. Profiles also had
          a message board.
        </li>
        <li>
          <Cite href="https://x.com/balajis/status/1290362181670727680">Balaji</Cite> shared ZECpages in
          August 2020.
        </li>
        <li>
          2025: This evolved into <Cite href="https://github.com/zcashme/directory">ZcashMe</Cite>, with
          simple links like <code>zcash.me/username</code>. Users could prove control of an address with
          a one-time passcode, then edit their profile and add social links.
        </li>
        <li>
          This connected a human identity to an address the user could prove they controlled. The
          username-to-address mapping still depended on ZcashMe.
        </li>
        <li>
          2026: <Cite href="https://www.zcashnames.com/docs">ZNS</Cite> moved names and resolution onto
          Zcash, making the mapping independently verifiable and names user-controlled on-chain.
        </li>
      </ul>
    </div>
  );
}

function FormingTheTeam() {
  return (
    <div className="space-y-3 px-5 py-4 pl-12 text-sm leading-6 sm:px-6 sm:pl-14 [&_a]:text-[var(--fg-body)]">
      <p style={{ color: "var(--fg-body)" }}>
        What began as one founder building Zcash tools became a team through two overlapping networks: the Zcash community and Network School.
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        Zcash Names founder{" "}
        <Cite href="https://www.linkedin.com/in/jamesajoseph">James Joseph</Cite> came to Zcash from statistics and pharmaceutical consulting. He became active in Zcash governance and community work, including the{" "}
        <Cite href="https://zfnd.org/meet-the-mgrc-candidates-and-finalized-list-of-members-in-the-community-advisory-panel/">
          Zcash Community Advisory Panel
        </Cite>
        , a Major Grants Review Committee candidacy in 2020, and years of participation in the Zcash Community Forum.
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        Joseph joined Network School in December 2025 and became a long-term member, bringing ZcashMe with him. Network School founder Balaji Srinivasan has supported the Zcash mission, having recently hosted a Zcash conference at the location.{" "}
        <Cite href="https://www.bankless.com/podcast/zodl-is-to-zcash-what-coinbase-was-to-bitcoin">
          Josh Swihart
        </Cite>{" "}
        recounted Balaji, who invested in his company Zodl, calling Zcash “one of the most important projects in the world.”
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        At Network School, ZcashMe received feedback from users, developers, wallet builders, and critics. While users could prove control of an address through a one-time passcode transaction and manage their profiles, name resolution still depended on a database operated by the team. That feedback helped lead to Zcash Names, moving name ownership and resolution on-chain so wallets can verify them independently.
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        Joseph met Julian Abraham at Network School in December 2025. Julian came from building proprietary algorithmic-trading infrastructure and had experience building performance-sensitive systems from scratch. After ZcashMe received funding from Balaji Srinivasan in February 2026, Julian left his job and joined full time as a core engineer. He now also leads developer workshops and technical education through the{" "}
        <Cite href="https://forum.zcashcommunity.com/t/zcash-network-school/55269/22">
          Zcash Network School program
        </Cite>
        .
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        <Cite href="https://de.linkedin.com/in/lana-i-62275124">Lana Ivina</Cite> joined with experience in protocol engineering and zero-knowledge technology. She previously worked at StarkWare, founded by Zcash founding scientist Eli Ben-Sasson, and is now a principal at Circuit Labs. She contributes to the protocol and technical rollout of ZcashMe and Zcash Names.
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        From May through July 2026, Zcash Community Grants funded a three-month{" "}
        <Cite href="https://forum.zcashcommunity.com/t/zcash-network-school/55269">
          Zcash Network School program
        </Cite>{" "}
        in Malaysia, giving the team office space and sustained access to users and developers through events, office hours, and wallet onboarding. The program reported 102 wallet activations, six educational events, and all three milestones accepted.
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        During this period, Zcash Names developed from a profile and naming product into a protocol for assigning, transferring, expiring, and resolving names without requiring wallets to trust the team’s database.
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        Zcash Community Grants then approved a separate{" "}
        <Cite href="https://forum.zcashcommunity.com/t/grant-proposal-zcash-name-service/55737">
          $92,200 milestone-based grant
        </Cite>{" "}
        to take Zcash Names beyond its beta and complete the protocol needed for wallets to verify name ownership and resolution from on-chain data.
      </p>
      <p style={{ color: "var(--fg-body)" }}>
        When Network School moved from Malaysia to Astana Hub in Kazakhstan, the Zcash program moved with it. In September 2026, Zcash Community Grants approved another{" "}
        <Cite href="https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues/431">
          $21,425 three-month program
        </Cite>
        , with James, Julian, and Lana continuing work on Zcash Names, developer workshops, community building, and wallet onboarding.
      </p>
    </div>
  );
}

const ROWS: { id: string; title: string; body?: ReactNode }[] = [
  { id: "evolution", title: "Product evolution from ZECpages to ZNS", body: <ProductEvolution /> },
  { id: "team", title: "Forming and Funding the Team", body: <FormingTheTeam /> },
];

export function BackgroundList() {
  const [openId, setOpenId] = useState<string | null>(ROWS[0]?.id ?? null);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="-mx-5 sm:-mx-6">
      <ol>
        {ROWS.map((row, index) => {
          const open = openId === row.id;
          const panelId = `background-${row.id}`;
          return (
            <li
              key={row.id}
              className={index === 0 ? "border-b border-t" : "border-b"}
              style={{ borderColor: "var(--faq-border)" }}
            >
              <button
                type="button"
                className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left text-sm leading-6 transition-colors duration-200 hover:text-[var(--color-accent-interactive)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:px-6 sm:text-base"
                style={{
                  color: open ? "var(--color-accent-interactive)" : "var(--fg-heading)",
                  background: open ? "var(--color-accent-interactive-soft)" : undefined,
                }}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(row.id)}
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
                <span>{row.title}</span>
              </button>
              <div
                id={panelId}
                role="region"
                aria-hidden={!open}
                className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
                style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
              >
                <div className="min-h-0 overflow-hidden" inert={!open ? true : undefined}>
                  {row.body}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
