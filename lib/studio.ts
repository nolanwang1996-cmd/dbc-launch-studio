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

import {
    PRESETS,
    type StudioParams,
    type StudioPreset,
} from './presets'

export { PRESETS }
export type { StudioParams, StudioPreset }

/** Map studio params to an on-chain DBC config (pure function, no network). */
export function buildStudioConfig(p: StudioParams): ConfigParameters {
    return buildCurveWithMarketCap({
        token: {
            tokenType: TokenType.SPLToken,
            tokenBaseDecimal: p.tokenBaseDecimal,
            tokenQuoteDecimal: TokenDecimal.NINE, // SOL
            tokenAuthorityOption: p.tokenAuthorityOption as unknown as TokenAuthorityOption,
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
