# ModZero — Complete Project Specification

## 1. Project Identity

**Project name:** ModZero
**Tagline:** **No moderator. Just proof.**

**Project category:** Web3 / decentralized content provenance / autonomous licensing / permissionless dispute resolution.

### One-sentence definition

ModZero is a permissionless content provenance and licensing protocol that uses cryptographic content fingerprints, invisible watermarking, Hedera HCS provenance events, Ethereum-based economic incentives, propagation graphs, ENS identity, and autonomous creator agents to determine and enforce content usage rights **without relying on a centralized moderator**.

---

# 2. Core Problem

Online content has three major problems:

### Problem 1 — Provenance

Once an image/video is copied, modified, reposted, compressed, cropped, or redistributed, it becomes difficult to determine:

* Who originally published it?
* Where did the copy come from?
* Who propagated it?
* Is it an authorized derivative?

A normal file hash is insufficient because even a tiny modification produces a completely different hash.

### Problem 2 — Licensing

A person may legitimately want to use someone else's content.

Today, licensing often requires:

* contacting the creator
* waiting for a response
* negotiating manually
* sending payment
* proving authorization later

This does not scale to machines, applications, or autonomous agents.

### Problem 3 — Centralized moderation

Current platforms frequently rely on centralized moderators or administrators to decide:

> "Who owns this content?"
> "Was this use authorized?"
> "Should this content be removed?"
> "Who should receive compensation?"

ModZero replaces this centralized decision-making model with:

**cryptographic evidence + explicit licensing policies + economic incentives + deterministic protocol rules.**

The protocol does not attempt to determine subjective legal truth.

It determines whether a content relationship satisfies the protocol's predefined provenance and licensing rules.

---

# 3. Core Philosophy

## "Don't moderate the content. Verify the history."

ModZero should not have a central moderator who decides whether Alice or Bob is correct.

Instead:

```text
Content
   ↓
Fingerprint / Watermark
   ↓
Provenance evidence
   ↓
Hedera event history
   ↓
Propagation graph
   ↓
License verification
   ↓
Protocol rules
   ↓
Economic settlement
```

The system should be as deterministic and permissionless as practical.

---

# 4. Main Actors

## Creator

The original publisher of content.

Example:

```text
Alice
alice.eth
```

Alice:

* uploads content
* registers provenance
* deposits a publication stake
* defines licensing rules
* operates a creator agent

---

## Licensed User

A person or application that receives permission to use content.

Example:

```text
Bob
```

Bob requests permission through Alice's creator agent.

---

## Unauthorized User

A person who uses/reposts content without satisfying the creator's licensing policy.

Example:

```text
Charlie
```

Charlie may become subject to a protocol claim if the system detects the content relationship and no valid license exists.

---

## Creator Agent

An autonomous service representing the creator's predefined licensing policy.

The agent should not invent arbitrary legal decisions.

It should evaluate requests against machine-readable rules.

Example:

```json
{
  "commercial": {
    "allowed": true,
    "price": "0.02 ETH"
  },
  "nonCommercial": {
    "allowed": true,
    "price": "0.002 ETH"
  },
  "modification": true,
  "attribution": true,
  "political": false
}
```

---

# 5. High-Level Architecture

```text
                         ┌──────────────────┐
                         │       ENS        │
                         │ alice.eth        │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Creator Profile  │
                         │ + Agent Endpoint │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Content Upload   │
                         └────────┬─────────┘
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
              Perceptual Fingerprint      Watermark
                     │                         │
                     └────────────┬────────────┘
                                  ▼
                         ┌──────────────────┐
                         │ Content Record   │
                         └────────┬─────────┘
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
          ┌───────────────┐                ┌───────────────┐
          │   Hedera HCS  │                │   Ethereum    │
          │ Provenance Log│                │ Economic State│
          └───────┬───────┘                └───────┬───────┘
                  │                                │
                  └──────────────┬─────────────────┘
                                 ▼
                        ┌─────────────────┐
                        │ Backend / Indexer│
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Propagation     │
                        │ Graph            │
                        └────────┬────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
             Licensed Use               Unauthorized Use
                   │                           │
                   ▼                           ▼
             Creator Agent                Claim
                   │                           │
                   ▼                           ▼
                 x402                    Evidence Check
                   │                           │
                   ▼                           ▼
               License                  Stake Resolution
```

