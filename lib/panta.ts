/**
 * lib/panta.ts — real Panta API client (docs.panta.market).
 *
 * Panta is binary YES/NO prediction-market infrastructure on Solana:
 * the API returns unsigned transactions, the wallet signs, we broadcast.
 * This client implements the read/quote surface the studio uses; key comes
 * from the PANTA_API_KEY env var (never committed).
 *
 * Live-tested 2026-09-22 with a pk_test_ key: whoami / markets list /
 * market-create quote (see VERIFY.md §四 and chain/panta-check.ts).
 */

export const PANTA_BASE_URL = 'https://live-api.panta.market/api/v1'

export interface PantaAccount {
    userId: string
    email: string
    name: string
    status: string
    canCreateMarkets: boolean
    apiKeyId: string
    disclaimer?: string
}

export interface PantaMarketSummary {
    marketId: string
    title: string
    phase: string
    yesPrice: string
    noPrice: string
    volumeUsdc: string
}

export interface PantaCreateQuote {
    createId: string
    expectedEventPda: string
    paymentUsdc: string // base units (6 decimals)
    liquidityInjectionUsdc: string
    platformRevenueUsdc: string
    expiresAt: string
    disclaimer?: string
}

export interface LaunchMarketInput {
    /** market creator wallet (receives creator fees after graduation) */
    wallet: string
    /** e.g. "Will DBC pool <address> reach its migration threshold within 7 days of creation?" */
    question: string
    title: string
    description: string
    /** objective settlement rule — for us: on-chain quoteReserve >= migrationQuoteThreshold */
    resolutionRule: string
    sourcesOfTruth: string[]
    imageUrl: string
    startTime: number // unix seconds
    endTime: number
    resolutionTime: number
}

function key(): string {
    const k = process.env.PANTA_API_KEY
    if (!k) throw new Error('PANTA_API_KEY env var is not set')
    return k
}

async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${PANTA_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Api-Key': key() },
        body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(`Panta ${path} -> ${res.status}: ${JSON.stringify(json)}`)
    return json as T
}

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${PANTA_BASE_URL}${path}`, {
        headers: { 'X-Api-Key': key() },
    })
    const json = await res.json()
    if (!res.ok) throw new Error(`Panta ${path} -> ${res.status}: ${JSON.stringify(json)}`)
    return json as T
}

/** GET /account/ — verify the key and account status. */
export function whoami(): Promise<PantaAccount> {
    return get<PantaAccount>('/account/')
}

/** GET /markets/ — browse the market catalog. */
export async function listMarkets(): Promise<PantaMarketSummary[]> {
    const json = await get<{ items: PantaMarketSummary[] }>('/markets/')
    return json.items
}

/**
 * POST /markets/create/quote/ — reserve a create session and learn the USDC
 * creation fee for a launch-outcome market paired with a DBC pool.
 */
export function quoteLaunchMarket(input: LaunchMarketInput): Promise<PantaCreateQuote> {
    return post<PantaCreateQuote>('/markets/create/quote/', {
        ...input,
        category: 'crypto',
        marketType: 'standard',
        region: 'Global',
    })
}
