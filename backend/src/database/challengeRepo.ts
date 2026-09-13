import { db } from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS challenge (
    challengeId TEXT PRIMARY KEY,
    postId TEXT,
    createdAt TEXT,
    ethereumTxHash TEXT
  );
`);

export interface ChallengeIndexRecord {
  challengeId: string;
  postId: string;
  createdAt: string;
  ethereumTxHash: string;
}

export function saveChallengeIndex(record: ChallengeIndexRecord): void {
  db.prepare(
    `INSERT OR IGNORE INTO challenge (challengeId, postId, createdAt, ethereumTxHash)
     VALUES (@challengeId, @postId, @createdAt, @ethereumTxHash)`
  ).run(record);
}

export function listChallengeIndex(postId?: string): ChallengeIndexRecord[] {
  if (!postId) {
    return db.prepare(`SELECT * FROM challenge ORDER BY createdAt DESC`).all() as ChallengeIndexRecord[];
  }
  return db.prepare(`SELECT * FROM challenge WHERE postId = ? ORDER BY createdAt DESC`).all(postId) as ChallengeIndexRecord[];
}