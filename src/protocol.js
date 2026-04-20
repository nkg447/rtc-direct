export const CHUNK_SIZE = 16 * 1024; // 16KB — safe for WebRTC data channels

export const DEFAULT_SERVER = "https://signallite.nikunjgupta.dev";

export const CONNECTION_TIMEOUT_MS = 60_000;

export function encodeControl(msg) {
  return JSON.stringify(msg);
}

export function decodeMessage(data) {
  if (typeof data === "string") {
    return { kind: "control", msg: JSON.parse(data) };
  }
  // Binary chunk — could be Buffer or ArrayBuffer
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return { kind: "chunk", buf };
}
