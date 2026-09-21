# DBC Launch Studio

**Design, simulate, and launch tokens on Meteora's Dynamic Bonding Curve — with an AI copilot and an agent-owned fee treasury.**

> Built for the **Colosseum Crypto World's Fair** hackathon — Meteora DBC track.
> Live on Solana **devnet** with a fully verified on-chain flow (createConfig → createPool → buy → sell).
> Evidence & reproduction: [`../VERIFY.md`](../VERIFY.md).

---

## The problem

Launching a token on a bonding curve today is a black box. Founders pick parameters they don't understand — curve slope, migration threshold, fee schedule, anti-sniper decay — and find out what they chose only after real money is in the pool. There is no way to *see* the price path your parameters imply, no way to compare presets honestly, and no way to route the fees a launch generates into anything other than a wallet someone has to babysit.

## What it does

**DBC Launch Studio** is a workbench for Meteora Dynamic Bonding Curve (DBC) launches:

1. **Curve designer** — pick a preset (meme / utility / agent) or dial in initial market cap, migration market cap, total supply, fee decay schedule, and creator fee share; the studio maps those to a real on-chain DBC `ConfigParameters` via the official SDK's `buildCurveWithMarketCap()`. The same pure function feeds the UI *and* the on-chain scripts — what you simulate is what you deploy.
2. **Trade-flow simulator** — deterministically advances the curve in sqrt-price (Q64.64) space for a given buy/sell sequence: price path, per-trade fee (priced by the anti-sniper exponential schedule), migration progress, and the creator/treasury fee split.
3. **One-click launch** — the UI calls `POST /api/launch`, which performs a real `createConfig` + `createPool` on devnet with server-side role keypairs. Keys never leave the server; only signatures and addresses come back.
4. **Live pool analytics** — reads `getPool()` / `getPoolConfig()`: reserves, current price, migration progress bar, and accrued fees (partner/creator/protocol) — straight from chain.
5. **AI parameter assistant** — turns a plain-language token thesis ("fair meme launch, strong anti-sniper, graduate ~80 SOL") into a concrete parameter set with rationale. Rule-based core, LLM-pluggable.
6. **Agent treasury fee routing** — every config created by the studio sets `feeClaimer` to an **agent-owned vault** (`7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG`). The agent issues the token; the curve pays the agent.

## Why it matters (a new class of asset)

A bonding curve is a **price discovery machine for something that did not have a market**. If the thing being priced is an *agent's output* — and the fees flow back to that agent's treasury — the curve becomes a funding mechanism for autonomous software. That is a different asset class from a memecoin: the issuer is the product, and the curve is its revenue.

## Verified on devnet — full launch path

Executed end-to-end on **public Solana devnet** and independently re-verified with `getTransaction` (all `err: null`):

| Step | Transaction (devnet) |
|---|---|
| `createConfig` | `4VvCjtDnpHKuQes2AzGsy2ZvLWGFxhrdyGQAgTTFiytgMMh2eV7wwrebMCGBBoNqUWHn9FBLtb5R3B5RFUiR5Mth` |
| `createPool` (AGTC) | `57YZMvaQB9UYL9ch2uhZhJqzyNK9sQ4gUkzqvUgvDzpfHVW7Fynbphfrjx8dDdMpQkCydgFQVXtHLQUBidccVXgD` |
| `buy` 0.05 SOL → 24.17M AGTC | `24s1UHrftW8wfr1yE5GkCy7tRvkP7m8PZ2nUgdGKYzoT6aSffxgcduREbbZ3QmDCLjDbcSZ6VFigbndhevqNR6Lw` |
| `sell` 50% of position | `5wp61jYAMM94ckj9HjavnyqYj8e7UgQGR8kZT7t2ajsTBW77fVf99Eop4jiDEXioPtLEKxQUs1hJc81MGe9Vqg3H` |
| UI launch: createConfig (AGTC2) | `39vM54fDV5gzodTMigPypgA3X8fb3GsHVCgH7gn225LRUhTdxTfWewCVenrLwRJDBuB6ibimqdZLUe3x4U1iszFv` |
| UI launch: createPool (AGTC2) | `MfurZzrsq2sp5deoJyt8LC4UiafzaiZdkcT16zXMucHRd5j1HBt1CoVeKubyfNq6Q7Z1USFu5m6wudFE8xFgw94` |

Live addresses: config `CdUmkBrA8s9JUMqg3vm6wYfhTXMSB3pP7dTnLXhnvK7p` · pool `GzRDmC7P2evninsmpfZKcMHucpXqGE5CVqRaD3Kap3sS` · mint `DUPGwtkUyrQW6Piv5UdSTERW6KPWCnQTZT9f9aMN9jNX` · on-chain `feeClaimer` = agent treasury `7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG` (verified via `getPoolConfig`).

