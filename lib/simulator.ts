/**
 * Client-side pure simulator for a single-segment constant-product
 * Meteora DBC curve, derived from the exact `ConfigParameters` produced by
 * `buildStudioConfig()` — so what you simulate is what you deploy.
 *
 * Math (sqrt-price space, Q64.64 decoded to plain numbers):
 *   P0 = sqrtStartPrice / 2^64          (start sqrt price)
 *   P1 = curve[0].sqrtPrice / 2^64      (migration sqrt price)
 *   L  = curve[0].liquidity / 2^64      (constant liquidity, raw-token units)
 *
 *   soldBase(p)   = L * (1/P0 - 1/p)    (raw base units)
 *   raisedQuote(p)= L * (p - P0)        (raw quote lamports)
 *   price(p)      = p^2 * 10^(baseDec - quoteDec)   (SOL per token)
 *
 * Buy  Δq quote (net of fee):  p' = p + Δq*1e9 / L
 * Sell Δs base  (raw units):   p' = 1 / (1/p + Δs / L)
 */
import type { ConfigParameters } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { buildStudioConfig, type StudioParams } from './studio'

const TWO_POW_64 = 2 ** 64
const QUOTE_DECIMAL = 9 // SOL

export interface CurveModel {
    /** start sqrt price (decoded from Q64.64) */
    P0: number
    /** migration sqrt price */
    P1: number
    /** constant-product liquidity (decoded, raw token units) */
    L: number
    /** migration quote threshold in SOL */
    thresholdSol: number
    baseDecimal: number
    quoteDecimal: number
    totalSupply: number
    /** the underlying on-chain config, for reference / launch */
    config: ConfigParameters
}

/** Build the exact on-chain config and decode it into a numeric curve model. */
export function buildCurveModel(params: StudioParams): CurveModel {
    const config = buildStudioConfig(params)
    const P0 = Number(config.sqrtStartPrice.toString()) / TWO_POW_64
    // Single-segment curve: curve[0] is the migration segment; curve[1] (when
    // present) is the leftover bucket with a near-max sqrt price.
    const seg = config.curve[0]
    const P1 = Number(seg.sqrtPrice.toString()) / TWO_POW_64
    const L = Number(seg.liquidity.toString()) / TWO_POW_64
    const thresholdSol =
        Number(config.migrationQuoteThreshold.toString()) / 10 ** QUOTE_DECIMAL
    return {
        P0,
        P1,
        L,
        thresholdSol,
        baseDecimal: params.tokenBaseDecimal,
        quoteDecimal: QUOTE_DECIMAL,
        totalSupply: params.totalTokenSupply,
        config,
    }
}

/** Spot price in SOL per whole token at sqrt price p. */
export function priceAt(m: CurveModel, p: number): number {
    return p * p * 10 ** (m.baseDecimal - m.quoteDecimal)
}

/** Whole tokens sold once sqrt price reaches p. */
export function soldAt(m: CurveModel, p: number): number {
    return (m.L * (1 / m.P0 - 1 / p)) / 10 ** m.baseDecimal
}

/** SOL raised (in the pool) once sqrt price reaches p. */
export function quoteAt(m: CurveModel, p: number): number {
    return (m.L * (p - m.P0)) / 10 ** m.quoteDecimal
}

export interface CurvePoint {
    /** fraction of the migration-segment supply sold, 0..1 */
    soldFrac: number
    price: number
    p: number
}

/** Sample the price curve from P0 to P1 for charting. */
export function sampleCurve(m: CurveModel, n = 160): CurvePoint[] {
    const maxSold = soldAt(m, m.P1)
    const pts: CurvePoint[] = []
    for (let i = 0; i <= n; i++) {
        const p = m.P0 + ((m.P1 - m.P0) * i) / n
        pts.push({
            soldFrac: maxSold > 0 ? soldAt(m, p) / maxSold : 0,
            price: priceAt(m, p),
            p,
        })
    }
    return pts
}

/**
 * Estimated anti-sniper fee (bps) t seconds after activation.
 * Mirrors the SDK's FeeSchedulerExponential: `numberOfPeriod` periods of
 * `totalDuration/numberOfPeriod` seconds, multiplicative decay reaching
 * `endingFeeBps` at the last period. Approximation — good enough for
 * simulation, exact scheduling happens on-chain.
 */
