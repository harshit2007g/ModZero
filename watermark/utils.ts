export function bytesToBits(bytes: Buffer): string {
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  return bits;
}

export function bitsToBytes(bits: string): Buffer {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Bits used as a length prefix before the actual message bits. */
export const LENGTH_HEADER_BITS = 32;