/**
 * Rule-based intent parser for the AI parameter assistant.
 * Pure front-end engine — no external API. The interface is deliberately
 * shaped so an LLM backend can be swapped in later (same input/output).
 */
import { PRESETS, type StudioParams, type StudioPreset } from './studio'

export interface AssistantSuggestion {
    preset: StudioPreset
    params: StudioParams
    rationale: string[]
    adjustments: string[]
}

function extractNumberNear(text: string, keywords: string[]): number | null {
    for (const kw of keywords) {
        // number before keyword: "80 SOL graduation", "graduate at 120"
        const before = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:sol\\s*)?(?:${kw})`, 'i')
        const mb = text.match(before)
        if (mb) return parseFloat(mb[1])
        // keyword before number: "graduation around 80 sol"
        const after = new RegExp(`(?:${kw})[^\\d]{0,20}(\\d+(?:\\.\\d+)?)\\s*(?:sol)?`, 'i')
        const ma = text.match(after)
        if (ma) return parseFloat(ma[1])
    }
    return null
}

export function analyzeIntent(raw: string): AssistantSuggestion {
    const text = raw.toLowerCase()
    const rationale: string[] = []
    const adjustments: string[] = []

    // --- pick base preset -------------------------------------------------
    let preset: StudioPreset = PRESETS[0] // meme default
    if (/agent|compute|bot|autonomous|ai token/.test(text)) {
        preset = PRESETS.find((p) => p.id === 'agent')!
        rationale.push(
            'Detected an **agent token** intent → Agent preset: 50% of trading fees route to the agent treasury vault, funding autonomous operations.'
        )
    } else if (/utility|project|governance|protocol|dao|infra/.test(text)) {
        preset = PRESETS.find((p) => p.id === 'utility')!
        rationale.push(
            'Detected a **utility / project token** intent → Utility preset: higher starting valuation and a shallow curve for price stability.'
        )
    } else {
        rationale.push(
            'Defaulting to the **meme fair-launch** preset: minimal starting cap, steep curve, strong anti-sniper decay, 100% locked liquidity at graduation.'
        )
    }

    const params: StudioParams = { ...preset }

    // --- migration / graduation target ------------------------------------
    const grad = extractNumberNear(text, [
        'graduat\\w*',
        'migrat\\w*',
        'graduation',
        'threshold',
        'target',
    ])
    if (grad !== null && grad > 0 && grad <= 10000) {
        params.migrationMarketCap = grad
        adjustments.push(`Migration market cap → ${grad} SOL`)
        rationale.push(
            `Parsed a graduation target of **${grad} SOL**. The migration market cap sets the end of the bonding curve: the curve ends at sqrt-price P1 = sqrt(migrationCap / supply), so this directly controls how far price travels before the pool becomes a DAMM v2 AMM.`
        )
    }

    // --- initial market cap ------------------------------------------------
    const init = extractNumberNear(text, ['initial|start\\w* market cap|launch at|starting cap'])
    if (init !== null && init > 0 && init < params.migrationMarketCap) {
        params.initialMarketCap = init
        adjustments.push(`Initial market cap → ${init} SOL`)
        rationale.push(
            `Initial market cap of **${init} SOL** sets the starting price. A lower start means a steeper effective multiple to graduation (${(params.migrationMarketCap / init).toFixed(1)}×), rewarding earliest buyers more.`
        )
    }

    // --- anti-sniper --------------------------------------------------------
    if (/anti[- ]?sniper|sniper|bot protection|fair launch|fair/.test(text)) {
        if (params.startingFeeBps < 5000) {
            params.startingFeeBps = 5000
            adjustments.push('Starting fee → 5000 bps (50%)')
        }
        if (params.feeDurationSeconds < 60) {
            params.feeDurationSeconds = 60
            adjustments.push('Fee decay window → 60 s')
        }
        rationale.push(
            '**Anti-sniper** requested → the exponential fee scheduler starts at a punitive fee and decays to the steady-state fee within the decay window. Snipers buying in the first seconds pay the maximum fee (mostly routed to creator + treasury), making sandwich/bundle launches uneconomical while honest buyers seconds later pay the normal rate.'
        )
    }

    // --- low / high fee preference ------------------------------------------
    const feePct = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:trading\s*)?fee/)
    if (feePct) {
        const pct = parseFloat(feePct[1])
        const bps = Math.round(Math.max(25, Math.min(1000, pct * 100)))
        params.endingFeeBps = bps
        adjustments.push(`Steady-state fee → ${bps} bps (${bps / 100}%)`)
        rationale.push(
            `Steady-state fee set to **${bps / 100}%**. Lower fees attract volume; higher fees compound treasury/creator revenue and dampen churn. This also becomes the migrated DAMM v2 pool fee.`
        )
    } else if (/low fee|cheap fee/.test(text)) {
        params.endingFeeBps = 50
        adjustments.push('Steady-state fee → 50 bps (0.5%)')
        rationale.push('Low-fee preference → 0.5% steady-state fee to encourage volume.')
    } else if (/high fee|revenue/.test(text)) {
        params.endingFeeBps = 200
        adjustments.push('Steady-state fee → 200 bps (2%)')
        rationale.push(
            'Revenue-focused → 2% steady-state fee, split between creator and the agent treasury vault per the creator share.'
        )
    }

    // --- creator fee share ---------------------------------------------------
    const share = text.match(/(\d{1,3})\s*%\s*(?:to|for)\s*(?:the\s*)?creator/)
    if (share) {
        const pct = Math.max(0, Math.min(100, parseInt(share[1], 10)))
        params.creatorTradingFeePercentage = pct
        adjustments.push(`Creator fee share → ${pct}%`)
        rationale.push(
            `Creator keeps **${pct}%** of trading fees; the remaining ${100 - pct}% accrues to the config feeClaimer — the studio / agent treasury vault.`
        )
    }

    // --- supply ---------------------------------------------------------------
    const supply = text.match(/(\d+(?:\.\d+)?)\s*([bm])\s*(?:supply|tokens)/)
    if (supply) {
        const mult = supply[2] === 'b' ? 1e9 : 1e6
        params.totalTokenSupply = Math.round(parseFloat(supply[1]) * mult)
        adjustments.push(`Total supply → ${params.totalTokenSupply.toLocaleString()}`)
        rationale.push(
            'Supply scales every price level but not the curve shape in market-cap terms — it mainly changes unit psychology (unit bias).'
        )
    }

    // --- curve steepness commentary -------------------------------------------
    const multiple = params.migrationMarketCap / params.initialMarketCap
    rationale.push(
        `Curve steepness: market cap travels **${multiple.toFixed(1)}×** from launch to graduation, so price rises ${Math.sqrt(multiple).toFixed(2)}× in sqrt-space. ${multiple > 50 ? 'That is a steep meme-style curve — early buyers get large multiples, but expect high volatility.' : multiple > 10 ? 'A moderate curve — balanced price discovery.' : 'A shallow utility-style curve — price stays comparatively stable, friendlier for real users buying in size.'}`
    )
    rationale.push(
        `Trade-off summary: migration at **${params.migrationMarketCap} SOL** (liquidity depth at graduation) vs. starting at **${params.initialMarketCap} SOL** (accessibility). Higher graduation ⇒ deeper DAMM v2 pool but a longer road; lower graduation ⇒ faster migration with thinner liquidity.`
    )

    return { preset, params, rationale, adjustments }
}
