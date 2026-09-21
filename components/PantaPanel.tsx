'use client'

import { useCallback, useEffect, useState } from 'react'
import { AGENT_TREASURY_ADDRESS } from '@/lib/constants'
import { Badge, Button, Card } from './ui'

/** Panta sandbox fixture shapes vary — read fields defensively. */
function pick(obj: any, keys: string[]): any {
    for (const k of keys) {
        if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k]
    }
    return undefined
}

function marketTitle(m: any): string {
    return (
        pick(m, ['title', 'question', 'name', 'marketTitle']) ??
        JSON.stringify(m).slice(0, 80)
    )
}

function marketStatus(m: any): string {
    // lib/panta.ts: PantaMarketSummary.phase
    return String(pick(m, ['phase', 'status', 'state']) ?? 'unknown')
}

function marketPrice(m: any, side: 'yes' | 'no'): string {
    // lib/panta.ts: yesPrice / noPrice (decimal strings)
    const v = pick(m, [
        `${side}Price`,
        `${side}_price`,
        side === 'yes' ? 'priceYes' : 'priceNo',
    ])
    if (v === undefined) return '—'
    const n = Number(v)
    return Number.isFinite(n) ? n.toFixed(3) : String(v)
}

function marketVolume(m: any): string {
    const v = pick(m, ['volumeUsdc', 'volume', 'volume_usdc'])
    return v === undefined ? '—' : String(v)
}

