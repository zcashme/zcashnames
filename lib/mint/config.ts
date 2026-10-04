//
// Per-network Mint configuration — hardcoded public constants.
//
// Everything here is public on-chain data: the treasury Unified Address is
// the destination for user Request memos, and the registry UFVK is the
// published viewing key used to observe Name Notes. Nothing is secret.
//
// This file currently serves the testnet explorer (registry UFVK
// verification). The mainnet entry exists so call sites can branch
// uniformly; mainnet is not online and its values are intentionally null
// until the mainnet mint deployment exists.
//
// Note: TEE attestation-report verification is deliberately not included
// yet; it arrives with the write-flow integration.
//

export interface MintConfig {
  enabled: boolean;
  /** Whether plain (access-code-free) claims are allowed on this network. */
  allowOpenClaims: boolean;
  /** Treasury Unified Address — destination of user Request / Respond memos. */
  treasuryUa: string | null;
  /** Registry full viewing key — must match the resolver's reported viewing key. */
  registryUfvk: string | null;
}

export const TESTNET_MINT: MintConfig = {
  enabled: true,
  allowOpenClaims: true,
  treasuryUa:
    "utest1nflk83kvwzl38ndea0zcy5k5n5t8up3p09upwshy5uzwnrct9ts6kqfstk2pg5fjhfpuhetywpn5rkkuzhyfxf4w2eq056vrgcqmx5g0dtcm2sr8tjapmcd46l088hd28hnkr69cjszcfvlhuynglp90vk7vm68mqjx0ye5hh5kyvz0e",
  registryUfvk:
    "uviewtest1akm8qc7xya8227z4crzpqx5jj23esvf9l2kc5ddt7zupzg2s785gu70rlv42ge228wwu323el8h8qm4kucus4fl6py0eq7etx8dkhe8wedjz390gvxthrylxrhp22zvzq65vcs2mg3s8krpssevaqzwed4murqtghp4x9jj84kkp5txtcrvcauvx36kae9pmrwjuvs7k29f8glqkf53yzhspralwrej7g0t0nrn86ryqs9rcc3k797vpk7jj33suxefjl4sk2va2furxkh3sude0v7ve2htrqgf03lw0yyrh5lnt4vx97787rj9l0gnprg5r2fqlthnx3f6kcv6p96taz3wce8krzl8uw3aeukhleuvzwvhp7v3y6mvyw23g9ych5qhda6gupc8r06c5c8hf4mplrt40m5mvywmdy0xvs49katqhj7amr26pdzfrj0up69t5ksjuxv6wf2tgw6lxevpprtuqj9en4w3sx2w3jv5j2vrjsuf9",
};

// Offline until the mainnet Mint deployment exists.
export const MAINNET_MINT: MintConfig = {
  enabled: false,
  allowOpenClaims: false,
  treasuryUa: null,
  registryUfvk: null,
};

export function getMintConfig(network: "mainnet" | "testnet"): MintConfig {
  return network === "mainnet" ? MAINNET_MINT : TESTNET_MINT;
}

/** True when the Mint for this network is live and may receive Requests. */
export function isMintNetworkEnabled(network: "mainnet" | "testnet"): boolean {
  return getMintConfig(network).enabled;
}
