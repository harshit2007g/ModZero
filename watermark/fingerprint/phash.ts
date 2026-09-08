import sharp from "sharp";

const HASH_WIDTH = 9; // 9 columns so we get 8 left-right comparisons per row
const HASH_HEIGHT = 8;

/**
 * Perceptual difference-hash (dHash). Resizes to a tiny fixed grid,
 * converts to grayscale, and encodes whether each pixel is brighter than
 * its right-hand neighbor. Small edits (compression, resize, minor crop)
 * barely change this hash, unlike a raw SHA-256 of the file bytes
 * (spec §10).
 */
export async function computeDHash(imageBuffer: Buffer): Promise<string> {
  const { data } = await sharp(imageBuffer)
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = "";
  for (let row = 0; row < HASH_HEIGHT; row++) {
    for (let col = 0; col < HASH_WIDTH - 1; col++) {
      const left = data[row * HASH_WIDTH + col];
      const right = data[row * HASH_WIDTH + col + 1];
      bits += left > right ? "1" : "0";
    }
  }

  // 64 bits -> 16 hex chars
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}

/** Number of differing bits between two dHash values (0 = identical). */
export function hammingDistance(hashA: string, hashB: string): number {
  let xor = BigInt("0x" + hashA) ^ BigInt("0x" + hashB);
  let dist = 0;
  while (xor > 0n) {
    dist += Number(xor & 1n);
    xor >>= 1n;
  }
  return dist;
}

/** 1.0 = identical, 0.0 = completely different (64-bit hash). */
export function similarity(hashA: string, hashB: string): number {
  return 1 - hammingDistance(hashA, hashB) / 64;
}