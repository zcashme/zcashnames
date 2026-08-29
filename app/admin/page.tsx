import Link from "next/link";

export const dynamic = "force-dynamic";

const sections = [
  {
    title: "Beta V2",
    links: [
      {
        href: "/admin/beta-v2/drafts",
        label: "Invite Drafts",
        description: "Pending v2 applicants waiting for invite drafting or sending.",
      },
      {
        href: "/admin/beta-v2/sent",
        label: "Sent Invites",
        description: "Applicants already sent beta invites.",
      },
    ],
  },
  {
    title: "Beta V1",
    links: [
      {
        href: "/admin/beta/drafts",
        label: "Invite Drafts",
        description: "Pending v1 invite drafts and scheduling flow.",
      },
      {
        href: "/admin/beta/sent",
        label: "Sent Invites",
        description: "Previously sent v1 beta invites.",
      },
      {
        href: "/admin/beta/report",
        label: "Feedback Report",
        description: "Aggregated beta feedback, ratings, wallet coverage, and git changes.",
      },
    ],
  },
  {
    title: "Campaigns",
    links: [
      {
        href: "/admin/campaigns/drafts",
        label: "Draft Campaigns",
        description: "Draft and scheduled campaigns with audience targeting.",
      },
      {
        href: "/admin/campaigns/sent",
        label: "Sent Campaigns",
        description: "Delivery history for completed campaigns.",
      },
    ],
  },
  {
    title: "Protected Names",
    links: [
      {
        href: "/admin/protected-names",
        label: "Review Queue",
        description:
          "Approve or reject suggestions, manage evidence, redeem names, and review disputes.",
      },
    ],
  },
] as const;

export default function AdminHomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Authenticated Access</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-100">Admin Tools</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
          Private operational views for beta invites, beta feedback reporting, campaigns,
          and protected-name review. These routes are available on localhost and on deployed
          hosts protected by shared admin credentials.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
              {section.title}
            </h2>
            <div className="mt-4 grid gap-3">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition-colors hover:border-zinc-600"
                >
                  <div className="text-sm font-semibold text-zinc-100">{link.label}</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-400">{link.description}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
