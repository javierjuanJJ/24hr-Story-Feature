/**
 * Utility for generating unique identifiers.
 *
 * This file contains the generateId function, which creates a unique ID for
 * each new story so stories can be told apart in the list and localStorage.
 */

/**
 * Generates a unique identifier for a new story.
 *
 * Uses the browser's crypto.randomUUID when available. Falls back to a
 * manual RFC-4122 style UUID built from crypto.getRandomValues, and finally
 * to Math.random as a last resort.
 *
 * @returns a random UUID string
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const buf = new Uint8Array(16);
  try {
    crypto.getRandomValues(buf);
  } catch {
    for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  }

  // Set the UUID version bits (version 4) and variant bits as per RFC 4122.
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = (b: number) => b.toString(16).padStart(2, "0");
  return [
    hex(buf[0]), hex(buf[1]), hex(buf[2]), hex(buf[3]),
    "-", hex(buf[4]), hex(buf[5]), "-",
    hex(buf[6]), hex(buf[7]), "-",
    hex(buf[8]), hex(buf[9]), "-",
    hex(buf[10]), hex(buf[11]), hex(buf[12]), hex(buf[13]), hex(buf[14]), hex(buf[15]),
  ].join("");
}
