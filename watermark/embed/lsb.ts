import sharp from "sharp";
import { bytesToBits, LENGTH_HEADER_BITS } from "../utils.js";

/**
 * Embeds a message into the least-significant bit of each RGBA byte.
 * MVP steganographic technique per spec §11 — production version should
 * upgrade to a more robust scheme, but this demonstrates the concept and
 * survives lossless formats (PNG) correctly.
 *
 * Layout: [32-bit message length][message bytes as bits]
 */
export async function embedWatermark(imageBuffer: Buffer, message: string): Promise<Buffer> {
  const messageBytes = Buffer.from(message, "utf8");
  const lengthBits = messageBytes.length.toString(2).padStart(LENGTH_HEADER_BITS, "0");
  const messageBits = lengthBits + bytesToBits(messageBytes);

  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (messageBits.length > data.length) {
    throw new Error("message too large to embed in this image");
  }

  const output = Buffer.from(data);
  for (let i = 0; i < messageBits.length; i++) {
    const bit = messageBits[i] === "1" ? 1 : 0;
    output[i] = (output[i] & 0xfe) | bit; // overwrite LSB only
  }

  // Must re-encode as PNG (lossless) — JPEG's compression would destroy
  // the LSB-encoded bits.
  return sharp(output, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
}