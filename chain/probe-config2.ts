/**
 * Probe v2: use the SDK's own known-good base params (from buildCurveWithMarketCap.test.ts)
 * and create a config on the local validator.
 * Run: DBC_RPC_URL=http://127.0.0.1:8901 npx tsx chain/probe-config2.ts
 */
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { readFileSync } from 'fs'
import {
    ActivationType,
    BaseFeeMode,
    buildCurveWithMarketCap,
    CollectFeeMode,
    DynamicBondingCurveClient,
    MigrationFeeOption,
    MigrationOption,
    TokenAuthorityOption,
    TokenDecimal,
    TokenType,
} from '@meteora-ag/dynamic-bonding-curve-sdk'

const RPC = process.env.DBC_RPC_URL || 'http://127.0.0.1:8901'
const FEE_CLAIMER = new PublicKey('7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG')

const partner = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync('.keys/partner.json', 'utf8')))
)

function buildBase(overrides: Record<string, unknown> = {}) {
    return buildCurveWithMarketCap({
        token: {
            tokenType: TokenType.SPLToken,
            tokenBaseDecimal: TokenDecimal.SIX,
            tokenQuoteDecimal: TokenDecimal.NINE,
            tokenAuthorityOption: TokenAuthorityOption.Immutable,
            totalTokenSupply: 1_000_000_000,
            leftover: 10000,
        },
        fee: {
            baseFeeParams: {
                baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
                feeSchedulerParam: {
                    startingFeeBps: 100,
                    endingFeeBps: 100,
                    numberOfPeriod: 0,
                    totalDuration: 0,
                },
            },
            dynamicFeeEnabled: true,
            collectFeeMode: CollectFeeMode.QuoteToken,
            creatorTradingFeePercentage: 0,
            poolCreationFee: 1,
            enableFirstSwapWithMinFee: false,
        },
        migration: {
            migrationOption: MigrationOption.MET_DAMM_V2,
            migrationFeeOption: MigrationFeeOption.FixedBps100,
            migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
        },
        liquidityDistribution: {
            partnerLiquidityPercentage: 0,
            partnerPermanentLockedLiquidityPercentage: 100,
            creatorLiquidityPercentage: 0,
            creatorPermanentLockedLiquidityPercentage: 0,
        },
        lockedVesting: {
            totalLockedVestingAmount: 0,
            numberOfVestingPeriod: 0,
            cliffUnlockAmount: 0,
            totalVestingDuration: 0,
            cliffDurationFromMigrationTime: 0,
        },
        activationType: ActivationType.Slot,
        initialMarketCap: 23.5,
        migrationMarketCap: 405.882352941,
        ...overrides,
    } as any)
}

async function tryCreate(label: string, cfg: any) {
    const conn = new Connection(RPC, 'confirmed')
    const client = DynamicBondingCurveClient.create(conn, 'confirmed')
    const config = Keypair.generate()
    try {
        const tx: Transaction = await (client.partner as any).createConfig({
            config: config.publicKey,
            feeClaimer: FEE_CLAIMER,
            leftoverReceiver: partner.publicKey,
            payer: partner.publicKey,
            quoteMint: NATIVE_MINT,
            ...cfg,
        })
        tx.feePayer = partner.publicKey
        const sig = await sendAndConfirmTransaction(conn, tx, [partner, config], { commitment: 'confirmed' })
        console.log(`✅ PASS ${label}\n   config=${config.publicKey.toBase58()}\n   tx=${sig}`)
        return true
    } catch (e: any) {
        const m = String(e?.message || e).replace(/\s+/g, ' ')
        const code = m.match(/Error Code: (\w+)\. Error Number: (\d+)\. Error Message: ([^"]+)/)
        console.log(`❌ FAIL ${label}\n   ${code ? code[1] + ' / ' + code[3] : m.slice(0, 200)}`)
        return false
    }
}

async function main() {
    console.log('RPC:', RPC)
    await tryCreate('SDK test params verbatim (Slot, leftover=10000)', buildBase())
    await tryCreate('+ Timestamp activation', buildBase({ activationType: ActivationType.Timestamp }))
    await tryCreate('+ PartnerUpdateAuthority', buildBase({ tokenAuthorityOption: TokenAuthorityOption.PartnerUpdateAuthority, activationType: ActivationType.Timestamp }))
}

main()
