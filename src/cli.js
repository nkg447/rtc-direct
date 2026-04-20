import { Command } from "commander";
import { send } from "./sender.js";
import { receive } from "./receiver.js";
import { DEFAULT_SERVER } from "./protocol.js";

export function run(argv) {
  const program = new Command();

  program
    .name("rtc-direct")
    .description("P2P file transfer over WebRTC")
    .version("0.1.0");

  program
    .command("send <file>")
    .description("Send a file to a peer")
    .option("--server <url>", "Signaling server URL", DEFAULT_SERVER)
    .action((file, opts) => {
      send(file, opts);
    });

  program
    .command("receive <code>")
    .description("Receive a file from a peer")
    .option("--server <url>", "Signaling server URL", DEFAULT_SERVER)
    .option("--out <path>", "Output directory", ".")
    .action((code, opts) => {
      receive(code, opts);
    });

  program.parse(argv);
}
