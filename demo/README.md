# Demo media

| File | Length | Purpose |
|---|---|---|
| `demo-1min.mp4` | 1:02 | Colosseum weekly update / short cut |
| `demo-3min.mp4` | 2:00 | Full walkthrough for the track submissions |
| `demo-pitch.mp4` | 0:44 | Pitch-only cut (narrative, no UI walkthrough) |
| `app-main.png` | — | Studio UI: curve designer, bonding curve, trade-flow simulator, fee routing |
| `app-full.png` | — | Full-page capture (AI assistant, agent treasury, deployment panels) |

**What the main videos show (real artifacts, no mock-ups):**

1. Title + product framing
2. Curve designer + preset switching (meme / utility / agent)
3. Trade-flow simulator: buys and a sell advance the curve, with per-trade fees and
   the creator/treasury split
4. AI parameter assistant: natural-language thesis → parameters → apply
5. **A real one-click launch on public Solana devnet** (createConfig + createPool,
   signatures shown on screen — independently verifiable, see `../VERIFY.md`)
6. Live pool analytics read from chain: reserves, price, migration progress, fee split
7. Closing: agent-treasury thesis

The main video was recorded by driving the actual Next.js app with Playwright
(`../demo-record.mts`) and narrated with an English voiceover. Every on-chain action
shown landed on **public devnet** (signatures in `../VERIFY.md`; the UI launch shown
in the video is the AGTC3 pool `72hqXyaeMAmKb98XS5qo2EyZHGgBqVDxKsDBX6bKnxDY`).