Re-verify anytime:

```bash
npm run chain:verify    # re-fetches every signature from devnet, prints slot + err
npm run chain:status    # live pool reserves / migration progress / fee accrual
```

## Architecture

```
app/                    Next.js (App Router) UI
  page.tsx              studio shell: designer → simulator → launch → analytics
  api/launch/route.ts   server-side launch endpoint (SDK, server keypairs)
  api/pool/[address]/   live pool state reader
components/             ParamPanel, PriceCurveChart (hand-rolled SVG), Simulator,
                        LaunchPanel, PoolAnalytics, AiAssistant, TreasuryPanel, ui
lib/
  studio.ts             StudioParams → DBC ConfigParameters (pure, SDK builder)
  simulator.ts          curve/price-path + fee-schedule math (pure)
  assistant.ts          natural-language thesis → parameter suggestions
  constants.ts          treasury address etc.
chain/
  env.ts                RPC/keypair helpers (keys in .keys/, gitignored)
  run-flow.ts           createConfig → createPool → buy → sell (idempotent)
  verify.ts             independent on-chain signature verification
  status.ts             live pool analytics readback
demo-record.mts         Playwright driver used to record demo/demo.mp4
```

**Meteora integration depth**: config creation with exponential fee-scheduler decay, dynamic fees, customizable migration fee and DAMM v2 migration target; pool creation with a fresh base mint; swaps in both directions (`swapBaseForQuote` true/false); `state.getPool` / `getPoolConfig` reads for analytics. All of it goes through the official `@meteora-ag/dynamic-bonding-curve-sdk@1.5.12` — no hand-rolled instruction encoding.

## Run it

```bash
# 0) deps
npm install

# 1) UI
npm run dev          # http://localhost:3000 (set PORT to override)

# 2) on-chain (devnet)
npm run chain:flow   # idempotent: skips steps already recorded in chain/.state.json
npm run chain:verify
npm run chain:status
```

### Configuration

| Env | Meaning | Default |
|---|---|---|
| `DBC_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `PORT` | Next.js dev port | `3000` |
| `.keys/{creator,partner,trader}.json` | role keypairs (**git-ignored**, generated on first run) | — |

Network note: behind restrictive networks, Node 22 needs `NODE_USE_ENV_PROXY=1` with `HTTPS_PROXY` set for RPC access.

**No private keys, mnemonics, or API keys are committed.** `.keys/`, `.next/`, `node_modules/`, `chain/.state.json` are git-ignored.

## Tech

TypeScript · Next.js 15 (App Router) · React 19 · Tailwind · `@meteora-ag/dynamic-bonding-curve-sdk` · `@solana/web3.js` · `@solana/spl-token` · `bn.js` · Playwright (demo recording)

## Business plan

**Who pays.** Launch fees are already native to DBC — every curve takes a cut of volume. Today that cut goes to a wallet; the studio's differentiator is *where it goes*: an **agent treasury** with programmable spend. Revenue for the studio itself comes from (1) a small share of launch fees on configs created through the studio, (2) a pro tier for teams that want hosted launches, backtesting, and multi-curve management, and (3) treasury tooling for agent issuers — the only segment for which "my token's fees fund my compute" is an operating requirement rather than a gimmick.

**Why now.** DBC makes correct curve configuration a *user-facing* problem, and the tooling for that problem does not exist yet. Every launch is currently bespoke. The studio turns it into a repeatable, simulatable, comparable process — and the agent-token wave (agents that need to fund themselves) is arriving with no launch tooling built for it.

**Go-to-market.** Ship the studio free for single launches → publish preset libraries as public artifacts teams copy → convert multi-launch teams to pro. Distribution through the Meteora builder community and the Colosseum cohort.

## Roadmap

- [x] Curve designer → real `ConfigParameters`
- [x] Deterministic simulator (price path + fee schedule + migration progress)
- [x] Verified end-to-end devnet launch flow (`createConfig → createPool → buy → sell`)
- [x] One-click launch from the UI (real devnet transactions)
- [x] Pool analytics + agent treasury panel + AI copilot
- [ ] Mainnet launch (needs SOL gas on the treasury wallet)
- [ ] Fee claiming automation for the agent treasury
- [ ] Multi-curve portfolio view + backtesting on historical launches

## Team

**Nolan Wang** — Solana builder (Hangzhou). Infrastructure and AI-agent tooling; TypeScript/Solana SDKs end-to-end.

## License

MIT.
