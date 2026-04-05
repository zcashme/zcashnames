import ExplorerShell from "./ExplorerShell";

export const metadata = {
  title: "Explorer — ZcashNames",
  description: "Browse registered .zcash names, event history, and marketplace listings.",
};

export default function ExplorerPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      <ExplorerShell />
    </main>
  );
}
