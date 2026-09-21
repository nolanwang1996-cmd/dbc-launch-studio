'use client'

import { useEffect, useState } from 'react'
import { explorerAddr } from '@/lib/constants'
import { formatCompact, formatPct, formatPrice, formatSol, shortAddr } from '@/lib/format'
import { Button, Card, Stat } from './ui'

export interface PoolInfo {
    address: string
    config: string
    baseMint: string
    creator: string
    quoteReserveSol: number
    baseReserveTokens: number
    thresholdSol: number
    progressPct: number
    priceSol: number
    sqrtPrice: string
    isMigrated: boolean
    fees: {
        partnerQuoteSol: number
        creatorQuoteSol: number
        protocolQuoteSol: number
    } | null
}

export function PoolAnalytics({
    address,
    onAddressChange,
    cluster = 'devnet',
}: {
    address: string
    onAddressChange: (a: string) => void
    cluster?: 'devnet' | 'mainnet'
}) {
    const [input, setInput] = useState(address)
    const [info, setInfo] = useState<PoolInfo | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = async (addr: string) => {
        if (!addr.trim()) return
        setBusy(true)
        setError(null)
        try {
            const res = await fetch(`/api/pool/${addr.trim()}?cluster=${cluster}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
            setInfo(data as PoolInfo)
        } catch (e: any) {
            setInfo(null)
            setError(e?.message || String(e))
        } finally {
            setBusy(false)
        }
    }

    // auto-load when a launch fills the address
    useEffect(() => {
        if (address && address !== input) setInput(address)
        if (address) load(address)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address])

    const progress = info ? Math.min(100, info.progressPct) : 0

    return (
        <Card
            title="Live Pool Analytics"
            subtitle={`On-chain state via getPool() + getPoolConfig() — ${cluster}`}
        >
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pool address (auto-filled after launch)"
                        spellCheck={false}
                        className="min-w-0 flex-1 rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-accent/60"
                    />
                    <Button onClick={() => { onAddressChange(input.trim()); load(input) }} disabled={busy}>
                        {busy ? 'Loading…' : 'Load'}
                    </Button>
                </div>

                {error && (
                    <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                        {error}
                    </p>
                )}

                {info && (
                    <div className="space-y-4">
                        {/* migration progress */}
                        <div>
                            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
                                <span>Migration progress</span>
                                <span>
                                    {formatSol(info.quoteReserveSol)} /{' '}
                                    {formatSol(info.thresholdSol)} SOL ·{' '}
                                    {formatPct(info.progressPct)}
                                </span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full border border-ink-700 bg-ink-900">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        info.isMigrated ? 'bg-violet2' : 'bg-accent/80'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            {info.isMigrated && (
                                <p className="mt-1 text-[11px] font-semibold text-violet2">
                                    ⚡ Migrated to DAMM v2
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <Stat
                                label="Current price"
                                value={formatPrice(info.priceSol)}
                                sub="SOL / token"
                                tone="accent"
                            />
                            <Stat
                                label="Quote reserve"
                                value={formatSol(info.quoteReserveSol) + ' SOL'}
                            />
                            <Stat
                                label="Base reserve"
                                value={formatCompact(info.baseReserveTokens)}
                                sub="tokens"
                            />
                            {info.fees && (
                                <>
                                    <Stat
                                        label="Partner / vault fees"
                                        value={formatSol(info.fees.partnerQuoteSol) + ' SOL'}
                                        tone="violet"
                                    />
                                    <Stat
                                        label="Creator fees"
                                        value={formatSol(info.fees.creatorQuoteSol) + ' SOL'}
                                        tone="amber"
                                    />
                                    <Stat
                                        label="Protocol fees"
                                        value={formatSol(info.fees.protocolQuoteSol) + ' SOL'}
                                    />
                                </>
                            )}
                        </div>

                        <div className="space-y-1 border-t border-ink-700/70 pt-3 text-xs">
                            {(
                                [
                                    ['Pool', info.address],
                                    ['Config', info.config],
                                    ['Mint', info.baseMint],
                                    ['Creator', info.creator],
                                ] as const
                            ).map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between gap-2">
                                    <span className="text-slate-500">{label}</span>
                                    <a
                                        href={explorerAddr(value)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-mono text-accent hover:underline"
                                    >
                                        {shortAddr(value, 8, 8)} ↗
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
