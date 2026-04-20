import fs from "fs";
import path from "path";
import WebRTCClient from "@nkg447/signallite";
import { SingleBar, Presets } from "cli-progress";
import {
  DEFAULT_SERVER,
  CONNECTION_TIMEOUT_MS,
  encodeControl,
  decodeMessage,
} from "./protocol.js";

export async function receive(code, options = {}) {
  const server = options.server || DEFAULT_SERVER;
  const outDir = options.out || ".";

  console.log(`Connecting with code: ${code}`);
  console.log("Waiting for sender...\n");

  return new Promise((resolve, reject) => {
    let timeoutId = null;
    let fileMeta = null;
    let writeStream = null;
    let received = 0;
    let bar = null;
    let lastTime = Date.now();
    let lastReceived = 0;

    const onMessage = (event) => {
      const { kind, msg, buf } = decodeMessage(event.data);

      if (kind === "control") {
        if (msg.type === "meta") {
          fileMeta = msg;
          clearTimeout(timeoutId);

          const outPath = resolveOutputPath(outDir, fileMeta.name);
          const formattedSize = formatBytes(fileMeta.size);
          console.log(`Receiving ${fileMeta.name} (${formattedSize})`);
          console.log(`Saving to ${outPath}\n`);

          writeStream = fs.createWriteStream(outPath);
          bar = new SingleBar(
            {
              format: "[{bar}] {percentage}% | {speed}",
              hideCursor: true,
            },
            Presets.shades_classic
          );
          bar.start(fileMeta.size, 0, { speed: "0 B/s" });

          // Tell sender we're ready
          client.peerChannel.send(encodeControl({ type: "ready" }));
        } else if (msg.type === "done") {
          if (bar) {
            bar.update(fileMeta.size, { speed: "done" });
            bar.stop();
          }
          if (writeStream) {
            writeStream.end(() => {
              console.log(`\nDone! Saved to ./${fileMeta.name}`);
              client.peerChannel.send(encodeControl({ type: "ack" }));
              setTimeout(() => process.exit(0), 500);
            });
          }
        }
      } else if (kind === "chunk") {
        if (writeStream) {
          writeStream.write(buf);
          received += buf.length;

          // Update progress
          const now = Date.now();
          const elapsed = (now - lastTime) / 1000;
          if (elapsed >= 0.5) {
            const speed = (received - lastReceived) / elapsed;
            bar.update(received, { speed: formatBytes(speed) + "/s" });
            lastTime = now;
            lastReceived = received;
          }
        }
      }
    };

    const onPeerConnect = (_channel) => {
      console.log("Connected to peer!");
    };

    const client = new WebRTCClient(
      server,
      code,
      onMessage,
      onPeerConnect
    );

    // Receiver does NOT call createOffer — it waits for the sender's offer

    // Connection timeout
    timeoutId = setTimeout(() => {
      console.error("\nError: connection timed out (60s). No peer connected.");
      process.exit(1);
    }, CONNECTION_TIMEOUT_MS);
  });
}

function resolveOutputPath(outDir, fileName) {
  let outPath = path.join(outDir, fileName);

  if (!fs.existsSync(outPath)) {
    return outPath;
  }

  // File exists — append numeric suffix
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let i = 1;
  while (fs.existsSync(outPath)) {
    outPath = path.join(outDir, `${base}.${i}${ext}`);
    i++;
  }
  return outPath;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