---

# 6. Blockchain Responsibilities

Do NOT put everything on one blockchain.

## Ethereum

Ethereum is the **economic and authorization layer**.

Use it for:

* publication stakes
* license state
* claims
* dispute state
* economic settlement
* slashing
* rewards/refunds
* protocol permissions

Ethereum is where money and enforceable protocol state should live.

---

## Hedera HCS

Hedera Consensus Service is the **provenance/event layer**.

Use HCS for ordered events such as:

```text
CONTENT_CREATED
CONTENT_DERIVED
LICENSE_CREATED
CLAIM_CREATED
CLAIM_RESOLVED
```

HCS provides an ordered, timestamped event stream.

The application/indexer constructs the propagation graph from those events.

### Important

Hedera does NOT automatically create the propagation graph.

The application creates the graph by interpreting provenance events.

---

# 7. ENS

ENS is the human-readable identity layer.

Example:

```text
alice.eth
```

should resolve to:

```text
wallet address
creator profile
agent endpoint
optional metadata
```

Conceptually:

```text
alice.eth
    ↓
Ethereum address
    ↓
Creator profile
    ↓
Creator Agent
    ↓
Licensing policy
```

ENS should make creator identities readable instead of forcing users to interact with raw hexadecimal addresses.

---

# 8. Content Registration

When a creator uploads an image:

```text
Upload
  ↓
Generate contentId
  ↓
Generate perceptual fingerprint
  ↓
Generate secret
  ↓
Generate watermark
  ↓
Embed watermark
  ↓
Store media off-chain
  ↓
Generate commitment
  ↓
Create Hedera event
  ↓
Create Ethereum registration/stake
```

---

# 9. Content ID

Every registered piece of content receives a unique application-level identifier.

Example:

```text
contentId = UUID / cryptographic identifier
```

Do not rely exclusively on SHA-256 of the raw file as the identity mechanism because modified copies will have different hashes.

The content ID should remain stable for the registered root content.

---

# 10. Perceptual Fingerprinting

A perceptual fingerprint represents the visual characteristics of content rather than its exact bytes.

Purpose:

```text
Original image
      ↓
JPEG compression
      ↓
Resize
      ↓
Small modification
```

should still potentially be recognized as related.

A normal SHA-256 hash would fail:

```text
SHA256(original) != SHA256(modified)
```

A perceptual fingerprint attempts to preserve similarity:

```text
pHash(original) ≈ pHash(modified)
```

The implementation can initially use an established perceptual hashing technique suitable for the MVP.

Do not claim that perceptual hashing proves legal ownership.

It is evidence for content similarity/provenance.

---

# 11. Invisible Watermark

The system should embed an invisible provenance marker into the content.

For the MVP, an image-based steganographic technique such as LSB can be used as a demonstration.

The production architecture should remain compatible with more robust watermarking techniques.

The watermark may encode or derive from:

```text
contentId
secret-derived identifier
creator identifier
```

The watermark itself must not expose sensitive secrets.

---

# 12. Random Secret

Each root content registration generates a secret.

Example:

```text
secret = cryptographically_random_value()
```

The secret must not be publicly exposed.

It can be used to generate a commitment:

```text
commitment =
Hash(
    secret ||
    fingerprint ||
    contentId ||
    metadata
)
```

The public system stores the commitment.

The creator/service retains the secret required for stronger verification.

Do NOT store plaintext secrets on-chain.

---

# 13. Why Both Fingerprinting and Watermarking?

They solve different problems.

### Perceptual fingerprint

Answers:

> "Does this content look sufficiently similar to the registered content?"

### Watermark

Answers:

> "Does this content contain the provenance marker associated with a registered source?"

Together they provide stronger evidence.

```text
Unknown Content
      │
      ├── perceptual similarity?
      │
      └── watermark present?
              │
              ▼
        Possible provenance
```

---

# 14. Off-Chain Storage

Actual media should NOT be stored directly on Ethereum.

Possible storage:

* IPFS-compatible storage
* decentralized storage
* object storage for MVP

The blockchain/HCS layer stores references and provenance metadata, not large media files.

Example:

```json
{
  "contentId": "abc123",
  "mediaUri": "...",
  "fingerprint": "...",
  "commitment": "...",
  "creator": "alice.eth"
}
```

---

