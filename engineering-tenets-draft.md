The Engineering Tenets of ZNS

1. **The Chain Is The Database.** No external indexer, no sidechain, no Layer 2. Every name claim lives as a signed memo inside a standard Zcash shielded transaction. The Zcash blockchain is the source of truth; everything else is a cache.

2. **First Valid Signature Wins.** Consensus requires no voting, no governance, no human intervention. The first Ed25519 signature that validates against a unique name claims permanent ownership. All subsequent claims are ignored by protocol-compliant indexers.

3. **No Admin Keys, No Upgrades, No Exceptions.** The protocol is frozen at block 2800000. No contract can be paused, no registry can be migrated, no foundation can override a claim. If a name was validly claimed, it remains claimed forever.

4. **Keys Never Leave The Client.** Key generation, signing, and payload assembly happen entirely in browser memory. The ZNS web interface sees no private keys; the indexer sees only public keys and signatures. Compromise of any server cannot seize names.

5. **Rent Is Protocol Impossible.** The memo format contains no payment fields, no expiry timestamps, no grace periods. There is no mechanism in ZNS to charge ongoing fees or revoke names for non-payment because the blockchain rejects such memos as malformed.

6. **Resolution Is Trivial To Verify.** Given a name and a txid, any client can reconstruct the claimed payload, recompute the Ed25519 signature verification, and confirm the name resolves to the correct shielded address. No trust in zcash.me required.

7. **The Indexer Is Optional Infrastructure.** The reference indexer (`~/ZcashMe/ZNS`) is open source and stateless. Anyone can run it, fork it, or ignore it entirely and parse the chain directly with `zcash-cli`. The protocol does not depend on any single indexing service.

8. **Names Are Permanent Unless Released.** A `RELEASE` action with a valid signature and incremented nonce burns the name forever. There is no undo, no dispute process, no reverse transaction. The only way to lose a name is to cryptographically prove you want to.

9. **Anti-Replay Is Nonce-Enforced.** Every `UPDATE`, `LIST`, `DELIST`, or `RELEASE` requires a monotonically increasing nonce in the payload. Indexers reject stale nonces, preventing replay attacks without requiring blockchain state beyond the name record itself.

10. **The Memo Format Is Maximalist Simplicity.** `ZNS:{ACTION}:{name}:{address}:{nonce?}:{sig}:{pubkey}` — 7 fields, colon-delimited, no JSON, no ABI encoding, no version bytes. A human can parse it with `split(':')`. Complexity is the enemy of permanence.

11. **Public-Key Cryptography Is The Only Authority.** No KYC, no dispute resolution, no terms of service. The only permission to modify a name is possession of the corresponding Ed25519 private key. Lose the key, lose the name. No recovery. No support tickets.

12. **Shielded-Only Resolution.** The protocol only allows `zs1...` and `zc...` addresses in name claims. Transparent addresses are rejected at the indexer level. ZNS exists to make shielded addresses usable, not to convenience surveillance.

13. **Economic Spam Resistance Through Fees, Not Whitelists.** Anyone can claim any name by paying the Zcash network fee. No auctions, no premium names, no trademark disputes. Economic cost is the only gate; the market decides what names are worth.

14. **Interoperability Through Brute Force Transparency.** The entire protocol is 120 lines of Rust regex parsing and Ed25519 verification. No complex SDK required. Any wallet can implement resolution by copying the logic. No API keys, no partnership agreements.

15. **The Ceremony Is Complete At Claim Time.** A name is not reserved, not pending, not in auction. The moment your signed memo is mined into a block, the name is yours. There is no finalization period, no dispute window, no delayed state transition.

---

**Implementation is specification. Specification is implementation.**

The indexer source code: https://github.com/zcashme/ZNS
The memo parser: `~/ZcashMe/ZcashName/lib/zns/payload.ts`
The keypair tool: `~/ZcashMe/ZcashName/app/(site)/keypair/page.tsx`

**Run the indexer. Parse a memo. Verify a signature. The tenets are self-executing.**