export function feeBpsAt(params: StudioParams, tSeconds: number): number {
    const start = params.startingFeeBps
    const end = params.endingFeeBps
    if (start <= end || tSeconds >= params.feeDurationSeconds) return end
    if (tSeconds <= 0) return start
    const periods = Math.max(1, Math.min(60, Math.round(params.feeDurationSeconds)))
    const periodSeconds = params.feeDurationSeconds / periods
    const k = Math.min(periods, Math.floor(tSeconds / periodSeconds))
    const r = Math.pow(end / start, 1 / periods)
    return Math.max(end, start * Math.pow(r, k))
}

export interface SimTradeInput {
    side: 'buy' | 'sell'
    /** SOL for buys, whole tokens for sells */
    amount: number
    /** seconds since launch when the trade hits */
    t: number
}

export interface SimTradeResult extends SimTradeInput {
    feeBps: number
    feeSol: number
    /** tokens received (buy) or SOL received (sell), net of fee */
    received: number
    pAfter: number
    priceAfter: number
    soldAfter: number
    quoteAfter: number
    progressAfter: number // quoteAfter / thresholdSol
    migrated: boolean
    rejected?: string
}

export interface SimSummary {
    trades: SimTradeResult[]
    finalPrice: number
    finalP: number
    quoteRaised: number
    tokensSold: number
    progress: number
    migrated: boolean
    totalFeesSol: number
    creatorFeesSol: number
    vaultFeesSol: number
}

/**
 * Run a sequence of trades against the curve, advancing p trade by trade.
 * Buys that would push past the migration price are clipped at P1 (the pool
 * graduates; excess demand is out of scope for this simulator).
 */
export function simulateTrades(
    m: CurveModel,
    params: StudioParams,
    inputs: SimTradeInput[]
): SimSummary {
    let p = m.P0
    let totalFees = 0
    let migrated = false
    const trades: SimTradeResult[] = []

    for (const input of inputs) {
        const feeBps = feeBpsAt(params, input.t)
        const feeRate = feeBps / 10_000
        const mk = (over: Partial<SimTradeResult>): SimTradeResult => ({
            ...input,
            feeBps,
            feeSol: 0,
            received: 0,
            pAfter: p,
            priceAfter: priceAt(m, p),
            soldAfter: soldAt(m, p),
            quoteAfter: quoteAt(m, p),
            progressAfter: m.thresholdSol > 0 ? quoteAt(m, p) / m.thresholdSol : 0,
            migrated,
            ...over,
        })

        if (migrated) {
            trades.push(mk({ rejected: 'Pool already migrated to DAMM v2' }))
            continue
        }
        if (!(input.amount > 0)) {
            trades.push(mk({ rejected: 'Amount must be positive' }))
            continue
        }

        if (input.side === 'buy') {
            const feeSol = input.amount * feeRate
            const netQuote = input.amount - feeSol
            let pNew = p + (netQuote * 10 ** m.quoteDecimal) / m.L
            if (pNew >= m.P1) {
                pNew = m.P1
                migrated = true
            }
            const tokensOut = (m.L * (1 / p - 1 / pNew)) / 10 ** m.baseDecimal
            totalFees += feeSol
            p = pNew
            trades.push(mk({ feeSol, received: tokensOut, migrated }))
        } else {
            const baseRaw = input.amount * 10 ** m.baseDecimal
            const pNew = 1 / (1 / p + baseRaw / m.L)
            if (pNew < m.P0) {
                trades.push(mk({ rejected: 'Sell exceeds tokens in circulation' }))
                continue
            }
            const grossQuote = (m.L * (p - pNew)) / 10 ** m.quoteDecimal
            const feeSol = grossQuote * feeRate
            totalFees += feeSol
            p = pNew
            trades.push(mk({ feeSol, received: grossQuote - feeSol }))
        }
    }

    const creatorPct = params.creatorTradingFeePercentage / 100
    return {
        trades,
        finalPrice: priceAt(m, p),
        finalP: p,
        quoteRaised: quoteAt(m, p),
        tokensSold: soldAt(m, p),
        progress: m.thresholdSol > 0 ? quoteAt(m, p) / m.thresholdSol : 0,
        migrated,
        totalFeesSol: totalFees,
        creatorFeesSol: totalFees * creatorPct,
        vaultFeesSol: totalFees * (1 - creatorPct),
    }
}
