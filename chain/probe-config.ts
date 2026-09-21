/**
 * Probe: find a createConfig parameter set that the DBC program accepts.
 * Tries several initialMarketCap / supply combinations against a local validator.
 * Run: DBC_RPC_URL=http://127.0.0.1:8901 npx tsx chain/probe-config.ts
 */
import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import {
    buildCurveWithMarketCap,
    DynamicBondingCurveClient,
    TokenType,
    TokenDecimal,
    TokenAuthorityOption,
    BaseFeeMode,
    CollectFeeMode,
    MigrationOption,
    ActivationType,
    MigrationFeeOption,
    MigratedCollectFeeMode,
    DammV2DynamicFeeMode,
    DammV2BaseFeeMode,
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { readFileSync } from 'fs'
import { Connection } from '@solana/web3.js'

const RPC = process.env.DBC_RPC_URL || 'http://127.0.0.1:8901'
const FEE_CLAIMER = new PublicKey('7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG')

function kp(name: string): Keypair {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`.keys/${name}.json`, 'utf8'))))
}

function build(initialMarketCap: number, migrationMarketCap: number, supply: number) {
    const base = buildCurveWithMarketCap({
        token: {
            tokenType: TokenType.SPLToken,
            tokenBaseDecimal: TokenDecimal.SIX,
            tokenQuoteDecimal: TokenDecimal.NINE,
            tokenAuthorityOption: TokenAuthorityOption.PartnerUpdateAuthority,
            totalTokenSupply: supply,
            leftover: 0,
        },
        fee: {
            baseFeeParams: {
                baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
                feeSchedulerParam: {
                    startingFeeBps: 500,
                    endingFeeBps: 100,
                    numberOfPeriod: 30,
                    totalDuration: 30,
                },
            },
            dynamicFeeEnabled: true,
            collectFeeMode: CollectFeeMode.QuoteToken,
            creatorTradingFeePercentage: 50,
            poolCreationFee: 0,
            enableFirstSwapWithMinFee: false,
        },
        migration: {
            migrationOption: MigrationOption.MET_DAMM_V2,
            migrationFeeOption: MigrationFeeOption.Customizable,
            migrationFee: { feePercentage: 1, creatorFeePercentage: 50 },
            migratedPoolFee: {
                collectFeeMode: MigratedCollectFeeMode.QuoteToken,
                dynamicFee: DammV2DynamicFeeMode.Enabled,
                poolFeeBps: 100,
                baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
            },
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
        initialMarketCap,
        migrationMarketCap,
    } as any)
    return { ...base, activationType: ActivationType.Timestamp } as any
}

async function main() {
    const conn = new Connection(RPC, 'confirmed')
    const client = DynamicBondingCurveClient.create(conn, 'confirmed')
    const partner = kp('partner')

    const cases: Array<[number, number, number]> = [
        [1, 85, 1_000_000_000],
        [5, 85, 1_000_000_000],
        [30, 300, 1_000_000_000],
        [100, 1000, 1_000_000_000],
        [1, 85, 100_000_000],
        [10, 120, 100_000_000],
    ]

    for (const [imc, mmc, supply] of cases) {
        const label = `imc=${imc} mmc=${mmc} supply=${supply}`
        try {
            const cfg = build(imc, mmc, supply)
            const config = Keypair.generate()
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
            console.log(`✅ PASS  ${label}\n    config=${config.publicKey.toBase58()}\n    tx=${sig}`)
        } catch (e: any) {
            const msg = String(e?.message || e).replace(/\s+/g, ' ').slice(0, 260)
            console.log(`❌ FAIL  ${label}\n    ${msg}`)
        }
    }
}

main()
