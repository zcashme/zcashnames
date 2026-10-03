"use client";

import { useCopy } from "@/components/hooks/useCopy";

const REGISTRY_UFVK = [
  "uviewtest1akm8qc7xya8227z4crzpqx5jj23esvf9l2kc5ddt7zupzg2s785gu70rlv42ge228wwu323el8h8qm4kucus4fl6py0eq",
  "7etx8dkhe8wedjz390gvxthrylxrhp22zvzq65vcs2mg3s8krpssevaqzwed4murqtghp4x9jj84kkp5txtcrvcauvx36kae9pmrwjuvs7k29f8glqkf53yzhsp",
  "ralwrej7g0t0nrn86ryqs9rcc3k797vpk7jj33suxefjl4sk2va2furxkh3sude0v7ve2htrqgf03lw0yyrh5lnt4vx97787rj9l0gnprg5r2fqlthnx3f6kcv6",
  "p96taz3wce8krzl8uw3aeukhleuvzwvhp7v3y6mvyw23g9ych5qhda6gupc8r06c5c8hf4mplrt40m5mvywmdy0xvs49katqhj7amr26pdzfrj0up69t5ksjuxv",
  "6wf2tgw6lxevpprtuqj9en4w3sx2w3jv5j2vrjsuf9",
].join("");

const TREASURY_UA =
  "utest1nflk83kvwzl38ndea0zcy5k5n5t8up3p09upwshy5uzwnrct9ts6kqfstk2pg5fjhfpuhetywpn5rkkuzhyfxf4w2eq056vrgcqmx5g0dtcm2sr8tjapmcd46l088hd28hnkr69cjszcfvlhuynglp90vk7vm68mqjx0ye5hh5kyvz0e";

const valueStyle = {
  borderColor: "var(--faq-border)",
  background: "var(--verify-panel-fill)",
};

function PublicValue({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="min-w-0 rounded-xl border p-4" style={valueStyle}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>{label}</p>
        <button
          type="button"
          onClick={() => void copy(value)}
          className="shrink-0 text-xs font-semibold underline underline-offset-4"
          style={{ color: "var(--color-accent-interactive)" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="mt-3 block max-h-40 overflow-y-auto break-all font-mono text-xs leading-5" style={{ color: "var(--fg-body)" }}>
        {value}
      </code>
    </div>
  );
}

export default function RegistryPublicDetails() {
  return (
    <section className="mt-4 rounded-2xl border px-5 py-6 sm:px-6 sm:py-8" style={valueStyle}>
      <h2 className="text-2xl font-black tracking-[-0.04em]" style={{ color: "var(--fg-heading)" }}>
        Public registry details
      </h2>
      <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
        Testnet registry viewing key and treasury address.
      </p>
      <p className="mt-3 text-sm">
        <a href="/explorer?env=testnet" className="font-semibold underline underline-offset-4" style={{ color: "var(--color-accent-interactive)" }}>
          Open the testnet explorer ↗
        </a>
      </p>
      <div className="mt-4 grid gap-4">
        <PublicValue label="Registry viewing key (UFVK)" value={REGISTRY_UFVK} />
        <PublicValue label="Treasury Unified Address" value={TREASURY_UA} />
      </div>
    </section>
  );
}