# 15. Hedera Event Schema

The system should use structured HCS messages.

### CONTENT_CREATED

```json
{
  "type": "CONTENT_CREATED",
  "version": 1,
  "contentId": "abc123",
  "creator": "0x...",
  "ens": "alice.eth",
  "fingerprintCommitment": "0x...",
  "mediaUri": "...",
  "timestamp": "..."
}
```

### CONTENT_DERIVED

```json
{
  "type": "CONTENT_DERIVED",
  "version": 1,
  "contentId": "child123",
  "parentContentId": "abc123",
  "creator": "0x...",
  "fingerprintMatch": true,
  "watermarkMatch": true,
  "timestamp": "..."
}
```

### LICENSE_CREATED

```json
{
  "type": "LICENSE_CREATED",
  "contentId": "abc123",
  "licenseId": "license123",
  "licensor": "0x...",
  "licensee": "0x...",
  "termsHash": "0x...",
  "timestamp": "..."
}
```

### CLAIM_CREATED

```json
{
  "type": "CLAIM_CREATED",
  "claimId": "claim123",
  "contentId": "child123",
  "rootContentId": "abc123",
  "claimant": "0x...",
  "subject": "0x...",
  "evidenceHash": "0x...",
  "timestamp": "..."
}
```

---

# 16. Propagation Graph

The graph is one of the central features of ModZero.

Example:

```text
                  Alice
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
         Bob               Charlie
          │                   │
          ▼                   ▼
        David                Eve
```

Each node represents a registered content instance.

Each edge represents a detected/registered provenance relationship.

A node should contain information such as:

```text
creator
contentId
parentContentId
timestamp
fingerprint status
watermark status
license status
claim status
```

---

# 17. Graph Semantics

An edge must not simply mean:

> "Bob uploaded after Alice."

It should mean something closer to:

> "Bob's registered content has sufficient provenance evidence connecting it to Alice's content."

Possible evidence:

```text
watermark match
+
perceptual similarity
+
registered parent relationship
```

The backend is responsible for determining the relationship.

The frontend only visualizes it.

---

# 18. Licensing

Creators define machine-readable licensing policies.

Example:

```json
{
  "commercialUse": {
    "allowed": true,
    "price": "0.02 ETH"
  },
  "nonCommercialUse": {
    "allowed": true,
    "price": "0.002 ETH"
  },
  "modification": {
    "allowed": true
  },
  "attribution": {
    "required": true
  },
  "politicalUse": {
    "allowed": false
  }
}
```

---

# 19. Creator Agent

The creator agent represents this policy.

Flow:

```text
User
  ↓
"I want to use Alice's image commercially."
  ↓
Alice's Agent
  ↓
Read policy
  ↓
Commercial use allowed?
  ↓
Yes
  ↓
Price = 0.02 ETH
  ↓
Payment
  ↓
License issued
```

The agent should produce structured results rather than relying exclusively on natural-language responses.

Example:

```json
{
  "decision": "APPROVE",
  "price": "0.02 ETH",
  "currency": "ETH",
  "terms": {
    "commercial": true,
    "modification": true,
    "attribution": true
  }
}
```

---

# 20. x402

x402 is used for machine-readable payment between the requesting party and the licensing service/agent.

Conceptual flow:

```text
Bob
 ↓
Request license
 ↓
Creator Agent
 ↓
Payment required
 ↓
x402 payment
 ↓
Payment verified
 ↓
License generated
```

The agent should not consider the license paid merely because a client claims payment occurred.

Payment must be independently verified.

---

# 21. License Object

A license should have a unique ID.

Conceptual structure:

```json
{
  "licenseId": "license123",
  "contentId": "abc123",
  "creator": "0xAlice",
  "licensee": "0xBob",
  "termsHash": "0x...",
  "issuedAt": "...",
  "expiresAt": null,
  "paymentReference": "...",
  "signature": "..."
}
```

The terms should be represented deterministically.

A hash of the terms can be committed to blockchain/HCS.

---

# 22. Authorized Derivative

If Bob receives a valid license and modifies Alice's image:

```text
Alice
 │
 │ licensed
 ▼
Bob
 │
 │ derivative
 ▼
Bob's Content
```

The propagation graph should show:

```text
Alice ──[LICENSED]──> Bob
                         │
                         ▼
                    Bob's derivative
```

