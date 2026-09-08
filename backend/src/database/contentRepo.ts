import { db } from "./db.js";

export interface ContentRecord {
  contentId: string;
  creatorAddress: string;
  ensName: string | null;
  parentContentId: string | null;
  mediaUri: string;
  fingerprint: string;
  fingerprintAlgorithm: string;
  watermarkIdentifier: string;
  commitment: string;
  createdAt: string;
  hederaSequence: number | null;
  ethereumTxHash: string | null;
}

const insertStmt = db.prepare(`
  INSERT INTO content (contentId, creatorAddress, ensName, parentContentId, mediaUri, fingerprint,
    fingerprintAlgorithm, watermarkIdentifier, commitment, createdAt, hederaSequence, ethereumTxHash)
  VALUES (@contentId, @creatorAddress, @ensName, @parentContentId, @mediaUri, @fingerprint,
    @fingerprintAlgorithm, @watermarkIdentifier, @commitment, @createdAt, @hederaSequence, @ethereumTxHash)
`);

const getStmt = db.prepare(`SELECT * FROM content WHERE contentId = ?`);

export function saveContent(record: ContentRecord): void {
  insertStmt.run(record);
}

export function getContentById(contentId: string): ContentRecord | undefined {
  return getStmt.get(contentId) as ContentRecord | undefined;
}