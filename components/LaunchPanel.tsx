'use client'

import { useState } from 'react'
import type { StudioParams } from '@/lib/presets'
import { explorerAddr, explorerTx } from '@/lib/constants'
import { shortAddr } from '@/lib/format'
import { Button, Card, Field } from './ui'

export interface LaunchResult {
    configAddress: string
    poolAddress: string
    baseMint: string
    createConfigTx: string
    createPoolTx: string
    rpc: string
}

export function LaunchPanel({
    params,
    onLaunched,
}: {
    params: StudioParams
    onLaunched: (poolAddress: string) => void
}) {
    const [name, setName] = useState('Agent Compute Credit')
    const [symbol, setSymbol] = useState('AGTC')
    const [description, setDescription] = useState('')
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<LaunchResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const launch = async () => {
        setBusy(true)
        setError(null)
        setResult(null)
        try {
            const res = await fetch('/api/launch', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name, symbol, description, params }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
            setResult(data as LaunchResult)
            onLaunched(data.poolAddress)
        } catch (e: any) {
            setError(e?.message || String(e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Card
            title="One-Click Launch · devnet"
            subtitle="Server-side createConfig + createPool with the studio partner/creator keypairs"
        >
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Token name">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={64}
                            className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent/60"
                        />
                    </Field>
                    <Field label="Symbol">
                        <input
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            maxLength={10}
                            className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-accent/60"
                        />
                    </Field>
                </div>
                <Field label="Description" hint="off-chain metadata note">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        maxLength={500}
                        className="w-full resize-none rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent/60"
                    />
                </Field>

                <div className="rounded-md border border-ink-700 bg-ink-900/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                    Uses the current designer parameters verbatim (
                    {params.initialMarketCap} → {params.migrationMarketCap} SOL, fee{' '}
                    {params.startingFeeBps}→{params.endingFeeBps} bps). The backend funds
                    partner/creator via devnet airdrop if needed. No private keys ever
                    leave the server; only signatures and addresses come back.
                </div>

                <Button onClick={launch} disabled={busy || !name.trim() || !symbol.trim()}>
                    {busy ? 'Launching on devnet…' : '🚀 Launch on devnet'}
                </Button>

                {error && (
                    <p className="whitespace-pre-wrap rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                        {error}
                    </p>
                )}

                {result && (
                    <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                        <div className="text-xs font-semibold text-accent">
                            ✔ Launched — pool is live on devnet
                        </div>
                        {(
                            [
                                ['Config', result.configAddress, explorerAddr(result.configAddress)],
                                ['Pool', result.poolAddress, explorerAddr(result.poolAddress)],
                                ['Mint', result.baseMint, explorerAddr(result.baseMint)],
                                ['createConfig tx', result.createConfigTx, explorerTx(result.createConfigTx)],
                                ['createPool tx', result.createPoolTx, explorerTx(result.createPoolTx)],
                            ] as const
                        ).map(([label, value, href]) => (
                            <div key={label} className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-slate-500">{label}</span>
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-mono text-accent hover:underline"
                                >
                                    {shortAddr(value, 8, 8)} ↗
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    )
}
