import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internal Link Preview QA | ZcashNames",
  description: "Temporary page to review social preview cards before release.",
  robots: {
    index: false,
    follow: false,
  },
};

type PreviewItem = {
  label: string;
  url: string;
  image: string;
  title: string;
  description: string;
};

const previews: PreviewItem[] = [
  {
    label: "Home",
    url: "https://www.zcashnames.com/",
    image: "/og/home.png",
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
  },
  {
    label: "Referral Link",
    url: "https://www.zcashnames.com/?ref=szFgXfWk",
    image: "/og/home.png?inviter=Jane%20Doe",
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
  },
  {
    label: "Leaders",
    url: "https://www.zcashnames.com/leaders",
    image: "/og/leaders.png",
    title: "Leaderboard | ZcashNames",
    description: "Global referral rankings, growth, and rewards progress.",
  },
  {
    label: "Terms",
    url: "https://www.zcashnames.com/leaders/terms",
    image: "/og/leaders-terms.png",
    title: "Leaderboard Terms | ZcashNames",
    description: "Referral rewards and early access terms.",
  },
  {
    label: "Explorer",
    url: "https://www.zcashnames.com/explorer",
    image: "/og/explorer.png",
    title: "Name Explorer | ZcashNames",
    description: "Browse registered names, event history, and marketplace listings.",
  },
  {
    label: "ShareKit",
    url: "https://www.zcashnames.com/sharekit",
    image: "/og/sharekit.png",
    title: "Share Kit | ZcashNames",
    description: "Copy and share prepared draft posts with your waitlist referral link.",
  },
  {
    label: "Roadmap",
    url: "https://www.zcashnames.com/roadmap",
    image: "/og/roadmap.png",
    title: "Roadmap | ZcashNames",
    description: "Calendar roadmap for the next ZcashNames product phases and tasks.",
  },
  {
    label: "Dashboard",
    url: "https://www.zcashnames.com/leaders/ref",
    image: "/og/leaders-ref.png",
    title: "Referral Dashboard | ZcashNames",
    description: "Your referral dashboard for rewards progress.",
  },
  {
    label: "Beta Invitation",
    url: "https://www.zcashnames.com/beta/apply",
    image: "/og/beta.png",
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
  },
];

export default function LinkPreviewsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <section className="rounded-2xl border p-5 sm:p-6" style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}>
        <h1 className="text-3xl font-bold tracking-tight text-fg-heading">Link Preview QA</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Temporary internal page to validate OG/Twitter previews before release. Each card below renders the real `/og/*.png` endpoint.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {previews.map((item) => (
            <article key={item.label} className="rounded-xl border p-3" style={{ borderColor: "var(--leaders-card-border)", background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))" }}>
              <img
                src={`${item.image}${item.image.includes("?") ? "&" : "?"}v=preview`}
                alt={`${item.label} preview`}
                className="w-full rounded-lg border"
                style={{ borderColor: "var(--leaders-card-border)", aspectRatio: "1200 / 630", objectFit: "cover" }}
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">{item.label}</p>
              <p className="mt-1 text-base font-semibold text-fg-heading">{item.title}</p>
              <p className="mt-1 text-sm text-fg-muted">{item.description}</p>
              <p className="mt-2 break-all text-xs text-fg-muted">{item.url}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
