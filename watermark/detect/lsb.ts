import sharp from "sharp";
import { bitsToBytes, LENGTH_HEADER_BITS } from "../utils.js";

/**
 * Extracts a watermark previously embedded by embedWatermark().
 * Returns null (not a thrown error) when no valid watermark is found,
 * since "no watermark present" is an expected, normal outcome — e.g.
 * when checking an unrelated image (spec §13, §23).
 */
export async function detectWatermark(imageBuffer: Buffer): Promise<string | null> {
  const { data } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  if (data.length < LENGTH_HEADER_BITS) return null;

  let lengthBits = "";
  for (let i = 0; i < LENGTH_HEADER_BITS; i++) {
    lengthBits += (data[i] & 1).toString();
  }
  const messageLength = parseInt(lengthBits, 2);

  const maxPossibleBytes = (data.length - LENGTH_HEADER_BITS) / 8;
  if (messageLength <= 0 || messageLength > maxPossibleBytes) {
    return null; // sanity check — avoids reading garbage as a "valid" message
  }

  const totalBits = messageLength * 8;
  let messageBits = "";
  for (let i = 0; i < totalBits; i++) {
    messageBits += (data[LENGTH_HEADER_BITS + i] & 1).toString();
  }

  try {
    const text = bitsToBytes(messageBits).toString("utf8");
    return text;
  } catch {
    return null;
  }
}