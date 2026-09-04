# AI Development Rules

If you're an AI coding agent (Claude Code, Cursor, Copilot, etc.) working on
this repo, follow these rules from `docs/SPEC.md` §38 without exception:

1. **Do not change the architecture** without explicit approval from a team
   member. The Ethereum/Hedera/ENS split in §6-7 is load-bearing — don't
   move economic state onto HCS or provenance events onto Ethereum.
2. **Do not invent new protocol behavior.** If the spec doesn't define a
   rule for a case, flag the ambiguity (see Rule 8) rather than guessing.
3. **Do not silently change smart-contract economic rules** (stake amounts,
   slashing conditions, fee splits) — these need explicit sign-off.
4. **Do not commit secrets.** No private keys, Hedera credentials, x402
   credentials, DB passwords, or watermark secrets. Only `.env.example`
   gets committed.
5. **Write tests alongside protocol functionality** — especially contracts
   (`contracts/test/`) and claim/license logic.
6. **Explain non-trivial security assumptions** in code comments or PR
   descriptions, particularly around access control and claim resolution.
7. **Do not replace `docs/SPEC.md` with your own assumptions** — it's the
   canonical source. Cite section numbers when implementing.
8. **If a requirement is ambiguous, say so explicitly** before making a
   protocol-level decision — don't pick silently and move on.

## Known open decisions (not yet resolved in the spec)

These are intentionally left open in the current scaffold — pick one as a
team rather than letting an AI agent decide unilaterally:

- **Claim resolution trigger**: exact threshold combining fingerprint
  similarity score + watermark match to auto-flag a claim (spec §17, §23).
- **LicenseRegistry access control**: who is authorized to call
  `issueLicense` — the content's registered creator directly, or a
  trusted agent relay address? (see `contracts/LicenseRegistry.sol` note)
- **Claim resolution → settlement wiring**: `ClaimRegistry.resolveClaim`
  currently only updates state; slashing `ContentRegistry` stake on
  `RESOLVED_VALID` needs an explicit, reviewed implementation (spec §37).
