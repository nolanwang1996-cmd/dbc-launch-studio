/**
 * POST /api/launch
 * One-click devnet launch: createConfig (feeClaimer = agent treasury vault)
 * followed by createPool, using the studio's local partner/creator keypairs.
 *
 * Security notes:
 *  - Keypairs stay server-side in .keys/ via chain/env.ts (loadOrCreateKeypair);
 *    no secret material is ever logged or returned.
 *  - chain/.state.json is intentionally NOT touched by this route.
 *  - RPC: process.env.DBC_RPC_URL ?? https://api.devnet.solana.com
 */
import { NextRequest, NextResponse } from 'next/server'
import { Keypair, PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import {
    deriveDbcPoolAddress,
    DynamicBondingCurveClient,
    TokenAuthorityOption,
    TokenDecimal,
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import {
    connection,
    explorerAddr,
    explorerTx,
    FEE_CLAIMER_ADDRESS,
    fundWithAirdrop,
    loadOrCreateKeypair,
    sendAndConfirm,
} from '@/chain/env'
import { buildStudioConfig, type StudioParams } from '@/lib/studio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clamp(v: unknown, min: number, max: number, fallback: number): number {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.max(min, Math.min(max, n))
}

function sanitizeParams(raw: any): StudioParams {
    const allowedAuthority = [
        TokenAuthorityOption.CreatorUpdateAuthority,
        TokenAuthorityOption.Immutable,
        TokenAuthorityOption.PartnerUpdateAuthority,
        TokenAuthorityOption.CreatorUpdateAndMintAuthority,
    ]
    const authority = allowedAuthority.includes(raw?.tokenAuthorityOption)
        ? raw.tokenAuthorityOption
        : TokenAuthorityOption.PartnerUpdateAuthority
    return {
        totalTokenSupply: Math.round(clamp(raw?.totalTokenSupply, 1_000, 1e12, 1e9)),
        tokenBaseDecimal: TokenDecimal.SIX,
        initialMarketCap: clamp(raw?.initialMarketCap, 0.01, 100_000, 1),
        migrationMarketCap: clamp(raw?.migrationMarketCap, 1, 1_000_000, 85),
        startingFeeBps: Math.round(clamp(raw?.startingFeeBps, 0, 9_900, 500)),
        endingFeeBps: Math.round(clamp(raw?.endingFeeBps, 0, 2_000, 100)),
        feeDurationSeconds: Math.round(clamp(raw?.feeDurationSeconds, 1, 3_600, 60)),
        creatorTradingFeePercentage: Math.round(
            clamp(raw?.creatorTradingFeePercentage, 0, 100, 50)
        ),
        partnerPermanentLockedLiquidityPercentage: Math.round(
            clamp(raw?.partnerPermanentLockedLiquidityPercentage, 0, 100, 100)
        ),
        creatorPermanentLockedLiquidityPercentage: Math.round(
            clamp(raw?.creatorPermanentLockedLiquidityPercentage, 0, 100, 0)
        ),
        tokenAuthorityOption: authority,
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const name = String(body?.name ?? '').trim().slice(0, 64)
        const symbol = String(body?.symbol ?? '').trim().slice(0, 10).toUpperCase()
        if (!name || !symbol) {
            return NextResponse.json(
                { error: 'Token name and symbol are required' },
                { status: 400 }
            )
        }
        const params = sanitizeParams(body?.params)
        if (params.migrationMarketCap <= params.initialMarketCap) {
            return NextResponse.json(
                { error: 'migrationMarketCap must exceed initialMarketCap' },
                { status: 400 }
            )
        }

        const conn = connection() // DBC_RPC_URL ?? https://api.devnet.solana.com
        const client = DynamicBondingCurveClient.create(conn, 'confirmed')
        const partner = loadOrCreateKeypair('partner')
        const creator = loadOrCreateKeypair('creator')

        // devnet funding (no-op when already funded)
        await fundWithAirdrop(conn, partner, 1)
        await fundWithAirdrop(conn, creator, 1)

        // --- createConfig --------------------------------------------------
        const curveConfig = buildStudioConfig(params)
        const config = Keypair.generate()
        const cfgTx = await client.partner.createConfig({
            config: config.publicKey,
            feeClaimer: new PublicKey(FEE_CLAIMER_ADDRESS), // agent treasury vault
            leftoverReceiver: partner.publicKey,
            payer: partner.publicKey,
            quoteMint: NATIVE_MINT,
            ...curveConfig,
        })
        cfgTx.feePayer = partner.publicKey
        const createConfigTx = await sendAndConfirm(conn, cfgTx, [partner, config])

        // --- createPool -----------------------------------------------------
        const baseMint = Keypair.generate()
        const poolTx = await client.creator.createPool({
            baseMint: baseMint.publicKey,
            config: config.publicKey,
            name,
            symbol,
            uri: 'https://arweave.net/placeholder-dbc-launch-studio',
            payer: creator.publicKey,
            poolCreator: creator.publicKey,
        })
        poolTx.feePayer = creator.publicKey
        const createPoolTx = await sendAndConfirm(conn, poolTx, [baseMint, creator])

        const poolAddress = deriveDbcPoolAddress(
            NATIVE_MINT,
            baseMint.publicKey,
            config.publicKey
        ).toBase58()

        return NextResponse.json({
            configAddress: config.publicKey.toBase58(),
            poolAddress,
            baseMint: baseMint.publicKey.toBase58(),
            createConfigTx,
            createPoolTx,
            rpc: conn.rpcEndpoint,
            explorer: {
                config: explorerAddr(config.publicKey.toBase58()),
                pool: explorerAddr(poolAddress),
                mint: explorerAddr(baseMint.publicKey.toBase58()),
                createConfigTx: explorerTx(createConfigTx),
                createPoolTx: explorerTx(createPoolTx),
            },
        })
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message || 'launch failed' },
            { status: 500 }
        )
    }
}
