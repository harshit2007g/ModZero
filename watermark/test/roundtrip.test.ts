import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { computeDHash, similarity } from "../fingerprint/phash.js";
import { embedWatermark } from "../embed/lsb.js";
import { detectWatermark } from "../detect/lsb.js";
import { generateSecret, generateContentId, generateCommitment } from "../commitment.js";

async function makeTestImage(): Promise<Buffer> {
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .png()
    .toBuffer();
}

describe("watermark + fingerprint pipeline", () => {
  it("embeds and detects a watermark message", async () => {
    const original = await makeTestImage();
    const message = "contentId:abc123";
    const watermarked = await embedWatermark(original, message);
    const detected = await detectWatermark(watermarked);
    expect(detected).toBe(message);
  });

  it("returns null when detecting on an image with no watermark", async () => {
    const original = await makeTestImage();
    const detected = await detectWatermark(original);
    expect(detected).toBeNull();
  });

  it("computes an identical fingerprint for the same image", async () => {
    const image = await makeTestImage();
    const hashA = await computeDHash(image);
    const hashB = await computeDHash(image);
    expect(hashA).toBe(hashB);
    expect(similarity(hashA, hashB)).toBe(1);
  });

  it("keeps a high similarity after JPEG recompression", async () => {
    const original = await makeTestImage();
    const recompressed = await sharp(original).jpeg({ quality: 80 }).toBuffer();
    const hashA = await computeDHash(original);
    const hashB = await computeDHash(recompressed);
    expect(similarity(hashA, hashB)).toBeGreaterThan(0.8);
  });

  it("generates a deterministic commitment for the same inputs", () => {
    const secret = generateSecret();
    const contentId = generateContentId();
    const fingerprint = "abc123";
    const c1 = generateCommitment({ secret, fingerprint, contentId });
    const c2 = generateCommitment({ secret, fingerprint, contentId });
    expect(c1).toBe(c2);
  });
});