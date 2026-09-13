import { computeDHash, detectWatermark, similarity } from "@modzero/watermark";
import { db } from "../database/db.js";
import type { ContentRecord } from "../database/contentRepo.js";

export const SIMILARITY_THRESHOLD = 0.85;

export interface MatchResult {
  contentId: string;
  similarity: number;
  watermarkIdentifier: string;
}

/**
 * Finds the stored content the given uploaded file most closely resembles.
 * Never throws; unusable fingerprint rows are skipped.
 */
export async function findBestMatch(buffer: Buffer): Promise<MatchResult | null> {
  const submittedFingerprint = await computeDHash(buffer);
  const detectedWatermark = await detectWatermark(buffer);

  const allContent = db.prepare(`SELECT * FROM content`).all() as ContentRecord[];

  let bestMatch: MatchResult | null = null;
  for (const record of allContent) {
    if (!record.fingerprint || record.fingerprint.length !== 16) continue;

    let sim: number;
    try {
      sim = similarity(submittedFingerprint, record.fingerprint);
    } catch {
      continue;
    }

    if (!bestMatch || sim > bestMatch.similarity) {
      bestMatch = { contentId: record.contentId, similarity: sim, watermarkIdentifier: record.watermarkIdentifier };
    }
  }

  const watermarkMatch =
    detectedWatermark !== null && bestMatch !== null && bestMatch.watermarkIdentifier === detectedWatermark;

  const fingerprintMatch = bestMatch !== null && bestMatch.similarity >= SIMILARITY_THRESHOLD;

  const match = {
    ...(bestMatch ?? { contentId: null, similarity: 0, watermarkIdentifier: null }),
    detectedWatermark,
    fingerprintMatch,
    watermarkMatch,
  };

  return match.fingerprintMatch || match.watermarkMatch
    ? {
        contentId: match.contentId as string,
        similarity: match.similarity,
        watermarkIdentifier: match.watermarkIdentifier as string,
      }
    : null;
}