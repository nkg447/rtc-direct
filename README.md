# rtc-direct

Peer-to-peer file transfer over WebRTC. Like [croc](https://github.com/schollz/croc), but using WebRTC data channels for direct P2P connections.

Data flows directly between peers — the signaling server is only used for the initial handshake.

## Usage

### Send a file

```bash
npx rtc-direct send photo.jpg
```

```
Sending photo.jpg (2.4 MB)
Code: 7a3f-blue-river

On the other machine, run:
  npx rtc-direct receive 7a3f-blue-river
```

### Receive a file

```bash
npx rtc-direct receive 7a3f-blue-river
```

```
Connecting with code: 7a3f-blue-river
Waiting for sender...

Connected to peer!
Receiving photo.jpg (2.4 MB)
[████████████████████████] 100% | done
Done! Saved to ./photo.jpg
```

## Options

```
rtc-direct send <file> [--server <url>]
rtc-direct receive <code> [--server <url>] [--out <path>]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--server <url>` | Signaling server URL | `https://signallite.nikunjgupta.dev` |
| `--out <path>` | Output directory (receive only) | `.` |

## How it works

1. **Sender** generates a short transfer code and waits for a peer
2. **Receiver** connects using the same code
3. [signallite](https://github.com/nkg447/signallite) handles the WebRTC signaling (SDP offer/answer + ICE candidates)
4. A direct peer-to-peer data channel is established
5. The file is streamed in 16KB chunks with flow control
6. The signaling server disconnects once peers are connected — all data flows directly

## Self-hosting the signaling server

You can run your own signaling server:

```bash
npx @nkg447/signallite
```

Then point both peers to it:

```bash
npx rtc-direct send file.txt --server http://your-server:3000
npx rtc-direct receive <code> --server http://your-server:3000
```

## License

MIT
