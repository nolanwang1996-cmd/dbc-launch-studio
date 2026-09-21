/**
 * GET /api/pool/[address]
 * Reads live on-chain pool state (getPool + getPoolConfig) and returns
 * reserves, migration progress, current price and accumulated fees.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { connection } from '@/chain/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TWO_POW_64 = 2 ** 64

function bnToNumber(v: any): number {
    if (v == null) return 0
    try {
        return Number(v.toString())
    } catch {
        return 0
    }
}

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ address: string }> }
) {
    const { address } = await ctx.params
    try {
        new PublicKey(address) // validates base58
    } catch {
        return NextResponse.json(
            { error: 'Invalid pool address' },
            { status: 400 }
        )
    }

    try {
        const conn = connection()
        const client = DynamicBondingCurveClient.create(conn, 'confirmed')

        const raw: any = await client.state.getPool(new PublicKey(address))
        if (!raw) {
            return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
        }
        // SDK returns the account wrapper: { poolState: {...} }
        const pool: any = raw.poolState ?? raw
        const config: any = await client.state.getPoolConfig(
            new PublicKey(pool.config?.toBase58?.() ?? String(pool.config))
        )
        if (!config) {
            return NextResponse.json(
                { error: 'Pool config not found' },
                { status: 404 }
            )
        }

        const baseDec = Number(config.tokenDecimal ?? 6)
        const quoteDec = 9 // SOL

        const quoteReserveSol = bnToNumber(pool.quoteReserve) / 10 ** quoteDec
        const baseReserveTokens = bnToNumber(pool.baseReserve) / 10 ** baseDec
        const thresholdSol =
            bnToNumber(config.migrationQuoteThreshold) / 10 ** quoteDec

        const sqrt = bnToNumber(pool.sqrtPrice) / TWO_POW_64
        const priceSol = sqrt * sqrt * 10 ** (baseDec - quoteDec)

        return NextResponse.json({
            address,
            config: pool.config?.toBase58?.() ?? String(pool.config),
            baseMint: pool.baseMint?.toBase58?.() ?? String(pool.baseMint),
            creator: pool.creator?.toBase58?.() ?? String(pool.creator),
            quoteReserveSol,
            baseReserveTokens,
            thresholdSol,
            progressPct:
                thresholdSol > 0 ? (quoteReserveSol / thresholdSol) * 100 : 0,
            priceSol,
            sqrtPrice: pool.sqrtPrice?.toString?.() ?? '0',
            isMigrated: Boolean(pool.isMigrated),
            migrationProgress: Number(pool.migrationProgress ?? 0),
            fees: {
                partnerQuoteSol: bnToNumber(pool.partnerQuoteFee) / 10 ** quoteDec,
                creatorQuoteSol: bnToNumber(pool.creatorQuoteFee) / 10 ** quoteDec,
                protocolQuoteSol:
                    bnToNumber(pool.protocolQuoteFee) / 10 ** quoteDec,
            },
        })
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message || 'failed to load pool' },
            { status: 500 }
        )
    }
}
