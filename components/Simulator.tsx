'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CurveModel, SimSummary, SimTradeInput } from '@/lib/simulator'
import { simulateTrades } from '@/lib/simulator'
import type { StudioParams } from '@/lib/presets'
import { AGENT_TREASURY_ADDRESS } from '@/lib/constants'
import { formatBps, formatCompact, formatPct, formatPrice, formatSol, shortAddr } from '@/lib/format'
import { Button, Card, Stat } from './ui'

let nextId = 1

interface TradeRow extends SimTradeInput {
    id: number
}

export function Simulator({
    model,
    params,
    onSim,
}: {
    model: CurveModel
    params: StudioParams
    onSim: (s: SimSummary | null) => void
}) {
    const [trades, setTrades] = useState<TradeRow[]>([
        { id: nextId++, side: 'buy', amount: 1, t: 90 },
        { id: nextId++, side: 'buy', amount: 5, t: 240 },
        { id: nextId++, side: 'sell', amount: 50_000_000, t: 600 },
    ])
    const [side, setSide] = useState<'buy' | 'sell'>('buy')
    const [amount, setAmount] = useState('1')
    const [time, setTime] = useState('120')

    const sim: SimSummary = useMemo(
        () => simulateTrades(model, params, trades),
        [model, params, trades]
    )

    // push the summary up (for the chart overlay) only when inputs change
    const simKey = useMemo(
        () => JSON.stringify([trades, model.P0, model.P1, model.L, model.thresholdSol, params.startingFeeBps, params.endingFeeBps, params.feeDurationSeconds, params.creatorTradingFeePercentage]),
        [trades, model, params]
    )
    useEffect(() => {
        onSim(sim)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simKey, onSim])

    const addTrade = () => {
        const a = parseFloat(amount)
        const t = parseFloat(time)
        if (!(a > 0) || !(t >= 0)) return
        setTrades((prev) => [...prev, { id: nextId++, side, amount: a, t }])
    }

    const creatorPct = params.creatorTradingFeePercentage

    return (
        <Card
            title="Trade Flow Simulator"
            subtitle="Advance the curve trade-by-trade; fees priced by the anti-sniper schedule"
        >
            <div className="space-y-4">
                {/* add trade row */}
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex overflow-hidden rounded-md border border-ink-600">
                        {(['buy', 'sell'] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSide(s)}
                                className={`px-3 py-1.5 text-xs font-semibold uppercase transition ${
                                    side === s
                                        ? s === 'buy'
                                            ? 'bg-emerald-400/20 text-emerald-300'
                                            : 'bg-rose-400/20 text-rose-300'
                                        : 'bg-ink-900 text-slate-500'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={side === 'buy' ? 'SOL in' : 'tokens in'}
                        className="w-32 rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-accent/60"
                    />
                    <span className="pb-2 text-[10px] uppercase text-slate-500">
                        {side === 'buy' ? 'SOL' : 'tokens'}
                    </span>
                    <input
                        type="number"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-24 rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-accent/60"
                    />
                    <span className="pb-2 text-[10px] uppercase text-slate-500">
                        t (sec)
                    </span>
                    <Button onClick={addTrade}>+ Add trade</Button>
                    <Button
                        variant="ghost"
                        onClick={() => setTrades([])}
                        disabled={trades.length === 0}
                    >
                        Clear
                    </Button>
                </div>

                {/* trade table */}
                {trades.length > 0 && (
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-ink-700/70">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-ink-800 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">#</th>
                                    <th className="px-3 py-2">Trade</th>
                                    <th className="px-3 py-2">t</th>
                                    <th className="px-3 py-2">Fee</th>
                                    <th className="px-3 py-2">Received</th>
                                    <th className="px-3 py-2">Price after</th>
                                    <th className="px-3 py-2">Progress</th>
                                    <th className="px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-700/50 font-mono">
                                {sim.trades.map((tr, i) => (
                                    <tr key={trades[i]?.id ?? i} className="text-slate-300">
                                        <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                                        <td
                                            className={`px-3 py-1.5 font-semibold ${
                                                tr.side === 'buy'
                                                    ? 'text-emerald-300'
                                                    : 'text-rose-300'
                                            }`}
                                        >
                                            {tr.side.toUpperCase()}{' '}
                                            {tr.side === 'buy'
                                                ? formatSol(tr.amount) + ' SOL'
                                                : formatCompact(tr.amount)}
                                        </td>
                                        <td className="px-3 py-1.5 text-slate-500">{tr.t}s</td>
                                        {tr.rejected ? (
                                            <td
                                                colSpan={4}
                                                className="px-3 py-1.5 text-rose-400"
                                            >
                                                ✕ {tr.rejected}
                                            </td>
                                        ) : (
                                            <>
                                                <td className="px-3 py-1.5">
                                                    {formatBps(tr.feeBps)}{' '}
                                                    <span className="text-slate-500">
                                                        ({formatSol(tr.feeSol)} SOL)
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    {tr.side === 'buy'
                                                        ? formatCompact(tr.received) + ' tok'
                                                        : formatSol(tr.received) + ' SOL'}
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    {formatPrice(tr.priceAfter)}
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    {formatPct(tr.progressAfter * 100)}
                                                    {tr.migrated && (
                                                        <span className="ml-1 text-violet2">⚡</span>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-2 py-1.5 text-right">
                                            <button
                                                type="button"
                                                aria-label="remove trade"
                                                onClick={() =>
                                                    setTrades((prev) =>
                                                        prev.filter((r) => r.id !== trades[i]?.id)
                                                    )
                                                }
                                                className="text-slate-600 transition hover:text-rose-400"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* summary stats */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <Stat label="Final price" value={formatPrice(sim.finalPrice)} sub="SOL / token" />
                    <Stat
                        label="Quote raised"
                        value={formatSol(sim.quoteRaised) + ' SOL'}
                        sub={`of ${formatSol(model.thresholdSol)} SOL threshold`}
                    />
                    <Stat
                        label="Migration progress"
                        value={formatPct(sim.progress * 100)}
                        sub={sim.migrated ? 'GRADUATED ⚡' : `${formatCompact(sim.tokensSold)} tokens sold`}
                        tone={sim.migrated ? 'violet' : 'default'}
                    />
                    <Stat
                        label="Total fees (est.)"
                        value={formatSol(sim.totalFeesSol) + ' SOL'}
                        tone="amber"
                    />
                    <Stat
                        label={`Creator (${creatorPct}%)`}
                        value={formatSol(sim.creatorFeesSol) + ' SOL'}
                        tone="accent"
                    />
                    <Stat
                        label={`Agent vault (${100 - creatorPct}%)`}
                        value={formatSol(sim.vaultFeesSol) + ' SOL'}
                        sub={shortAddr(AGENT_TREASURY_ADDRESS)}
                        tone="violet"
                    />
                </div>

                {/* fee routing bar */}
                {sim.totalFeesSol > 0 && (
                    <div>
                        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
                            <span>Fee routing</span>
                            <span>{formatSol(sim.totalFeesSol)} SOL collected</span>
                        </div>
                        <div className="flex h-3 overflow-hidden rounded-full border border-ink-700">
                            <div
                                className="bg-accent/70"
                                style={{ width: `${creatorPct}%` }}
                                title={`Creator ${creatorPct}%`}
                            />
                            <div
                                className="bg-violet2/70"
                                style={{ width: `${100 - creatorPct}%` }}
                                title={`Agent treasury ${100 - creatorPct}%`}
                            />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                            <span className="text-accent">creator share</span>
                            <span className="text-violet2">agent treasury (feeClaimer)</span>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
