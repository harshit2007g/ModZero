import { readFileSync } from "fs";
import { computeDHash, detectWatermark, similarity } from "@modzero/watermark";

const THRESHOLD = 0.85;

// Real records from the backend DB (mirrors verify.ts query)
const allContent = [
  {
    contentId: "0xa055f1935435fb1902ef6df1e9e935fbe2aedb7eb8c8d016bce88ff1f34153a9",
    fingerprint: "23113869a9890b27",
    watermarkIdentifier:
      "modzero:0xa055f1935435fb1902ef6df1e9e935fbe2aedb7eb8c8d016bce88ff1f34153a9",
  },
];

async function verify(buffer, label) {
  const submittedFingerprint = await computeDHash(buffer);
  const detectedWatermark = await detectWatermark(buffer);

  let bestMatch = null;
  for (const record of allContent) {
    if (!record.fingerprint || record.fingerprint.length !== 16) continue;
    let sim;
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
  const fingerprintMatch = bestMatch !== null && bestMatch.similarity >= THRESHOLD;

  console.log(`\n=== ${label} ===`);
  console.log("submittedFingerprint:", submittedFingerprint);
  console.log("detectedWatermark  :", detectedWatermark);
  console.log("bestMatch.similarity:", bestMatch?.similarity);
  console.log("fingerprintMatch   :", fingerprintMatch);
  console.log("watermarkMatch     :", watermarkMatch);
  console.log("FLAGGED            :", fingerprintMatch || watermarkMatch);
}

// 1) The stored/watermarked copy itself (already-registered image)
verify(readFileSync("D:/modzero/backend/uploads/a055f1935435fb19.png"), "stored watermarked PNG (exact duplicate)");