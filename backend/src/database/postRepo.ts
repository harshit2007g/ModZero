import { db } from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS post (
    postId TEXT PRIMARY KEY,
    creatorAddress TEXT,
    text TEXT,
    textHash TEXT,
    contentId TEXT,
    createdAt TEXT,
    ethereumTxHash TEXT
  );
`);

export interface PostRecord {
  postId: string;
  creatorAddress: string;
  text: string;
  textHash: string;
  contentId: string | null;
  createdAt: string;
  ethereumTxHash: string;
}

const insertStmt = db.prepare(`
  INSERT INTO post (postId, creatorAddress, text, textHash, contentId, createdAt, ethereumTxHash)
  VALUES (@postId, @creatorAddress, @text, @textHash, @contentId, @createdAt, @ethereumTxHash)
`);

const getStmt = db.prepare(`SELECT * FROM post WHERE postId = ?`);
const listStmt = db.prepare(`SELECT * FROM post ORDER BY createdAt DESC`);

export function savePost(record: PostRecord): void {
  insertStmt.run(record);
}

export function getPostById(postId: string): PostRecord | undefined {
  return getStmt.get(postId) as PostRecord | undefined;
}

export function listPosts(): PostRecord[] {
  return listStmt.all() as PostRecord[];
}