const cryptoObj: Crypto | undefined =
  typeof globalThis === "object" && globalThis
    ? (globalThis as typeof globalThis & { crypto?: Crypto }).crypto
    : undefined;

const hasRandomUUID = typeof cryptoObj?.randomUUID === "function";
const hasGetRandomValues = typeof cryptoObj?.getRandomValues === "function";

const byteToHex: string[] = Array.from({ length: 256 }, (_, index) =>
  (index + 0x100).toString(16).slice(1),
);

function fallbackUUID(): string {
  const bytes = new Uint8Array(16);
  if (hasGetRandomValues && cryptoObj) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Per RFC 4122, set version to 4 and variant to 10xx.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const segments = [
    bytes.slice(0, 4),
    bytes.slice(4, 6),
    bytes.slice(6, 8),
    bytes.slice(8, 10),
    bytes.slice(10, 16),
  ];

  return segments
    .map((segment) => Array.from(segment, (byte) => byteToHex[byte]).join(""))
    .join("-");
}

export function randomId(prefix?: string): string {
  const core = hasRandomUUID && cryptoObj ? cryptoObj.randomUUID() : fallbackUUID();
  return prefix ? `${prefix}-${core}` : core;
}
