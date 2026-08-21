import Link from "next/link";
import type { ReactNode } from "react";
import {
  WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL,
  WAITLIST_VIEW_EARLY_ACCESS_LABEL,
} from "@/lib/waitlist/early-access";
import { reservedReferralSpotPhrase } from "@/lib/waitlist/referral-spots";
import type { FaqSection } from "./types";

function FaqA({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className="underline">
      {children}
    </Link>
  );
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "home",
    href: "/",
    title: "Names & basics",
    blurb: "What a Zcash name is, what you can do with one, and how ownership and privacy work.",
    items: [
      {
        id: "home-what-is-a-zcash-name",
        question: "What is a Zcash name?",
        surfaces: ["home"],
        homeGroup: "The basics",
        answer:
          "A Zcash name is a human-readable name that maps to a Zcash unified address and profile links. Instead of sharing a long cryptographic address, you share something like yourname.zcash.",
      },
      {
        id: "home-what-can-i-do",
        question: "What can I do with my Zcash name?",
        surfaces: ["home"],
        homeGroup: "The basics",
        answer: (
          <>
            Your Zcash name replaces long wallet addresses with a simple name for sending and receiving
            payments. Each name can be linked to a{" "}
            <FaqA href="https://zcash.me">Zcash.me</FaqA> profile so others can verify who they are
            transacting with. You can claim a name to use it, hold it as a digital asset, list it for
            sale, or transfer it later.
          </>
        ),
      },
      {
        id: "home-zcash-vs-zec",
        question: "Do .zcash and .zec mean different names?",
        answer:
          "No. Both suffixes refer to the same underlying name. alice.zcash and alice.zec resolve to the same registration.",
      },
      {
        id: "home-do-i-own-my-name",
        question: "Do I really own my name?",
        surfaces: ["home"],
        homeGroup: "The basics",
        answer:
          "Yes. Your name is registered on an on-chain registry linked to your unified address. There are no renewal fees. You can sell, transfer, update, or release the name. Only the controlling address can authorize those changes.",
      },
      {
        id: "home-keep-name-active",
        question: "How do I keep my Zcash name active?",
        surfaces: ["home"],
        homeGroup: "The basics",
        answer: (
          <>
            There are no renewal fees today. Once claimed, a name stays registered until you sell it
            or release it. Activity-based expiry is on the{" "}
            <FaqA href="/roadmap">roadmap</FaqA>, not the live rule. See{" "}
            <FaqA href="/docs/learn/pricing">pricing</FaqA> and{" "}
            <FaqA href="/docs/learn/name-lifecycle">name lifecycle</FaqA> for the current model.
          </>
        ),
      },
      {
        id: "home-payments-private",
        question: "How do payments stay private?",
        surfaces: ["home"],
        homeGroup: "Privacy & payments",
        answer:
          "Payments made with Zcash shielded transactions do not publicly expose amounts and balances on the public ledger.",
      },
      {
        id: "home-linking-privacy",
        question: "Does linking my name to an address hurt my privacy?",
        surfaces: ["home"],
        homeGroup: "Privacy & payments",
        answer: (
          <>
            The name-to-address mapping is public by design: anyone who knows your name can resolve
            it. Zcash shielded transactions still keep amounts, balances, and counterparties off the
            public ledger. It is like sharing an email address — people can reach you, but they cannot
            read your inbox. See <FaqA href="/docs/learn/privacy">privacy</FaqA> for the full model.
          </>
        ),
      },
      {
        id: "home-other-cryptocurrencies",
        question: "Can people pay me with other cryptocurrencies?",
        surfaces: ["home"],
        homeGroup: "Privacy & payments",
        answer:
          "Yes. Cross-pay flows let senders use popular assets while settlement can still arrive in Zcash to the address associated with your Zcash name.",
      },
      {
        id: "home-login-with-zcash",
        question: "How does Log in with Zcash work?",
        surfaces: ["home"],
        homeGroup: "Privacy & payments",
        answer: (
          <>
            Your Zcash name resolves to an address. That address receives a one-time passcode. Replying
            with the passcode proves you control the address. No passwords or third-party accounts are
            required. See <FaqA href="/docs/use/otp-verification">OTP verification</FaqA>.
          </>
        ),
      },
      {
        id: "home-testnet-mode",
        question: "What is testnet mode?",
        surfaces: ["home"],
        homeGroup: "Getting access",
        answer:
          "Testnet mode lets you explore Zcash Names without using real ZEC. Testnet transactions use TAZ, which has no monetary value. It is a safe way to try registering names, updating addresses, and listing names for sale before using mainnet.",
      },
      {
        id: "home-zcash-me",
        question: "What is the relationship between Zcash Names and zcash.me?",
        answer: (
          <>
            Registering a Zcash name automatically creates the matching{" "}
            <FaqA href="https://zcash.me">zcash.me</FaqA> profile. You can add a bio, links, and an
            avatar later. The name is the on-chain identifier; the profile is the public page that
            sits on top of it.
          </>
        ),
      },
      {
        id: "home-search-a-name",
        question: "How do I search for a name?",
        answer: (
          <>
            Use the search bar on the <FaqA href="/">home page</FaqA> or browse the{" "}
            <FaqA href="/explorer">Explorer</FaqA>. Search tells you whether a name is available,
            registered, listed for sale, protected, or blocked.
          </>
        ),
      },
    ],
  },
  {
    id: "waitlist",
    href: "/waitlist",
    title: "Waitlist",
    blurb: "Join with a preferred name, confirm your email, and get a referral link.",
    items: [
      {
        id: "waitlist-how-to-join",
        question: "How do I join the waitlist?",
        answer: (
          <>
            Open <FaqA href="/waitlist">/waitlist</FaqA>, enter the name you want and your email, then
            confirm the email we send you. If someone invited you, keep their <code>?ref=</code> code
            in the URL so the referral is attributed.
          </>
        ),
      },
      {
        id: "waitlist-is-name-reserved",
        question: "I joined the waitlist — is my name reserved?",
        surfaces: ["home"],
        homeGroup: "Getting access",
        answer: (
          <>
            No. Joining and confirming your email records your interest and your place in line. It does
            not lock the name and it does not purchase it. A completed reservation on{" "}
            <FaqA href="/reserve">/reserve</FaqA> gives you the option to buy <em>that</em> name during
            Early Access. It still does not guarantee the string will be claimable if it is protected
            or otherwise unavailable. See <FaqA href="/faq#reserve">reservation questions</FaqA>.
          </>
        ),
      },
      {
        id: "waitlist-after-confirm",
        question: "What happens after I confirm my email?",
        answer: (
          <>
            We email you a reservation link. Complete the on-chain reservation to become eligible for
            an Early Access code. Until you reserve, your Position on{" "}
            <FaqA href="/waitlist/view">/waitlist/view</FaqA> stays N/A. You also get a referral link
            you can share from <FaqA href="/sharekit">/sharekit</FaqA> or the{" "}
            <FaqA href="/leaders/ref">referral dashboard</FaqA>.
          </>
        ),
      },
      {
        id: "waitlist-referrals-work",
        question: "How do waitlist referrals work?",
        surfaces: ["home"],
        homeGroup: "Getting access",
        answer: (
          <>
            Sharing your referral link attributes people who join through it to you. Only referrals who
            also complete a reservation improve your adjusted line: {reservedReferralSpotPhrase("direct")}{" "}
            and {reservedReferralSpotPhrase("indirect")} move you up 1. Referral <em>rewards</em> are
            separate — they pay when the referred person claims a name, up to 0.05 ZEC (1/5 of the
            lowest claim price at purchase time). <FaqA href="/leaders/terms">View terms</FaqA>.
          </>
        ),
      },
      {
        id: "waitlist-newsletter",
        question: "Is the newsletter the same as the waitlist?",
        answer: (
          <>
            No. The waitlist is the Early Access queue for a specific name. The newsletter is optional
            product updates. You can subscribe from the{" "}
            <FaqA href="/#newsletter">home page</FaqA> without joining the waitlist, and you can manage
            email preferences later from unsubscribe links.
          </>
        ),
      },
      {
        id: "waitlist-multiple-names",
        question: "Can I waitlist more than one name?",
        answer: (
          <>
            Yes. Submit another name from <FaqA href="/waitlist">/waitlist</FaqA> or{" "}
            <FaqA href="/reserve">/reserve</FaqA>. Each name is its own queue. Each reservation still
            needs its own on-chain payment.
          </>
        ),
      },
      {
        id: "waitlist-missing-email",
        question: "I did not get a confirmation or reservation email. What should I do?",
        answer: (
          <>
            Check spam and the exact inbox you used. Confirmation and reservation mail can be easy to
            filter. If you already confirmed, request another reservation link on{" "}
            <FaqA href="/reserve">/reserve</FaqA> — the public form will not tell you whether the
            address is on the waitlist. If nothing arrives, write{" "}
            <FaqA href="mailto:support@zcashnames.com">support@zcashnames.com</FaqA>.
          </>
        ),
      },
    ],
  },
  {
    id: "waitlist-view",
    href: "/waitlist/view",
    title: "Waitlist view",
    blurb: "Read the public queue: line numbers, statuses, rank, and reservation state.",
    items: [
      {
        id: "waitlist-view-read-table",
        question: "How do I read the waitlist table?",
        surfaces: ["waitlist-view"],
        answer: (
          <>
            <p>Each row is one waitlisted name. Read the columns left to right:</p>
            <ul>
              <li>
                <strong>#</strong> — verified join order (original line number).
              </li>
              <li>
                <strong>Adj#</strong> — referral-adjusted line number. Better ranks move closer to the
                front.
              </li>
              <li>
                <strong>Name</strong> — the waitlisted name and its referral code.
              </li>
              <li>
                <strong>Position</strong> — place among everyone waitlisting the same name, or N/A
                until reserved.
              </li>
              <li>
                <strong>Status</strong> — Protected names are held back; Reserved names have completed
                payment; Pending names are waiting on reservation; Available names have no current
                conflict or hold.
              </li>
              <li>
                <strong>Refs</strong> — reserved referral totals (direct and/or indirect when both
                apply).
              </li>
            </ul>
            <p>Tap any column header on the table for a short explanation of that column.</p>
          </>
        ),
      },
      {
        id: "waitlist-view-statuses",
        question: "What do Reserved, Protected, Pending, and Available mean?",
        answer: (
          <>
            <strong>Reserved</strong> means the waitlist entry has a confirmed qualifying reservation
            payment. <strong>Protected</strong> means the name is specially gated and needs an unlock
            path — see <FaqA href="/faq#protected">protected names</FaqA>. <strong>Pending</strong>{" "}
            means the name is not protected and not reserved. <strong>Available</strong> means the
            entry is neither reserved nor protected and does not currently have competing interest
            driving a pending queue state.
          </>
        ),
      },
      {
        id: "waitlist-view-position-na",
        question: "Why is my Position N/A?",
        answer: (
          <>
            Position is the name-specific reserved queue. Until you verify your email and complete an
            on-chain reservation, there is no reserved rank to show. After both are done, Position
            compares your adjusted line against everyone else waiting for the same name.
          </>
        ),
      },
      {
        id: "waitlist-view-position-changes",
        question: "Why can my queue position still change?",
        answer:
          "Queue order is name-specific. If other people are waiting for the same name, their completed referral thresholds can improve their adjusted position too. When adjusted values tie, the earlier original waitlist line wins.",
      },
      {
        id: "waitlist-view-queue-key",
        question: "Why would I want to use the queue viewing key?",
        surfaces: ["waitlist-view"],
        answer: (
          <>
            The queue viewing key lets participants and observers inspect incoming reservation
            payments without spending authority. It helps the community verify that reservations are
            reaching the expected wallet. Open the key from the{" "}
            <FaqA href="/waitlist/view">public waitlist view</FaqA>.
          </>
        ),
      },
      {
        id: "waitlist-view-search",
        question: "How do I search the public waitlist?",
        answer: (
          <>
            Use the search field on <FaqA href="/waitlist/view">/waitlist/view</FaqA>. Contains mode
            matches part of a name; exact mode matches the full string. You can also filter to reserved
            or protected rows and tap a row for summary, referrals, and protection detail.
          </>
        ),
      },
    ],
  },
  {
    id: "reserve",
    href: "/reserve",
    title: "Reserve",
    blurb: "Complete the on-chain reservation that makes you eligible for Early Access.",
    items: [
      {
        id: "reserve-why-reserve",
        question: "Why do I need to reserve a name after joining the waitlist?",
        surfaces: ["waitlist-view"],
        answer: (
          <>
            Email confirmation alone is not sybil resistant. One person can create many inboxes and
            occupy many waitlist positions cheaply. The reservation flow on{" "}
            <FaqA href="/reserve">/reserve</FaqA> requires an on-chain Zcash transaction for each
            reserved name. That raises the cost of spam and gives a stronger signal that each spot is
            a real participant.
          </>
        ),
      },
      {
        id: "reserve-what-it-gives",
        question: "What does a reservation actually give me?",
        answer: `A reservation does not purchase the name today. It gives you the option to purchase that name during Early Access before broader registration opens. If your reservation is confirmed, your Early Access code will be sent to your email when Early Access begins.`,
      },
      {
        id: "reserve-when-early-access",
        question: "When does Early Access begin, and when do reservations close?",
        surfaces: ["waitlist-view"],
        answer: (
          <>
            Early Access is currently scheduled to begin on {WAITLIST_VIEW_EARLY_ACCESS_LABEL}.
            Reservations close when that period begins. Access codes are sent in queue order to
            participants who completed a reservation, adjusted by referrals who also reserved. The
            public countdown on <FaqA href="/waitlist/view">/waitlist/view</FaqA> uses this same
            schedule ({WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL}).
          </>
        ),
      },
      {
        id: "reserve-how-to-pay",
        question: "How do I reserve my place?",
        surfaces: ["waitlist-view"],
        answer: (
          <>
            Open the reservation link emailed to you, or recover it on{" "}
            <FaqA href="/reserve">/reserve</FaqA>. Send the Zcash transaction shown on the page —
            address, memo, and at least the minimum amount. Do not edit the memo. After the
            qualifying transaction is mined and matched to your waitlist entry, the reserved state
            appears on your tokenized reserve page and on{" "}
            <FaqA href="/waitlist/view">/waitlist/view</FaqA>.
          </>
        ),
      },
      {
        id: "reserve-payment-must-match",
        question: "What must match exactly when I send payment?",
        answer:
          "Do not change the address or memo. Send at least the minimum amount shown on the reservation page. Payments below the required amount will not be accepted, and changing the memo can prevent the payment from being attributed to your reservation.",
      },
      {
        id: "reserve-marked-complete",
        question: "How is a reservation marked complete?",
        answer:
          "Once a qualifying transaction is mined and matched to your waitlist UUID, the reservation is recorded on your waitlist entry. The reserved state then appears on your tokenized /reserve page and in the public waitlist view.",
      },
      {
        id: "reserve-resend-link",
        question: "How do I request another reservation link?",
        answer: (
          <>
            Use <FaqA href="/reserve">/reserve</FaqA> and enter the email address you used on the
            waitlist. If that address is on the waitlist and has not received a reservation email in
            the last 48 hours, a fresh reservation link will be sent.
          </>
        ),
      },
      {
        id: "reserve-resend-privacy",
        question: "Will the resend form tell me whether my email is on the waitlist?",
        answer:
          "No. The public response stays neutral so the form does not reveal whether an address exists in the database. If your reservation is already complete, the tokenized link will still show that completed state after you follow it.",
      },
      {
        id: "reserve-invalid-link",
        question: "What if my reservation link is invalid?",
        answer: (
          <>
            Open the most recent campaign email and use that link. If it still fails, request a fresh
            email from <FaqA href="/reserve">/reserve</FaqA>. Do not edit the token in the URL.
          </>
        ),
      },
      {
        id: "reserve-not-a-claim",
        question: "Does a reservation purchase or claim the name?",
        answer: (
          <>
            No. Reservation is a queue commitment. Claiming is a separate paid{" "}
            <FaqA href="/faq#name-actions">CLAIM</FaqA> during Early Access (or later open
            registration). A reserved name can still be protected and require an unlock code.
          </>
        ),
      },
    ],
  },
  {
    id: "leaders",
    href: "/leaders",
    title: "Leaders",
    blurb: "Referral rankings, adjusted lines, rewards, and the referral dashboard.",
    items: [
      {
        id: "leaders-what-it-ranks",
        question: "What does the leaderboard rank?",
        answer: (
          <>
            <FaqA href="/leaders">/leaders</FaqA> ranks waitlist participants by referral-adjusted
            progress and related growth. It is a public view of who is moving up the Early Access
            queue, not a list of name owners.
          </>
        ),
      },
      {
        id: "leaders-hash-adj-rank",
        question: "What is the difference between #, Adj#, and Rank?",
        answer:
          "# is your original waitlist line number. Adj# is your adjusted line number after referral-based jumps are applied. Rank compares your adjusted line number against everyone else waiting for the same name and is shown as a value like 1 of 4.",
      },
      {
        id: "leaders-how-referrals-improve",
        question: "How do referrals improve my position?",
        surfaces: ["waitlist-view"],
        answer: (
          <>
            Only completed reservation referrals count. Your adjusted waitlist line improves by 1 for{" "}
            {reservedReferralSpotPhrase("direct")} and by 1 for {reservedReferralSpotPhrase("indirect")}.
            Partial thresholds do not count until the full threshold is reached. Sharing a link alone
            does not change Position.
          </>
        ),
      },
      {
        id: "leaders-when-reward",
        question: "When do I earn a referral reward?",
        answer: (
          <>
            A referral qualifies for a reward after the invited person joins through your link and
            claims their name. Position improves when they reserve; the reward pays when they claim.
            Those are different events. See <FaqA href="/leaders/terms">terms</FaqA>.
          </>
        ),
      },
      {
        id: "leaders-reward-amount",
        question: "How much is the referral reward?",
        answer: (
          <>
            During Early Access, direct referral rewards may earn up to 0.05 ZEC for each referred
            signup that completes a qualifying claim. That 0.05 ZEC figure is 1/5 of the lowest name
            claim price (0.25 ZEC for 7+ character names) and may vary with the claim price at
            purchase time. Indirect rewards may apply when referred users invite others.
          </>
        ),
      },
      {
        id: "leaders-where-paid",
        question: "Where are rewards paid?",
        answer:
          "Payouts are delivered to the referrer's Zcash name after that name has been reserved. Dashboard estimates are informational until reviewed and paid.",
      },
      {
        id: "leaders-dashboard",
        question: "What is the referral dashboard?",
        answer: (
          <>
            <FaqA href="/leaders/ref">/leaders/ref</FaqA> is your private referral dashboard. Enter
            your referral code to see attributed signups, reservation progress, and estimated rewards.
            You can also open a code directly at <code>/leaders/ref/yourcode</code>.
          </>
        ),
      },
      {
        id: "leaders-terms",
        question: "What do the leaderboard terms cover?",
        answer: (
          <>
            <FaqA href="/leaders/terms">/leaders/terms</FaqA> is the policy for eligibility,
            referrals, reward basis, Early Access order, name availability, fair use, and payouts.
            FAQ answers follow those terms.
          </>
        ),
      },
      {
        id: "leaders-review",
        question: "Can my rewards or position be adjusted?",
        answer:
          "Yes. Rewards and access may be reviewed and adjusted for abuse, fraud, duplicate accounts, self-referrals, payment reversals, or other invalid activity. Invites or claims may be dismissed when they do not meet one-person-one-early-access-claim intent.",
      },
    ],
  },
  {
    id: "sharekit",
    href: "/sharekit",
    title: "Share Kit",
    blurb: "Copy prepared posts and attach your waitlist referral link.",
    items: [
      {
        id: "sharekit-what",
        question: "What is the Share Kit?",
        answer: (
          <>
            <FaqA href="/sharekit">/sharekit</FaqA> is a set of ready-to-copy posts for sharing Zcash
            Names. Drafts are grouped by topic so you can post without writing from scratch.
          </>
        ),
      },
      {
        id: "sharekit-ref",
        question: "How do I personalize drafts with my referral link?",
        answer: (
          <>
            Open <FaqA href="/sharekit">/sharekit?ref=yourcode</FaqA>, or enter your code on the page.
            Drafts then include your waitlist referral link. If the code is not found, the page still
            loads the stock drafts and warns you.
          </>
        ),
      },
      {
        id: "sharekit-does-not-move-position",
        question: "Does sharing a draft improve my position immediately?",
        answer:
          "No. Sharing is how people find your link. Your adjusted line only improves after referred people join and complete their own reservations.",
      },
    ],
  },
  {
    id: "protected",
    href: "/protected",
    title: "Protected names",
    blurb: "Held names, unlock codes, suggestions, access requests, and disputes.",
    items: [
      {
        id: "protected-what",
        question: "What is a protected name?",
        answer: (
          <>
            A protected name is held so brands, projects, community handles, and abuse-prone strings
            cannot be sniped at launch. Browse the public list at{" "}
            <FaqA href="/protected">/protected</FaqA>. Claiming a gated name requires an unlock code
            plus the normal paid claim.
          </>
        ),
      },
      {
        id: "protected-vs-reserved",
        question: "How is protected different from reserved?",
        answer:
          "A waitlist reservation is a queue / Early Access hold for a name you want to claim later. It is not ownership. A protected name is an operator claim gate: the name shows as Protected and needs an unlock code before the signing service will issue a CLAIM. A name can be protected regardless of waitlist status.",
      },
      {
        id: "protected-statuses",
        question: "What statuses appear on the protected list?",
        answer: (
          <>
            <ul>
              <li>
                <strong>Under review</strong> — suggested or submitted; not yet approved. This does not
                by itself block ordinary claiming.
              </li>
              <li>
                <strong>Protected</strong> — actively held. Unlock code required if not redeemed and
                not expired.
              </li>
              <li>
                <strong>Rejected</strong> — not held for claim, including protection that expired
                unclaimed.
              </li>
              <li>
                <strong>Redeemed</strong> — claimed on-chain; the unlock gate lifts.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "protected-parents-variants",
        question: "What are parents and variants?",
        answer: (
          <>
            A parent is the canonical name. A variant points at that parent — support handles,
            misspellings, or lookalikes. Suggest the parent first if it is missing, then attach
            variants. Searching <FaqA href="/protected">/protected</FaqA> for either side surfaces the
            family.
          </>
        ),
      },
      {
        id: "protected-flags",
        question: "What do the ENS and Zcash.me flags mean?",
        answer:
          "They mark priority-claim context for operators and filters. They do not replace the unlock-code gate. Gating only cares about protected + unredeemed + not past expiry.",
      },
      {
        id: "protected-unlock-codes",
        question: "How do unlock codes work?",
        answer: (
          <>
            An unlock code is a 12-character fingerprint in the form <code>XXXX-XXXX-XXXX</code>. You
            do not invent it; maintainers issue it after verifying you are the right party. It is a
            gate on the web signing service, not a magic on-chain token. The claim still needs a
            normal paid CLAIM memo.
          </>
        ),
      },
      {
        id: "protected-suggest",
        question: "How do I suggest a name for protection?",
        answer: (
          <>
            Use <FaqA href="/protected/suggest">/protected/suggest</FaqA>. Enter the name, choose
            parent or variant, pick a category, explain why, and attach evidence. New suggestions
            typically enter Under review. If the name is later accepted, suggestion rewards may apply
            as described on that form.
          </>
        ),
      },
      {
        id: "protected-request",
        question: "How do I request access to a protected name?",
        answer: (
          <>
            Use <FaqA href="/protected/request">/protected/request</FaqA> if you represent the person,
            organization, or identity associated with the name. Approval does not waive the purchase
            price. Maintainers still issue the unlock code out of band.
          </>
        ),
      },
      {
        id: "protected-dispute",
        question: "How do I dispute a protected or rejected name?",
        answer: (
          <>
            Use <FaqA href="/protected/dispute">/protected/dispute</FaqA> when the name is eligible
            (non-redeemed protected or rejected rows). Filing a dispute does not unlock the claim
            gate by itself.
          </>
        ),
      },
      {
        id: "protected-price",
        question: "Does approval waive the purchase price?",
        answer:
          "No. Getting access or an unlock code means you may claim the name. You still pay the normal claim price.",
      },
    ],
  },
  {
    id: "explorer",
    href: "/explorer",
    title: "Explorer",
    blurb: "Browse registered names, marketplace listings, and on-chain name events.",
    items: [
      {
        id: "explorer-what",
        question: "What can I do on the Explorer?",
        answer: (
          <>
            <FaqA href="/explorer">/explorer</FaqA> is the public registry browser. Search names,
            switch networks, open a name for its current status, and read the event history that
            produced that state.
          </>
        ),
      },
      {
        id: "explorer-tabs",
        question: "What do the Explorer tabs show?",
        answer: (
          <>
            <strong>All</strong> is the event stream. <strong>Registered</strong> is current
            registrations. <strong>For Sale</strong> is active listings. Other tabs filter by action
            type such as CLAIM, UPDATE, LIST, DELIST, BUY, and RELEASE.
          </>
        ),
      },
      {
        id: "explorer-statuses",
        question: "What do name statuses mean?",
        answer: (
          <>
            <ul>
              <li>
                <strong>Available</strong> — nobody owns it; you can{" "}
                <FaqA href="/faq#name-actions">claim</FaqA> it.
              </li>
              <li>
                <strong>For Sale</strong> — owned and listed; you can buy it.
              </li>
              <li>
                <strong>Registered</strong> — taken and not currently listed.
              </li>
              <li>
                <strong>Protected</strong> — held; unlock code required.
              </li>
              <li>
                <strong>Blocked</strong> — permanently unavailable.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "explorer-history",
        question: "How do I open a name's history?",
        answer: (
          <>
            Search or tap a row on <FaqA href="/explorer">/explorer</FaqA>. The detail pane shows the
            current owner/status and the events (CLAIM, UPDATE, LIST, and so on) that led there.
          </>
        ),
      },
    ],
  },
  {
    id: "name-actions",
    href: "/docs/use/claiming",
    pill: "/claim",
    title: "Name actions",
    blurb: "Claim, buy, list, update, delist, and release through ZIP-321 payments.",
    items: [
      {
        id: "name-actions-claim",
        question: "How do I claim an available name?",
        answer: (
          <>
            Search the name, open the claim flow, enter the unified address it should point to, and
            send the ZIP-321 payment with the signed CLAIM memo. The first confirmed transaction wins.
            Details: <FaqA href="/docs/use/claiming">claiming a name</FaqA>.
          </>
        ),
      },
      {
        id: "name-actions-wallet",
        question: "What wallet do I need to claim or manage a name?",
        answer: (
          <>
            The wallet must parse ZIP-321 payment URIs, send Orchard shielded transactions, and
            preserve memo bytes exactly. Name resolution in the recipient field is a separate wallet
            feature and is not required to claim. See{" "}
            <FaqA href="/docs/use/wallets">wallet compatibility</FaqA>.
          </>
        ),
      },
      {
        id: "name-actions-race",
        question: "What if two people claim the same name?",
        answer:
          "Claims are first-come, first-served. The first confirmed valid transaction wins. The other payment does not register the name.",
      },
      {
        id: "name-actions-buy",
        question: "How do I buy a name that is listed for sale?",
        answer: (
          <>
            Buying is two steps: send the signed BUY claim (this locks the listing for about two
            hours), then send the listing price as a transparent payment to the seller&rsquo;s{" "}
            <code>pay_taddr</code>. Both must complete. See{" "}
            <FaqA href="/docs/use/buying-and-selling">buying and selling</FaqA>.
          </>
        ),
      },
      {
        id: "name-actions-list",
        question: "How do I list a name for sale?",
        answer: (
          <>
            Open the list flow for a name you control, prove control (usually via OTP), set a price,
            and provide a transparent address to receive payment. Listing includes a 0.01 ZEC
            non-refundable commission.
          </>
        ),
      },
      {
        id: "name-actions-update",
        question: "How do I update the address a name points to?",
        answer: (
          <>
            Use the <FaqA href="/update">update</FaqA> action for a name you control. The wallet still
            sends a signed memo; the nonce must advance. This changes resolution without transferring
            ownership.
          </>
        ),
      },
      {
        id: "name-actions-release",
        question: "What happens if I release a name?",
        answer:
          "RELEASE permanently deletes the registration. The name returns to Available and looks the same as a name that was never claimed. This cannot be undone.",
      },
      {
        id: "name-actions-not-showing",
        question: "Why hasn't my name shown up yet?",
        answer: (
          <>
            Common causes: the indexer has not caught up, someone else claimed first, or the wallet
            altered the memo bytes. Search the name on <FaqA href="/explorer">/explorer</FaqA> and
            look for the CLAIM event. If none of those fit, bring the txid to support.
          </>
        ),
      },
      {
        id: "name-actions-beta-reset",
        question: "Will a name I claimed in beta stay mine?",
        answer: (
          <>
            No. Names created during beta are temporary and are expected to be reset before Early
            Access. Beta participation does not preserve ownership into launch. See{" "}
            <FaqA href="/faq#beta">beta questions</FaqA>.
          </>
        ),
      },
    ],
  },
  {
    id: "beta",
    href: "/beta",
    title: "Beta",
    blurb: "Apply, test supported wallets, understand beta pricing, and find wallet FAQs.",
    items: [
      {
        id: "beta-how-to-join",
        question: "How do I join the beta?",
        surfaces: ["home"],
        homeGroup: "Community, builders & team",
        answer: (
          <>
            Read the current brief at <FaqA href="/beta">/beta</FaqA>, review{" "}
            <FaqA href="/beta/wallets">supported wallets</FaqA> and{" "}
            <FaqA href="/beta/instructions">instructions</FaqA>, then apply at{" "}
            <FaqA href="/beta/apply">/beta/apply</FaqA>. Applying with a specific wallet path (for
            example <FaqA href="/beta/apply/edge">/beta/apply/edge</FaqA>) keeps wallet preference and
            feedback attributed correctly.
          </>
        ),
      },
      {
        id: "beta-wallets",
        question: "Which wallets are part of the beta?",
        answer: (
          <>
            The current set is listed on <FaqA href="/beta/wallets">/beta/wallets</FaqA>. Each brand
            page has a generated FAQ at <code>/beta/{"{wallet}"}/faq</code> — for example{" "}
            <FaqA href="/beta/edge/faq">Edge</FaqA>, <FaqA href="/beta/cake/faq">Cake</FaqA>,{" "}
            <FaqA href="/beta/unstoppable/faq">Unstoppable</FaqA>, and{" "}
            <FaqA href="/beta/zingo/faq">Zingo</FaqA>.
          </>
        ),
      },
      {
        id: "beta-pricing",
        question: "Is beta pricing discounted?",
        answer: (
          <>
            Yes. Live mainnet beta claim prices are 1/100th of the intended production tiers. Claim
            and listing fees may be refundable during testing if requested through the feedback panel.
            Secondary-market purchases between users are real trades and are not generally refundable
            by the Zcash Names team. See <FaqA href="/docs/learn/pricing">pricing</FaqA>.
          </>
        ),
      },
      {
        id: "beta-names-revoked",
        question: "Will beta names be revoked later?",
        answer:
          "Yes. Names created during beta are temporary and are expected to be reset before Early Access begins. Testing does not preserve ownership of a specific name into Early Access or public launch.",
      },
      {
        id: "beta-refund",
        question: "How do beta refunds work?",
        answer: (
          <>
            Use <FaqA href="/beta/refund">/beta/refund</FaqA> and the in-product feedback panel.
            Refunds are aimed at protocol claim and listing fees from testing, not at marketplace
            trades between users.
          </>
        ),
      },
      {
        id: "beta-bounties",
        question: "Are there bug bounties?",
        answer: (
          <>
            <s>
              Testers who report confirmed, reproducible issues through the feedback panel may
              qualify. Current targets are 0.05 ZEC for minor confirmed bugs and 0.5 ZEC for
              critical confirmed bugs, typically to the first valid report.
            </s>{" "}
            <strong>Update:</strong> All beta rewards have been claimed. We are still accepting
            feedback.
          </>
        ),
      },
    ],
  },
  {
    id: "docs",
    href: "/docs",
    title: "Docs",
    blurb: "Learn the protocol, price names, integrate wallets, and run an indexer.",
    items: [
      {
        id: "docs-build",
        question: "How do I build on Zcash Names?",
        surfaces: ["home"],
        homeGroup: "Community, builders & team",
        answer: (
          <>
            Start with the <FaqA href="/docs">Developer&rsquo;s Guide</FaqA>. From there:{" "}
            <FaqA href="/docs/integrate">integrate</FaqA>, <FaqA href="/docs/sdk">SDKs</FaqA>,{" "}
            <FaqA href="/docs/protocol/overview">protocol</FaqA>, and{" "}
            <FaqA href="/docs/indexer/running">indexer &amp; RPC</FaqA>.
          </>
        ),
      },
      {
        id: "docs-pricing",
        question: "How much do names cost?",
        answer: (
          <>
            Pricing is tiered by name length. Shorter names cost more. During mainnet beta, live
            claim prices are 1/100th of intended production tiers (for example 0.0025 ZEC vs 0.25 ZEC
            for 7+ characters). Marketplace purchases use the seller&rsquo;s listing price, not the
            protocol claim cost. Full tables: <FaqA href="/docs/learn/pricing">pricing</FaqA>.
          </>
        ),
      },
      {
        id: "docs-privacy",
        question: "How does privacy work at the protocol level?",
        answer: (
          <>
            Registrations live in shielded memos. Ordinary chain observers cannot read the
            name/address pair from the raw transaction. After registration, the registry is
            queryable: anyone who knows the name can resolve the unified address. Balances and
            payment history stay shielded. Read <FaqA href="/docs/learn/privacy">privacy</FaqA> and{" "}
            <FaqA href="/docs/learn/trust-model">trust model</FaqA>.
          </>
        ),
      },
      {
        id: "docs-indexer",
        question: "How do I run or join as an indexer?",
        answer: (
          <>
            Protocol operators start at <FaqA href="/docs/indexer/running">running an indexer</FaqA>.
            If you want to participate in the indexer program, see{" "}
            <FaqA href="/indexers">/indexers</FaqA>.
          </>
        ),
      },
      {
        id: "docs-partner",
        question: "How do I partner with Zcash Names?",
        surfaces: ["home"],
        homeGroup: "Community, builders & team",
        answer: (
          <>
            We collaborate with wallets, platforms, and products.{" "}
            <FaqA href="https://cal.com/zcash">Book a meeting</FaqA> or{" "}
            <FaqA href="mailto:partner@zcash.me">email us</FaqA> to start.
          </>
        ),
      },
      {
        id: "docs-where-to-start",
        question: "Where should I start in the docs?",
        answer: (
          <>
            Readers: <FaqA href="/docs/learn/what-is-zns">What is Zcash Names?</FaqA> then{" "}
            <FaqA href="/docs/learn/how-it-works">how it works</FaqA>. Users ready to register:{" "}
            <FaqA href="/docs/use/claiming">claiming</FaqA>. Builders:{" "}
            <FaqA href="/docs/integrate">integrate</FaqA>.
          </>
        ),
      },
    ],
  },
  {
    id: "community",
    href: "/community",
    title: "Community & support",
    blurb: "Channels, roadmap, careers, brand assets, and how to get help.",
    items: [
      {
        id: "community-help",
        question: "Where do I get help?",
        answer: (
          <>
            Email <FaqA href="mailto:support@zcashnames.com">support@zcashnames.com</FaqA> for
            reservation emails, payment attribution, or waitlist status. Community chat:{" "}
            <FaqA href="https://discord.gg/z2H23QgAGf">Discord</FaqA> and{" "}
            <FaqA href="https://t.me/zcashnames">Telegram</FaqA>.
          </>
        ),
      },
      {
        id: "community-page",
        question: "What is the community page?",
        answer: (
          <>
            <FaqA href="/community">/community</FaqA> collects public community surfaces — chats,
            socials, and related links — in one place.
          </>
        ),
      },
      {
        id: "community-roadmap",
        question: "Where is the roadmap?",
        answer: (
          <>
            <FaqA href="/roadmap">/roadmap</FaqA> shows completed, current, and planned phases
            including beta, Early Access, and open registration.
          </>
        ),
      },
      {
        id: "community-careers",
        question: "Are you hiring?",
        answer: (
          <>
            Open roles are on <FaqA href="/careers">/careers</FaqA>. Each listing has its own apply
            flow.
          </>
        ),
      },
      {
        id: "community-brandkit",
        question: "Can I use the brand assets?",
        answer: (
          <>
            Yes. Download logos and lockups from <FaqA href="/brandkit">/brandkit</FaqA> and follow
            the usage notes on that page.
          </>
        ),
      },
      {
        id: "community-blogs",
        question: "Where are launch notes and product updates?",
        answer: (
          <>
            <FaqA href="/blogs">/blogs</FaqA> has launch explainers (Early Access, protected names,
            pricing) and product updates. The Early Access article is{" "}
            <FaqA href="/blogs/users/early-access">here</FaqA>.
          </>
        ),
      },
    ],
  },
];
