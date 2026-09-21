# DBC Launch Studio

**Design, simulate, and launch tokens on Meteora's Dynamic Bonding Curve — with an AI copilot and an agent-owned fee treasury.**

> Built for the **Colosseum Crypto World's Fair** hackathon (Meteora DBC side track, and cross-submitted to the RPC Fast / Panta / Solana-data tracks).

---

## The problem

Launching a token on a bonding curve today is a black box. Founders pick parameters they don't understand — curve slope, migration threshold, fee schedule, anti-sniper decay — and find out what they chose only after real money is in the pool. There is no way to *see* the price path your parameters imply, no way to compare presets honestly, and no way to route the fees a launch generates into anything other than a wallet someone has to babysit.

## What it does

**DBC Launch Studio** is a workbench for Meteora dynamic bonding curve (DBC) launches:

1. **Curve designer** — pick a preset (meme / utility / agent) or dial in initial market cap, migration market cap, total supply, fee decay schedule, and migration fee; the studio maps those to a real on-chain DBC `ConfigParameters` via the official SDK's `buildCurveWithMarketCap`.
2. **Simulator** — deterministically simulates the price path and the migration timeline for a given buy/sell flow, so a founder can see the curve they are about to commit to *before* launching. Pure functions, no network.
3. **One-flow launch** — `chain:flow` executes the whole path against any Solana RPC: `createConfig → createPool → buy → sell`, persisting addresses and signatures to `chain/.state.json`.
4. **Pool analytics** — reads live pool state (`quoteReserve`, `migrationQuoteThreshold`, migration progress) and renders it.
5. **AI copilot** — an assistant that turns a plain-language token thesis into a starting parameter set.
6. **Agent treasury** — the config's `feeClaimer` is an **agent-owned vault** (`7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG`), so curve fees accrue to an autonomous treasury rather than a human wallet. This is the piece that makes "an agent that runs on its own token" possible: the agent issues the token, the curve pays the agent.

## Why it matters (a new class of asset)

A bonding curve is a **price discovery machine for something that did not have a market**. If the thing being priced is an *agent's output* — and the fees flow back to that agent's treasury — the curve becomes a funding mechanism for autonomous software. That is a different asset class from a memecoin: the issuer is the product, and the curve is its revenue.

The roadmap item that completes this thesis is the **prediction layer**: pairing every launch with a market on its outcome ("does this token migrate within N days?"). We've scoped the integration against **Panta API** (prediction-market infrastructure) — see `submission/panta.md`. Turn every launch into a two-sided market from block one.

## Architecture

```
app/                    Next.js (App Router) UI
  page.tsx              studio shell: params → simulator → launch → analytics
  api/launch/route.ts   server-side launch endpoint (SDK, server keypair)
  api/pool/[address]/   live pool state reader
components/             ParamPanel, Simulator, PriceCurveChart, LaunchPanel,
                        PoolAnalytics, TreasuryPanel, AiAssistant, ui
lib/
  studio.ts             StudioParams → DBC ConfigParameters (pure)
  simulator.ts          curve/price-path + migration-timeline math (pure)
  assistant.ts          natural-language thesis → parameter suggestions
  constants.ts, format.ts
chain/
  env.ts                RPC/keypair/state plumbing, funding, send+confirm
  run-flow.ts           createConfig → createPool → buy → sell (idempotent)
  probe-config.ts       parameter probe harness used to find valid configs
```

**Meteora integration depth** (the judged dimension): config creation with custom fee-scheduler decay, migration fee option and migration target, pool creation with a fresh base mint, and swaps in both directions (`swapBaseForQuote` true/false), plus `state.getPool` / `getPoolConfig` reads for analytics. All of it goes through the official `@meteora-ag/dynamic-bonding-curve-sdk` — no hand-rolled instruction encoding.

## Verified: the full launch path works

`chain:flow` was executed end-to-end and every transaction was independently re-checked with `solana confirm -v`. Four steps, four confirmed transactions, plus a live pool-state read-back:

| Step | Transaction |
|---|---|
| `createConfig` | `31HPw3CV1RxytWie8yRjozZgCZrZ2FWYQx7BoCKDsjSQXznQmBd3ifcq26g6WrwydRUs1Sh3wP7wGZNbapQDrC7U` |
| `createPool` | `5cDZAp9nZh2xgCUBy4C9CHzSw9VKqt4xpXX1qZ7M7jtQxgpnwKV1Ku22fjui2ogsQjuMDQC7qNfz1WwJKDHmZFZJ` |
| `buy` 0.05 SOL | `2kSrZcCYPZXA4u1NpzfYDFwQFsrvoUi26XfriByytnouFFu2DaEyC4pJfUgFBBKanQyA6GDPpvUVmZApPrQGwgCE` |
| `sell` 50% | `37rQyZVZgxCLrZAVb9oYr3WR7GRj3dAu49RERuvs8iErN4QQ3Vn8UrfRw9SARFwdbpb2MDPSJhBNkLY9qfQHcyfx` |

