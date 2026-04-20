import fs from "fs";
import path from "path";
import WebRTCClient from "@nkg447/signallite";
import { SingleBar, Presets } from "cli-progress";
import { generateCode } from "./code.js";
import {
  CHUNK_SIZE,
  DEFAULT_SERVER,
  CONNECTION_TIMEOUT_MS,
  encodeControl,
  decodeMessage,
} from "./protocol.js";

export async function send(filePath, options = {}) {
  const server = options.server || DEFAULT_SERVER;

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }

  const stat = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const fileSize = stat.size;
  const code = generateCode();

  const formattedSize = formatBytes(fileSize);
  console.log(`Sending ${fileName} (${formattedSize})`);
  console.log(`Code: ${code}`);
  console.log(`\nOn the other machine, run:`);
  console.log(`  npx rtc-direct receive ${code}\n`);

  return new Promise((resolve, reject) => {
    let timeoutId = null;

    const onMessage = (event) => {
      const { kind, msg } = decodeMessage(event.data);
      if (kind === "control" && msg.type === "ready") {
        streamFile(filePath, fileSize, client);
      } else if (kind === "control" && msg.type === "ack") {
        console.log("\nTransfer complete!");
        clearTimeout(timeoutId);
        resolve();
        process.exit(0);
      }
    };

    const onPeerConnect = (channel) => {
      console.log("Connected to peer!");
      // Send file metadata
      channel.send(
        encodeControl({ type: "meta", name: fileName, size: fileSize })
      );
    };

    const client = new WebRTCClient(
      server,
      code,
      onMessage,
      onPeerConnect
    );

    client.createOffer();

    // Connection timeout
    timeoutId = setTimeout(() => {
      console.error("\nError: connection timed out (60s). No peer connected.");
      process.exit(1);
    }, CONNECTION_TIMEOUT_MS);
  });
}

function streamFile(filePath, fileSize, client) {
  const bar = new SingleBar(
    {
      format: "[{bar}] {percentage}% | {speed}",
      hideCursor: true,
    },
    Presets.shades_classic
  );
  bar.start(fileSize, 0, { speed: "0 B/s" });

  const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
  let sent = 0;
  let lastTime = Date.now();
  let lastSent = 0;

  const channel = client.peerChannel;

  // Flow control: respect data channel buffering
  const BUFFER_THRESHOLD = 256 * 1024; // 256KB
  channel.bufferedAmountLowThreshold = 64 * 1024;

  stream.on("data", (chunk) => {
    channel.send(chunk);
    sent += chunk.length;

    // Update progress
    const now = Date.now();
    const elapsed = (now - lastTime) / 1000;
    if (elapsed >= 0.5) {
      const speed = (sent - lastSent) / elapsed;
      bar.update(sent, { speed: formatBytes(speed) + "/s" });
      lastTime = now;
      lastSent = sent;
    }

    // Pause stream if buffer is full
    if (channel.bufferedAmount > BUFFER_THRESHOLD) {
      stream.pause();
      channel.onbufferedamountlow = () => {
        channel.onbufferedamountlow = null;
        stream.resume();
      };
    }
  });

  stream.on("end", () => {
    bar.update(fileSize, { speed: "done" });
    bar.stop();
    channel.send(encodeControl({ type: "done" }));
  });

  stream.on("error", (err) => {
    bar.stop();
    console.error(`\nError reading file: ${err.message}`);
    process.exit(1);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
