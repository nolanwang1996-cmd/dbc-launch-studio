# Demo media

| File | Length | Purpose |
|---|---|---|
| `demo-1min.mp4` | 1:04 | Colosseum weekly update / short cut |
| `demo-3min.mp4` | 2:16 | Full walkthrough for the track submissions |
| `app-main.png` | — | Studio UI: curve designer, bonding curve, trade-flow simulator, fee routing |
| `app-full.png` | — | Full-page capture (AI assistant, agent treasury, deployment panels) |

**What the video shows (all real artifacts, no mock-ups):**
1. Title + problem framing
2. The five-part product (design → simulate → launch → treasury → copilot)
3. Terminal: the verified `chain:flow` run — `createConfig → createPool → buy → sell`, with the transaction lines as emitted
4. The running Next.js studio (headless Chrome capture of `localhost:3000`)
5. Closing: verified-on-chain summary and the agent-treasury thesis

The terminal footage is the captured stdout of the real flow (`flow-output.txt`), and the UI frames are
real screenshots of the app served by `npm run dev`. Screen-recording APIs are unavailable in the build
environment (macOS screen-capture permission is denied to the build process), so the video is composed
from genuine captures rather than a live desktop recording — the underlying artifacts are unmodified.
