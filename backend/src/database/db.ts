import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, "..", "..", "data");
mkdirSync(DB_DIR, { recursive: true });

export const db = new Database(path.join(DB_DIR, "modzero.sqlite"));
db.pragma("journal_mode = WAL");

/**
 * Schema per spec §31 (Content, License entities). This is the
 * off-chain index/cache — the blockchain remains the source of truth for
 * anything economically/legally load-bearing (stake, license validity,
 * claim state). This DB exists to hold metadata the chain doesn't store:
 * fingerprint, watermark identifier, media location, ENS name, etc.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS content (
    contentId TEXT PRIMARY KEY,
    creatorAddress TEXT,
    ensName TEXT,
    parentContentId TEXT,
    mediaUri TEXT,
    fingerprint TEXT,
    fingerprintAlgorithm TEXT,
    watermarkIdentifier TEXT,
    commitment TEXT,
    createdAt TEXT,
    hederaSequence INTEGER,
    ethereumTxHash TEXT
  );

  CREATE TABLE IF NOT EXISTS license (
    licenseId TEXT PRIMARY KEY,
    contentId TEXT,
    licensor TEXT,
    licensee TEXT,
    termsHash TEXT,
    issuedAt TEXT,
    expiresAt TEXT,
    price TEXT,
    currency TEXT,
    termsJson TEXT,
    ethereumTxHash TEXT
  );
`);