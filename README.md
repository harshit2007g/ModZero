# ModZero

**No moderator. Just proof.**

A permissionless content provenance and licensing protocol. Cryptographic
fingerprints and invisible watermarks establish content relationships,
Hedera HCS records the ordered event history, Ethereum handles economic
commitments and enforcement, ENS identifies creators, and autonomous
creator agents negotiate machine-readable licenses via x402.

> Don't moderate the content. Verify the history.

Full protocol spec: [`docs/SPEC.md`](docs/SPEC.md)

---

## Repo layout

```
contracts/    Solidity contracts (Hardhat) — ContentRegistry, LicenseRegistry, ClaimRegistry
backend/      API + indexer + DB models (orchestration layer)
watermark/    Perceptual fingerprinting + invisible watermark embed/detect
hedera/       HCS event publishing + indexing (CONTENT_CREATED, LICENSE_CREATED, CLAIM_CREATED, ...)
agent/        Creator agent: licensing policy engine + x402 payment flow
frontend/     React app (upload, dashboard, license request, claim UI)
graph/        Propagation graph visualization
tests/        Cross-cutting/integration tests
docs/         Spec, architecture notes, demo script
scripts/      Deploy/setup scripts
```

## Prerequisites

- Node.js 20+
- An Ethereum testnet RPC URL (e.g. Sepolia) + funded deployer key
- A Hedera testnet account (Account ID + Private Key) and a created HCS Topic
- An ENS name on the same testnet you're using (or use ENS on Sepolia)

## Setup

```bash
npm install
cp .env.example .env   # fill in your own values — never commit .env
```

Each workspace (`contracts`, `backend`, `agent`, `frontend`) has its own
`package.json`; `npm install` at the root installs all of them via npm
workspaces.

## Team ownership (from spec §39)

| Member | Owns |
|---|---|
| Member 1 — Protocol/Backend | `contracts/`, `backend/`, `hedera/`, `watermark/`, `agent/` |
| Member 2 — Frontend | `frontend/` (wallet, upload, dashboard, license/claim UI) |
| Member 3 — Visualization | `graph/`, landing page, provenance timeline, visual polish |

Members 2 and 3 consume APIs defined by Member 1 — they should not
independently redefine protocol logic (spec §39).

## AI development rules (spec §38)

If you're using AI coding agents on this repo, point them at
`docs/AI_RULES.md` before they touch protocol code.
