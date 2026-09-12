/**
 * ModZero — Hedera HCS Event Schema
 *
 * Single source of truth for event shapes published to / consumed from the
 * HCS topic. Both `hedera/publisher` and `backend/indexer` MUST import from
 * here rather than redefining these shapes, to avoid schema drift.
 *
 * Mirrors docs/SPEC.md section 15, extended with POST_CREATED,
 * CHALLENGE_CREATED, and CHALLENGE_RESOLVED for the posts/challenges
 * feature (not in the original spec — added later in the build).
 */

export type HcsEventType =
  | "CONTENT_CREATED"
  | "CONTENT_DERIVED"
  | "LICENSE_CREATED"
  | "CLAIM_CREATED"
  | "CLAIM_RESOLVED"
  | "POST_CREATED"
  | "CHALLENGE_CREATED"
  | "CHALLENGE_RESOLVED";

export interface ContentCreatedEvent {
  type: "CONTENT_CREATED";
  version: 1;
  contentId: string;
  creator: string;
  ens: string;
  fingerprintCommitment: string;
  mediaUri: string;
  timestamp: string;
}

export interface ContentDerivedEvent {
  type: "CONTENT_DERIVED";
  version: 1;
  contentId: string;
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

export interface PostCreatedEvent {
  type: "POST_CREATED";
  version: 1;
  postId: string;
  creator: string;
  textHash: string;
  contentId: string | null;
  timestamp: string;
}

export interface ChallengeCreatedEvent {
  type: "CHALLENGE_CREATED";
  version: 1;
  challengeId: string;
  postId: string;
  challenger: string;
  creator: string;
  timestamp: string;
}

export interface ChallengeResolvedEvent {
  type: "CHALLENGE_RESOLVED";
  version: 1;
  challengeId: string;
  outcome: "GUILTY" | "NOT_GUILTY";
  timestamp: string;
}

export type HcsEvent =
  | ContentCreatedEvent
  | ContentDerivedEvent
  | LicenseCreatedEvent
  | ClaimCreatedEvent
  | ClaimResolvedEvent
  | PostCreatedEvent
  | ChallengeCreatedEvent
  | ChallengeResolvedEvent;

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
    "POST_CREATED",
    "CHALLENGE_CREATED",
    "CHALLENGE_RESOLVED",
  ];
  if (typeof obj.type !== "string" || !validTypes.includes(obj.type as HcsEventType)) {
    return null;
  }
  return obj as unknown as HcsEvent;
}