export function PantaPanel({ poolAddress }: { poolAddress: string }) {
    const [markets, setMarkets] = useState<any[] | null>(null)
    const [listError, setListError] = useState<string | null>(null)
    const [listBusy, setListBusy] = useState(false)

    const [quote, setQuote] = useState<any | null>(null)
    const [quoteError, setQuoteError] = useState<string | null>(null)
    const [quoteBusy, setQuoteBusy] = useState(false)

    const loadMarkets = useCallback(async () => {
        setListBusy(true)
        setListError(null)
        try {
            const res = await fetch('/api/panta/markets/')
            const text = await res.text()
            let data: any = null
            try {
                data = JSON.parse(text)
            } catch {
                /* non-JSON passthrough */
            }
            if (!res.ok) {
                setMarkets(null)
                setListError(
                    res.status === 503
                        ? '未配置 PANTA_API_KEY'
                        : `HTTP ${res.status}: ${data?.error || text.slice(0, 300)}`
                )
                return
            }
            // lib/panta.ts: listMarkets() -> { items: [...] }
            const list = Array.isArray(data)
                ? data
                : pick(data, ['items', 'markets', 'results', 'data']) ?? []
            setMarkets(Array.isArray(list) ? list : [])
        } catch (e: any) {
            setMarkets(null)
            setListError(e?.message || String(e))
        } finally {
            setListBusy(false)
        }
    }, [])

    useEffect(() => {
        loadMarkets()
    }, [loadMarkets])

    const requestQuote = async () => {
        setQuoteBusy(true)
        setQuoteError(null)
        setQuote(null)
        const now = Math.floor(Date.now() / 1000)
        const subject = poolAddress || 'unlaunched-token (placeholder)'
        const body = {
            title: 'Will this token migrate within 7 days?',
            question: `Will the DBC pool ${subject} reach its migration threshold within 7 days of creation?`,
            description: poolAddress
                ? `Prediction market on the graduation of Meteora DBC pool ${poolAddress} (Solana devnet launch from DBC Launch Studio).`
                : 'Prediction market on the graduation of a token launched via DBC Launch Studio (no pool launched yet — placeholder subject).',
            resolutionRule:
                'On-chain: quoteReserve >= migrationQuoteThreshold on the DBC pool',
            sourcesOfTruth: ['solana-rpc', 'meteora-dbc-program'],
            imageUrl: 'https://arweave.net/placeholder-dbc-launch-studio',
            startTime: now + 3600,
            endTime: now + 7 * 24 * 3600,
            resolutionTime: now + 7 * 24 * 3600 + 3600,
            marketType: 'standard',
            category: 'crypto',
            region: 'Global',
            wallet: AGENT_TREASURY_ADDRESS,
        }
        try {
            const res = await fetch('/api/panta/markets/create/quote/', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            })
            const text = await res.text()
            let data: any = null
            try {
                data = JSON.parse(text)
            } catch {
                /* non-JSON */
            }
            if (!res.ok) {
                setQuoteError(
                    res.status === 503
                        ? '未配置 PANTA_API_KEY'
                        : `HTTP ${res.status}: ${data?.error || data?.message || text.slice(0, 300)}`
                )
                return
            }
            setQuote(data ?? { raw: text })
        } catch (e: any) {
            setQuoteError(e?.message || String(e))
        } finally {
            setQuoteBusy(false)
        }
    }

    // lib/panta.ts: PantaCreateQuote — paymentUsdc is base units (6 decimals)
    const createId = pick(quote ?? {}, ['createId', 'create_id', 'id', 'quoteId'])
    const feeRaw = pick(quote ?? {}, [
        'paymentUsdc',
        'fee',
        'creationFee',
        'createFee',
        'feeUsdc',
        'cost',
    ])
    const fee =
        feeRaw === undefined
            ? undefined
            : Number.isFinite(Number(feeRaw))
              ? (Number(feeRaw) / 1e6).toFixed(2)
              : String(feeRaw)
    const liquidity = pick(quote ?? {}, ['liquidityInjectionUsdc'])
    const expiresAt = pick(quote ?? {}, ['expiresAt', 'expires_at'])

    return (
        <Card
            title="Launch Outcome Market"
            subtitle="Prediction market on this launch's graduation — sandbox fixture data"
            actions={
                <div className="flex items-center gap-2">
                    <Badge tone="amber">sandbox / pk_test</Badge>
                    <a
                        href="https://panta.market"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent/20"
                    >
                        Powered by Panta ↗
                    </a>
                </div>
            }
        >
            <div className="space-y-4">
                {/* markets list */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Live markets (sandbox)
                        </span>
                        <Button variant="ghost" onClick={loadMarkets} disabled={listBusy}>
                            {listBusy ? 'Loading…' : 'Refresh'}
                        </Button>
                    </div>
                    {listError && (
                        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                            {listError}
                        </p>
                    )}
                    {markets && markets.length === 0 && !listError && (
                        <p className="text-xs text-slate-500">No markets returned.</p>
                    )}
                    {markets && markets.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-ink-700/70">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-ink-800 text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Market</th>
                                        <th className="px-3 py-2">Yes</th>
                                        <th className="px-3 py-2">No</th>
                                        <th className="px-3 py-2">Vol (USDC)</th>
                                        <th className="px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-700/50">
                                    {markets.slice(0, 5).map((m, i) => (
                                        <tr key={i} className="text-slate-300">
                                            <td className="max-w-0 truncate px-3 py-2" title={marketTitle(m)}>
                                                {marketTitle(m)}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-emerald-300">
                                                {marketPrice(m, 'yes')}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-rose-300">
                                                {marketPrice(m, 'no')}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-slate-400">
                                                {marketVolume(m)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge tone="slate">{marketStatus(m)}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* quote creation */}
                <div className="rounded-lg border border-ink-700 bg-ink-900/50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-200">
                                Quote: Will this token migrate within 7 days?
                            </span>
                            <span className="ml-2 font-mono text-[10px] text-slate-500">
                                subject:{' '}
                                {poolAddress
                                    ? `${poolAddress.slice(0, 8)}…${poolAddress.slice(-6)}`
                                    : 'placeholder (launch a pool first)'}
                            </span>
                        </div>
                        <Button onClick={requestQuote} disabled={quoteBusy}>
                            {quoteBusy ? 'Requesting quote…' : 'Get creation quote'}
                        </Button>
                    </div>

                    {quoteError && (
                        <p className="mt-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                            {quoteError}
                        </p>
                    )}

                    {quote && (
                        <div className="mt-3 space-y-1.5 rounded-md border border-accent/30 bg-accent/5 px-3 py-2.5 text-xs">
                            <div className="font-semibold text-accent">
                                ✔ Quote received (sandbox)
                            </div>
                            <div className="flex justify-between font-mono">
                                <span className="text-slate-500">createId</span>
                                <span className="text-slate-200">
                                    {createId !== undefined ? String(createId) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between font-mono">
                                <span className="text-slate-500">creation fee</span>
                                <span className="text-slate-200">
                                    {fee !== undefined ? `${fee} USDC` : '—'}
                                </span>
                            </div>
                            {liquidity !== undefined && (
                                <div className="flex justify-between font-mono">
                                    <span className="text-slate-500">liquidity injection</span>
                                    <span className="text-slate-200">
                                        {(Number(liquidity) / 1e6).toFixed(2)} USDC
                                    </span>
                                </div>
                            )}
                            {expiresAt !== undefined && (
                                <div className="flex justify-between font-mono">
                                    <span className="text-slate-500">quote expires</span>
                                    <span className="text-slate-200">{String(expiresAt)}</span>
                                </div>
                            )}
                            <details className="pt-1">
                                <summary className="cursor-pointer text-[10px] text-slate-500 hover:text-slate-300">
                                    raw response
                                </summary>
                                <pre className="mt-1 max-h-36 overflow-auto rounded bg-ink-950 p-2 text-[10px] text-slate-400">
                                    {JSON.stringify(quote, null, 2)}
                                </pre>
                            </details>
                        </div>
                    )}
                </div>

                <p className="text-[10px] leading-relaxed text-slate-600">
                    Sandbox mode: requests use a pk_test key, responses are Panta fixture
                    data — no real market is created and no funds move. Resolution rule is
                    objective and on-chain: the pool graduates when quoteReserve ≥
                    migrationQuoteThreshold.
                </p>
            </div>
        </Card>
    )
}
