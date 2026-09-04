/**
 * ModZero — Hedera HCS Event Schema
 *
 * Single source of truth for event shapes published to / consumed from the
 * HCS topic. Both `hedera/publisher` and `backend/indexer` MUST import from
 * here rather than redefining these shapes, to avoid schema drift.
 *
 * Mirrors docs/SPEC.md section 15 exactly. Do not change field names or
 * types without updating the spec and notifying the whole team (spec §38
 * Rule 2 — do not invent new protocol behavior unilaterally).
 */

export type HcsEventType =
  | "CONTENT_CREATED"
  | "CONTENT_DERIVED"
  | "LICENSE_CREATED"
  | "CLAIM_CREATED"
  | "CLAIM_RESOLVED";

export interface ContentCreatedEvent {
  type: "CONTENT_CREATED";
  version: 1;
  contentId: string;
  creator: string; // 0x address
  ens: string; // e.g. "alice.eth"
  fingerprintCommitment: string; // 0x hash
  mediaUri: string;
  timestamp: string; // ISO 8601
}

export interface ContentDerivedEvent {
  type: "CONTENT_DERIVED";
  version: 1;
  contentId: string; // child content
  parentContentId: string;
  creator: string;
  fingerprintMatch: boolean;
  watermarkMatch: boolean;
  timestamp: string;
}

export interface LicenseCreatedEvent {
  type: "LICENSE_CREATED";
  version: 1;
  contentId: string;
  licenseId: string;
  licensor: string;
  licensee: string;
  termsHash: string;
  timestamp: string;
}

export interface ClaimCreatedEvent {
  type: "CLAIM_CREATED";
  version: 1;
  claimId: string;
  contentId: string;
  rootContentId: string;
  claimant: string;
  subject: string;
  evidenceHash: string;
  timestamp: string;
}

export interface ClaimResolvedEvent {
  type: "CLAIM_RESOLVED";
  version: 1;
  claimId: string;
  outcome: "VALID" | "INVALID";
  timestamp: string;
}

export type HcsEvent =
  | ContentCreatedEvent
  | ContentDerivedEvent
  | LicenseCreatedEvent
  | ClaimCreatedEvent
  | ClaimResolvedEvent;

/** Narrow an unknown parsed JSON payload into a typed HcsEvent, or null. */
export function parseHcsEvent(raw: unknown): HcsEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const validTypes: HcsEventType[] = [
    "CONTENT_CREATED",
    "CONTENT_DERIVED",
    "LICENSE_CREATED",
    "CLAIM_CREATED",
    "CLAIM_RESOLVED",
  ];
  if (typeof obj.type !== "string" || !validTypes.includes(obj.type as HcsEventType)) {
    return null;
  }
  // Structural validation only — callers should still handle malformed
  // fields defensively since this is ingesting external event data.
  return obj as unknown as HcsEvent;
}