The derivative should retain provenance information whenever technically possible.

---

# 23. Unauthorized Copy

Suppose Charlie copies Alice's image without a license.

Flow:

```text
Charlie uploads
      ↓
Fingerprint
      ↓
Watermark detection
      ↓
Alice identified as probable root
      ↓
Propagation graph relationship
      ↓
License lookup
      ↓
No valid license
      ↓
Potential claim
```

---

# 24. Staking

Publication requires an ETH stake.

Purpose:

* create economic accountability
* discourage spam
* create economic consequences for protocol violations
* fund protocol rewards/compensation

Example:

```text
Charlie
  ↓
register content
  ↓
deposit stake
```

The exact stake amount should be configurable.

Do NOT hard-code an economically unrealistic amount.

---

# 25. Claims

A claim can be created when protocol evidence suggests unauthorized use.

Example:

```text
Claim:
Alice → Charlie

Evidence:
- provenance relationship
- watermark match
- fingerprint similarity
- no valid license
```

The claim should have a state machine.

Example:

```text
NONE
 ↓
CREATED
 ↓
EVIDENCE_SUBMITTED
 ↓
RESOLVED
```

Potential outcomes:

```text
VALID
INVALID
```

Economic settlement occurs only according to explicit protocol rules.

---

# 26. No-Moderator Design

There should be no centralized moderator account capable of arbitrarily deciding:

```text
Alice wins
Bob loses
```

Instead, the protocol should use predefined verification rules.

For MVP, the resolution mechanism can be deterministic and limited.

For example:

```text
IF
    provenance evidence is valid
AND
    license does not exist
AND
    claim satisfies protocol requirements
THEN
    unauthorized-use outcome
```

The exact mechanism must be implemented conservatively.

If a fully trustless arbitration mechanism is too complex for the hackathon, explicitly describe the MVP as a **protocol-enforced evidence pipeline**, not as a magically complete legal arbitration system.

---

# 27. Important Economic Rule

A creator must NOT automatically receive another user's stake simply because the creator rejects a license request.

License rejection and unauthorized-use claims are separate concepts.

Correct model:

```text
License request
    ↓
Policy evaluation
    ↓
Approve / Reject
```

A rejected request should generally end there or return a refundable request deposit if one exists.

Slashing should occur only after a defined protocol violation/claim resolution.

---

# 28. False Claims

The protocol must consider malicious creators.

Example:

```text
Alice falsely claims:
"Charlie stole my content."
```

Therefore, claims must rely on evidence.

The system should avoid:

```text
creator says it → creator automatically wins
```

The architecture should leave room for:

* cryptographic evidence
* objective provenance
* challenge periods
* counter-evidence
* future decentralized arbitration

---

# 29. Legal Boundary

ModZero is a **technical provenance and licensing protocol**.

It does NOT automatically establish legal copyright ownership.

Correct language:

> "ModZero provides cryptographically verifiable provenance evidence and protocol-level licensing enforcement."

Avoid claims such as:

> "ModZero legally proves copyright ownership in every jurisdiction."

---

# 30. Backend

The backend is responsible for orchestration and indexing.

Suggested responsibilities:

```text
POST /content
GET /content/:id
GET /content/:id/graph
POST /verify
POST /license/request
GET /license/:id
POST /claim
GET /claim/:id
```

The exact framework is implementation-dependent.

The backend should:

* process uploads
* generate/verify fingerprints
* coordinate watermarking
* communicate with storage
* submit/read HCS events
* index provenance
* query Ethereum contracts
* expose APIs to frontend
* communicate with creator agents

---

# 31. Database

The database is an index/cache.

Blockchain/HCS remain the source of protocol truth.

Possible entities:

```text
Content
Creator
Derivative
License
Claim
HCS Event
Agent
```

Example Content model:

```text
contentId
creatorAddress
ensName
parentContentId
mediaUri
fingerprint
fingerprintAlgorithm
watermarkIdentifier
commitment
createdAt
hederaSequence
ethereumTxHash
```

---

# 32. Frontend

The frontend should contain:

## Landing page

Explain:

> No moderator. Just proof.

Show the three core concepts:

```text
PROVE
TRACE
LICENSE
```

---

## Upload

```text
Connect Wallet
      ↓
Upload Content
      ↓
Processing
      ↓
Fingerprint + Watermark
      ↓
Stake
      ↓
Publish
```

