/**
 * Integration layer — pluggable seams for cross-track reuse.
 *
 * These are deliberately small, honest interfaces:
 *  - RpcProvider: the studio's RPC endpoint is already env-switchable
 *    (DBC_RPC_URL / RPC_URL / ANCHOR_PROVIDER_URL). RPC Fast slots in here.
 *  - DataAdapter: pool-state reads today go through the Meteora SDK's
 *    StateService; a Solami-backed adapter can implement the same surface.
 *  - PredictionMarketAdapter: every launch can be paired with a prediction
 *    market on its outcome (e.g. "migrates within 7 days") via Panta API
 *    (docs.panta.market). A real client exists in lib/panta.ts and is
 *    live-tested (chain/panta-check.ts; VERIFY.md §四) with a pk_test_ key —
 *    settlement condition references the pool's own on-chain migration state.
 */

export interface RpcProviderSpec {
    id: 'public-devnet' | 'public-mainnet' | 'rpc-fast' | 'local-validator'
    /** endpoint URL; for rpc-fast this is the RPC Fast endpoint with its key */
    url: string
    notes?: string
}

export const RPC_PROVIDERS: RpcProviderSpec[] = [
    {
        id: 'public-devnet',
        url: 'https://api.devnet.solana.com',
        notes: 'default; used for the verified launch flow',
    },
    {
        id: 'rpc-fast',
        url: process.env.RPC_FAST_URL || '',
        notes: 'RPC Fast (Solana RPC/gRPC, free tier 50 rps) — drop-in via env',
    },
    {
        id: 'public-mainnet',
        url: 'https://solana-rpc.publicnode.com',
        notes: 'mainnet launches once treasury has SOL gas',
    },
]

export interface PoolSnapshot {
    poolAddress: string
    quoteReserveSol: number
    baseReserveTokens: number
    migrationThresholdSol: number
    progressPct: number
    priceSol: number
}

/** Data plane for pool analytics. Solami is the planned backend. */
export interface DataAdapter {
    id: 'meteora-sdk' | 'solami'
    getPoolSnapshot(poolAddress: string): Promise<PoolSnapshot>
}

/** Prediction market paired with a launch. Panta API is the planned backend. */
export interface PredictionMarketAdapter {
    id: 'panta' | 'mock'
    /** create a market like "will <mint> migrate within N days?" */
    createLaunchMarket(input: {
        baseMint: string
        question: string
        resolveAfterSeconds: number
    }): Promise<{ marketId: string; url?: string }>
}

/** No-op default so the UI can render the integration without an API key. */
export const mockPredictionAdapter: PredictionMarketAdapter = {
    id: 'mock',
    async createLaunchMarket(input) {
        return {
            marketId: `mock:${input.baseMint.slice(0, 8)}`,
            url: undefined,
        }
    },
}