- config account `2gByRvqusv1iBM397KFTARpoykUU8884PkhTvuW7Wid4`
- pool `7budf1PJZwvX9qpGioHTxZBAXammxXBU966HgFFrbKD2`, base mint `9tEfUMPPEjqZ8SQzMFftiPXHScABDocncFkxowHaNLuh`
- read-back: `quoteReserve = 0.024457 SOL`, `migrationQuoteThreshold = 9.2631 SOL`, migration progress `0.26%`

> **Honest scoping:** these ran on a **local validator running the real DBC program binary** (cloned with `--clone-upgradeable-program`), not on public devnet — public devnet SOL was unobtainable at build time (the devnet faucet was globally dry across every egress we tried). The program executed is byte-identical to mainnet's. See [`VERIFY.md`](./VERIFY.md) for the reproducible commands and the full disclosure.

## Run it

```bash
# 0) deps
npm install

# 1) local validator with the real Meteora DBC program (+ Metaplex)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-test-validator --url https://solana-rpc.publicnode.com \
  --clone-upgradeable-program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN \
  --clone-upgradeable-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  --rpc-port 8901 --reset

# 2) fund the three role wallets (creator / partner / trader)
for k in creator partner trader; do
  solana airdrop 100 "$(solana-keygen pubkey .keys/$k.json)" --url http://127.0.0.1:8901
done

# 3) run the full on-chain flow
DBC_RPC_URL=http://127.0.0.1:8901 npm run chain:flow

# 4) UI
npm run dev     # http://localhost:3000
```

Point `DBC_RPC_URL` at any RPC (`https://api.devnet.solana.com`, or a dedicated provider) to run the identical flow elsewhere. **Only the RPC endpoint changes** — that is deliberate: the data/RPC layer is the seam where RPC Fast, Solami, or Helius drop in (see `submission/rpc-fast.md`, `submission/solana-data.md`).

### Configuration
| Env | Meaning | Default |
|---|---|---|
| `DBC_RPC_URL` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `.keys/{creator,partner,trader}.json` | role keypairs (**git-ignored**) | generated on first run |

No private keys, mnemonics, or API keys are committed. `.keys/`, `.next/`, `node_modules/` and `chain/.state.json` are git-ignored.

## Tech

**Core:** TypeScript · Next.js (App Router) · React · Tailwind · `@meteora-ag/dynamic-bonding-curve-sdk` · `@solana/web3.js` · `@solana/spl-token` · `bn.js`
**Chain tooling:** Solana CLI (Agave) · `solana-test-validator` with `--clone-upgradeable-program` · `tsx`
**AI tooling:** LLM-assisted development and an in-app copilot that maps a token thesis to curve parameters
**Data/infra seams (roadmap, adapter-shaped):** RPC Fast · Solami · Panta API

## Business plan

**Who pays.** Launch fees are already native to DBC — every curve takes a cut of volume. Today that cut goes to a wallet; the studio's differentiator is *where it goes*: an **agent treasury** with programmable spend. Revenue for the studio itself comes from (1) a small share of launch fees on configs created through the studio, (2) a pro tier for teams that want hosted launches, backtesting, and multi-curve management, and (3) treasury tooling for agent issuers — the only segment for which "my token's fees fund my compute" is an operating requirement rather than a gimmick.

**Why now.** DBC makes correct curve configuration a *user-facing* problem, and the tooling for that problem does not exist yet. Every launch is currently bespoke. The studio turns it into a repeatable, simulatable, comparable process — and the agent-token wave (agents that need to fund themselves) is arriving with no launch tooling built for it.

**Go-to-market.** Ship the studio free for single launches → publish preset libraries as public artifacts teams copy → convert multi-launch teams to pro. Distribution through the Meteora builder community and the Colosseum cohort.

## Roadmap

- [x] Curve designer → real `ConfigParameters`
- [x] Deterministic simulator (price path + migration timeline)
- [x] Verified end-to-end launch flow (`createConfig → createPool → buy → sell`)
- [x] Pool analytics + agent treasury panel + AI copilot
- [ ] Public devnet/mainnet launch with an explorer link
- [ ] Panta-powered prediction market per launch
- [ ] RPC Fast / Solami adapters behind a single data-layer interface
- [ ] Multi-curve portfolio view + backtesting on historical launches

## Team

**Nolan Wang** — Solana builder (Hangzhou). Infrastructure and AI-agent tooling; TypeScript/Solana SDKs end-to-end.

## License

MIT — see [`LICENSE`](./LICENSE).