---

## Creator dashboard

Show:

* owned content
* provenance
* licenses
* claims
* agent policy
* stakes

---

## Content page

Show:

```text
Content
Creator
ENS
Fingerprint
Watermark status
License status
Provenance history
Propagation graph
```

---

## License request

User chooses:

```text
Commercial
Non-commercial
Modification
Attribution
```

Then the agent evaluates the request.

---

## Claim page

Show:

```text
Root creator
Detected uploader
Evidence
License status
Claim status
Economic outcome
```

---

# 33. Demo Flow

The demo should tell a simple story.

## Scene 1 — Alice publishes

```text
Alice
 ↓
Connect wallet
 ↓
Upload image
 ↓
Stake ETH
 ↓
Content registered
```

---

## Scene 2 — Bob wants legitimate use

```text
Bob
 ↓
Request commercial license
 ↓
Alice's creator agent
 ↓
Policy:
commercial = 0.02 ETH
 ↓
x402 payment
 ↓
License issued
```

Graph:

```text
Alice ── LICENSED ──> Bob
```

---

## Scene 3 — Charlie steals

```text
Charlie
 ↓
Upload copied image
 ↓
Watermark detected
 ↓
Fingerprint matched
 ↓
Alice identified as root
 ↓
No license
 ↓
Claim
 ↓
Protocol resolution
 ↓
Economic consequence
```

Graph:

```text
Alice
  │
  ├── Bob [LICENSED]
  │
  └── Charlie [UNAUTHORIZED]
```

Then the presentation ends with:

# "No moderator was involved."

---

# 34. Recommended MVP Scope

The MVP should support:

### Content

* images only

### Fingerprinting

* one perceptual hash implementation

### Watermark

* one working invisible watermark implementation

### Blockchain

* Ethereum testnet
* Hedera testnet

### Identity

* ENS

### Storage

* IPFS-compatible or simple off-chain storage

### Licensing

* machine-readable creator policies

### Agent

* one creator agent

### Payment

* x402

### Graph

* interactive propagation graph

### Claims

* basic protocol-enforced claim mechanism

---

# 35. Features NOT Required for MVP

Do NOT allow these to derail the hackathon:

* robust video watermarking
* every image transformation
* every blockchain
* full decentralized arbitration
* legal AI
* biometric identity
* platform-wide automatic takedowns
* perfect copyright detection
* universal social-media integration
* production-grade distributed storage
* complex DAO governance

These are future extensions.

---

# 36. Security Requirements

Never commit:

```text
private keys
API keys
Hedera secrets
x402 credentials
database passwords
watermark secrets
```

Use environment variables.

Example:

```env
PRIVATE_KEY=
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HEDERA_TOPIC_ID=
RPC_URL=
DATABASE_URL=
AGENT_SECRET=
```

Commit only:

```text
.env.example
```

---

# 37. Smart Contract Security

The contract implementation should consider:

* access control
* reentrancy
* replay attacks
* duplicate claims
* double settlement
* invalid state transitions
* stake locking
* unauthorized withdrawals
* malicious license creation
* claim manipulation
* integer/precision issues
* denial-of-service vectors

Use established OpenZeppelin primitives where appropriate.

---

# 38. AI Development Rules

AI coding agents are encouraged.

However, every AI must follow these rules:

### Rule 1

Do not change the architecture without explicit approval.

### Rule 2

Do not invent new protocol behavior.

### Rule 3

Do not silently change smart-contract economic rules.

### Rule 4

Do not commit secrets.

### Rule 5

Write tests alongside important protocol functionality.

### Rule 6

Explain non-trivial security assumptions.

### Rule 7

Do not replace the canonical project specification with assumptions.

### Rule 8

If a requirement is ambiguous, identify the ambiguity before making a protocol-level decision.

---

# 39. Team Ownership

## Member 1 — Project Owner / Protocol Engineer

This is the primary protocol/backend owner.

Responsible for:

* architecture
* Ethereum contracts
* staking
* claims
* disputes
* Hedera
* backend
* database
* fingerprinting
* watermarking
* creator agent
* x402
* ENS
* API design
* integration
* security

This person owns the project's core logic.

---

## Member 2 — Frontend Engineer

Responsible for:

* wallet UI
* upload UI
* creator dashboard
* license UI
* claim UI
* transaction states
* API consumption
* general UX

