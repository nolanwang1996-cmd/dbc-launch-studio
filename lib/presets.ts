/**
 * SDK-free studio model: parameter shape + presets.
 *
 * Deliberately free of any `@meteora-ag/dynamic-bonding-curve-sdk` import so it
 * can be consumed by client components (the studio UI) without pulling the
 * Solana SDK into the browser bundle. Enum values are inlined as numbers;
 * `lib/studio.ts` maps them onto the SDK's enums when building a real config.
 */
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
    tokenAuthorityOption: number /* TokenAuthorityOption */
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
        tokenBaseDecimal: 6,
        initialMarketCap: 1, // 1 SOL
        migrationMarketCap: 85, // 85 SOL, pump.fun-style graduation
        startingFeeBps: 9000, // 90% -> decays
        endingFeeBps: 100, // 1%
        feeDurationSeconds: 60,
        creatorTradingFeePercentage: 50,
        partnerPermanentLockedLiquidityPercentage: 100,
        creatorPermanentLockedLiquidityPercentage: 0,
        tokenAuthorityOption: 2 /* PartnerUpdateAuthority */,
    },
    {
        id: 'utility',
        label: 'Utility Token',
        description:
            'Project token: higher starting valuation, shallow curve for price stability, moderate fees.',
        totalTokenSupply: 100_000_000,
        tokenBaseDecimal: 6,
        initialMarketCap: 10,
        migrationMarketCap: 120,
        startingFeeBps: 300,
        endingFeeBps: 80,
        feeDurationSeconds: 30,
        creatorTradingFeePercentage: 30,
        partnerPermanentLockedLiquidityPercentage: 50,
        creatorPermanentLockedLiquidityPercentage: 50,
        tokenAuthorityOption: 2 /* PartnerUpdateAuthority */,
    },
    {
        id: 'agent',
        label: 'Agent Token',
        description:
            'Compute-backed agent token: fees split 50/50 between the agent treasury (vault) and creator, funding autonomous operations.',
        totalTokenSupply: 1_000_000_000,
        tokenBaseDecimal: 6,
        initialMarketCap: 2,
        migrationMarketCap: 60,
        startingFeeBps: 500,
        endingFeeBps: 100,
        feeDurationSeconds: 20,
        creatorTradingFeePercentage: 50,
        partnerPermanentLockedLiquidityPercentage: 100,
        creatorPermanentLockedLiquidityPercentage: 0,
        tokenAuthorityOption: 2 /* PartnerUpdateAuthority */,
    },
]

