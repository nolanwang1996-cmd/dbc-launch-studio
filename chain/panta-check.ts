/**
 * chain/panta-check.ts — live Panta API integration check.
 *
 * Verifies the studio's prediction-market seam end to end against the real
 * Panta API (key from PANTA_API_KEY env var, never committed):
 *   1. whoami            — key/account status
 *   2. listMarkets       — catalog read
 *   3. quoteLaunchMarket — creation-fee quote for a market whose settlement
 *      condition is the verified DBC pool's own migration state
 *      (quoteReserve >= migrationQuoteThreshold — objective, on-chain).
 *
 *   PANTA_API_KEY=pk_test_… npx tsx chain/panta-check.ts
 */
import { listMarkets, quoteLaunchMarket, whoami } from '../lib/panta'
import { FEE_CLAIMER_ADDRESS } from './env'

async function main() {
    console.log('Panta integration check')

    const account = await whoami()
    console.log(
        `  whoami: ${account.name} <${account.email}> status=${account.status} canCreateMarkets=${account.canCreateMarkets}`,
    )

    const markets = await listMarkets()
    console.log(`  markets: ${markets.length} listed (first: "${markets[0]?.title ?? '—'}")`)

    const now = Math.floor(Date.now() / 1000)
    const quote = await quoteLaunchMarket({
        wallet: FEE_CLAIMER_ADDRESS,
        question:
            'Will DBC pool GzRDmC7P2evninsmpfZKcMHucpXqGE5CVqRaD3Kap3sS reach its migration threshold within 7 days of creation?',
        title: 'DBC Launch Studio demo pool migrates in 7d?',
        description:
            'Settlement reads the Meteora DBC pool account state directly: quoteReserve vs migrationQuoteThreshold. Objective on-chain settlement, no oracle vote.',
        resolutionRule:
            "Resolves YES if the pool's on-chain quoteReserve meets or exceeds its migrationQuoteThreshold (Meteora DBC program state) before endTime; otherwise NO.",
        sourcesOfTruth: ['https://github.com/nolanwang1996-cmd/dbc-launch-studio/blob/main/VERIFY.md'],
        imageUrl: 'https://raw.githubusercontent.com/nolanwang1996-cmd/dbc-launch-studio/main/demo/app-main.png',
        startTime: now,
        endTime: now + 7 * 86400,
        resolutionTime: now + 7 * 86400 + 3600,
    })
    console.log(
        `  quote: createId=${quote.createId} fee=${Number(quote.paymentUsdc) / 1e6} USDC ` +
            `(liquidity ${Number(quote.liquidityInjectionUsdc) / 1e6} + platform ${Number(quote.platformRevenueUsdc) / 1e6})`,
    )
    if (quote.disclaimer) console.log(`  note: ${quote.disclaimer}`)
    console.log('Panta integration check OK')
}

main().catch((e) => {
    console.error('Panta integration check FAILED:', e.message)
    process.exit(1)
})