---

## Member 3 — Frontend / Visualization Engineer

Responsible for:

* propagation graph
* provenance timeline
* graph interactions
* content relationship visualization
* landing page
* visual polish
* animations
* responsive UI

Members 2 and 3 consume the APIs defined by Member 1.

They should not independently redefine protocol logic.

---

# 40. Suggested Repository

```text
modzero/
│
├── contracts/
│   ├── ContentRegistry.sol
│   ├── LicenseRegistry.sol
│   ├── ClaimRegistry.sol
│   ├── interfaces/
│   └── tests/
│
├── backend/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── indexer/
│   └── database/
│
├── watermark/
│   ├── embed/
│   ├── detect/
│   └── fingerprint/
│
├── hedera/
│   ├── events/
│   ├── publisher/
│   └── indexer/
│
├── agent/
│   ├── policy/
│   ├── licensing/
│   └── x402/
│
├── frontend/
│
├── graph/
│
├── tests/
│
├── docs/
│
├── scripts/
│
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

# 41. Core System Data Flow

```text
                    CREATOR
                       │
                       ▼
                  Upload Image
                       │
                       ▼
              Generate Content ID
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       Perceptual Hash       Secret
             │                   │
             │                   ▼
             │               Watermark
             │                   │
             └─────────┬─────────┘
                       ▼
                   Commitment
                       │
                       ▼
                 Off-chain Media
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
       Hedera                   Ethereum
      HCS Event               Stake/Register
          │                         │
          └────────────┬────────────┘
                       ▼
                    INDEXER
                       │
                       ▼
                PROPAGATION GRAPH
                       │
              ┌────────┴────────┐
              ▼                 ▼
          LICENSED           UNKNOWN
              │                 │
              ▼                 ▼
        Creator Agent        Detection
              │                 │
              ▼                 ▼
             x402           License Check
                                │
                         ┌──────┴──────┐
                         ▼             ▼
                       Valid         None
                         │             │
                         ▼             ▼
                       Allow        Claim
                                       │
                                       ▼
                                   Resolution
                                       │
                                       ▼
                                    Settlement
```

---

# 42. Design Principles

Every implementation decision should follow these principles:

### Principle 1 — Permissionless

No central moderator should be required for normal operation.

### Principle 2 — Evidence over assertions

Claims should rely on verifiable provenance evidence.

### Principle 3 — Explicit authorization

A license should be an explicit protocol object.

### Principle 4 — Economic accountability

Actions requiring trust should have appropriate economic incentives.

### Principle 5 — Separate concerns

Ethereum:

> economic state

Hedera:

> ordered provenance events

ENS:

> identity

Off-chain systems:

> media and computation

Agent:

> automated licensing policy

Frontend:

> human interaction

---

# 43. What ModZero Is NOT

ModZero is NOT:

* a centralized social network
* a generic NFT marketplace
* a simple image hash registry
* merely a watermarking tool
* merely an AI copyright detector
* a legal copyright adjudicator
* a centralized moderation service

The differentiation comes from combining:

```text
Provenance
+
Watermarking
+
Perceptual fingerprinting
+
Hedera event history
+
Propagation graph
+
Ethereum economic incentives
+
Permissionless claims
+
ENS identity
+
Creator agents
+
x402 licensing
```

into a single protocol.

---

# 44. Primary Value Proposition

The project should communicate three actions:

# PROVE

Prove the provenance of content.

# TRACE

Trace how content propagates.

# LICENSE

Allow machines and humans to obtain permission automatically.

And underneath all three:

# NO MODERATOR.

---

# 45. Final Project Definition

**ModZero is a permissionless content provenance and licensing protocol where cryptographic fingerprints and invisible provenance markers establish content relationships, Hedera HCS records the ordered history of those relationships, Ethereum handles economic commitments and protocol enforcement, ENS identifies creators, and autonomous creator agents negotiate machine-readable licenses through x402 payments. The resulting propagation graph allows users to trace content back to its origin and distinguish authorized from potentially unauthorized use without relying on a centralized moderator.**

The core philosophy is:

> **Don't moderate the content. Verify the history.**

And the core demo is:

```text
CREATE → TRACE → LICENSE → DETECT → CLAIM → SETTLE

                    ↓

             NO MODERATOR
```
