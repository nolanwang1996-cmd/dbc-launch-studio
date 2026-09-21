/**
 * DBC Launch Studio — shared studio parameter model, presets and the
 * single source of truth that maps studio parameters to a Meteora DBC
 * `ConfigParameters` via the official SDK's `buildCurveWithMarketCap`.
 *
 * Used by BOTH the on-chain scripts (chain/) and the frontend simulator
 * (app/), so what you simulate is byte-identical to what gets deployed.
 */
import {
    ActivationType,
    BaseFeeMode,
    buildCurveWithMarketCap,
    CollectFeeMode,
    DammV2BaseFeeMode,
    DammV2DynamicFeeMode,
    MigratedCollectFeeMode,
    MigrationFeeOption,
    MigrationOption,
    TokenAuthorityOption,
    TokenDecimal,
    TokenType,
    type ConfigParameters,
} from '@meteora-ag/dynamic-bonding-curve-sdk'

export interface StudioParams {
    totalTokenSupply: number // in whole tokens
    tokenBaseDecimal: number
    /** market cap denominated in quote token (SOL) */
    initialMarketCap: number
    /** market cap (quote token) at which the pool migrates to DAMM v2 */
    migrationMarketCap: number
    /** anti-sniper fee scheduler */
    startingFeeBps: number
    endingFeeBps: number
    feeDurationSeconds: number
    /** 0-100: share of trading fees routed to the token creator; the rest
     *  accrues to the config's feeClaimer (the studio / agent vault). */
    creatorTradingFeePercentage: number
    /** permanent locked liquidity at migration, split partner/creator */
    partnerPermanentLockedLiquidityPercentage: number
    creatorPermanentLockedLiquidityPercentage: number
    tokenAuthorityOption: TokenAuthorityOption
}

export interface StudioPreset extends StudioParams {
    id: string
    label: string
    description: string
}

export const PRESETS: StudioPreset[] = [
    {
        id: 'meme',
        label: 'Meme Coin',
        description:
            'Fair-launch meme: tiny starting cap, steep curve, strong anti-sniper decay, liquidity 100% locked at graduation.',
        totalTokenSupply: 1_000_000_000,
        tokenBaseDecimal: TokenDecimal.SIX,
        initialMarketCap: 1, // 1 SOL
        migrationMarketCap: 85, // 85 SOL, pump.fun-style graduation
        startingFeeBps: 9000, // 90% -> decays
        endingFeeBps: 100, // 1%
        feeDurationSeconds: 60,
        creatorTradingFeePercentage: 50,
        partnerPermanentLockedLiquidityPercentage: 100,
        creatorPermanentLockedLiquidityPercentage: 0,
        tokenAuthorityOption: TokenAuthorityOption.PartnerUpdateAuthority,
    },
    {
        id: 'utility',
        label: 'Utility Token',
        description:
            'Project token: higher starting valuation, shallow curve for price stability, moderate fees.',
        totalTokenSupply: 100_000_000,
        tokenBaseDecimal: TokenDecimal.SIX,
        initialMarketCap: 10,
        migrationMarketCap: 120,
        startingFeeBps: 300,
        endingFeeBps: 80,
        feeDurationSeconds: 30,
        creatorTradingFeePercentage: 30,
        partnerPermanentLockedLiquidityPercentage: 50,
        creatorPermanentLockedLiquidityPercentage: 50,
        tokenAuthorityOption: TokenAuthorityOption.PartnerUpdateAuthority,
    },
    {
        id: 'agent',
        label: 'Agent Token',
        description:
            'Compute-backed agent token: fees split 50/50 between the agent treasury (vault) and creator, funding autonomous operations.',
        totalTokenSupply: 1_000_000_000,
        tokenBaseDecimal: TokenDecimal.SIX,
        initialMarketCap: 2,
        migrationMarketCap: 60,
        startingFeeBps: 500,
        endingFeeBps: 100,
        feeDurationSeconds: 20,
        creatorTradingFeePercentage: 50,
        partnerPermanentLockedLiquidityPercentage: 100,
        creatorPermanentLockedLiquidityPercentage: 0,
        tokenAuthorityOption: TokenAuthorityOption.PartnerUpdateAuthority,
    },
]

/** Map studio params to an on-chain DBC config (pure function, no network). */
export function buildStudioConfig(p: StudioParams): ConfigParameters {
    return buildCurveWithMarketCap({
        token: {
            tokenType: TokenType.SPLToken,
            tokenBaseDecimal: p.tokenBaseDecimal,
            tokenQuoteDecimal: TokenDecimal.NINE, // SOL
            tokenAuthorityOption: p.tokenAuthorityOption,
            totalTokenSupply: p.totalTokenSupply,
            leftover: 10000,
        },
        fee: {
            baseFeeParams: {
                baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
                feeSchedulerParam: {
                    startingFeeBps: p.startingFeeBps,
                    endingFeeBps: p.endingFeeBps,
                    numberOfPeriod: Math.max(1, Math.min(60, p.feeDurationSeconds)),
                    totalDuration: Math.max(1, p.feeDurationSeconds),
                },
            },
            dynamicFeeEnabled: true,
            collectFeeMode: CollectFeeMode.QuoteToken,
            creatorTradingFeePercentage: p.creatorTradingFeePercentage,
            poolCreationFee: 0,
            enableFirstSwapWithMinFee: false,
        },
        migration: {
            migrationOption: MigrationOption.MET_DAMM_V2,
            migrationFeeOption: MigrationFeeOption.FixedBps100,
            migrationFee: {
                feePercentage: 0,
                creatorFeePercentage: 0,
            },
        },
        liquidityDistribution: {
            partnerLiquidityPercentage: 0,
            partnerPermanentLockedLiquidityPercentage:
                p.partnerPermanentLockedLiquidityPercentage,
            creatorLiquidityPercentage: 0,
            creatorPermanentLockedLiquidityPercentage:
                p.creatorPermanentLockedLiquidityPercentage,
        },
        lockedVesting: {
            totalLockedVestingAmount: 0,
            numberOfVestingPeriod: 0,
            cliffUnlockAmount: 0,
            totalVestingDuration: 0,
            cliffDurationFromMigrationTime: 0,
        },
        activationType: ActivationType.Timestamp,
        initialMarketCap: p.initialMarketCap,
        migrationMarketCap: p.migrationMarketCap,
    })
}
