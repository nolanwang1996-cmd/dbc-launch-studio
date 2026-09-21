'use client'

import { useCallback, useMemo, useState } from 'react'
import { PRESETS, type StudioParams } from '@/lib/presets'
import { buildCurveModel, type SimSummary } from '@/lib/simulator'
import { formatPrice, formatSol } from '@/lib/format'
import { ParamPanel } from '@/components/ParamPanel'
import { PriceCurveChart } from '@/components/PriceCurveChart'
import { Simulator } from '@/components/Simulator'
import { LaunchPanel } from '@/components/LaunchPanel'
import { PoolAnalytics } from '@/components/PoolAnalytics'
import { AiAssistant } from '@/components/AiAssistant'
import { TreasuryPanel } from '@/components/TreasuryPanel'
import { PantaPanel } from '@/components/PantaPanel'
import { Badge, Card } from '@/components/ui'

export default function Page() {
    const [presetId, setPresetId] = useState<string>('meme')
    const [params, setParams] = useState<StudioParams>({ ...PRESETS[0] })
    const [sim, setSim] = useState<SimSummary | null>(null)
    // default: the studio's live devnet pool (see VERIFY.md); overridden after a fresh launch
    const [poolAddress, setPoolAddress] = useState(
        'GzRDmC7P2evninsmpfZKcMHucpXqGE5CVqRaD3Kap3sS'
    )

    const applyPreset = useCallback((id: string) => {
        const p = PRESETS.find((x) => x.id === id)
        if (!p) return
        setPresetId(id)
        setParams({ ...p })
    }, [])

    const patchParams = useCallback((patch: Partial<StudioParams>) => {
        setPresetId('custom')
        setParams((prev) => ({ ...prev, ...patch }))
    }, [])

    const applyAssistant = useCallback((p: StudioParams) => {
        setPresetId('custom')
        setParams({ ...p })
    }, [])

    const onSim = useCallback((s: SimSummary | null) => setSim(s), [])

    const modelResult = useMemo(() => {
        try {
            return { model: buildCurveModel(params), error: null as string | null }
        } catch (e: any) {
            return { model: null, error: e?.message || String(e) }
        }
    }, [params])
    const model = modelResult.model

    return (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
            {/* header */}
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-50">
                        DBC <span className="text-accent">Launch Studio</span>
                    </h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Design · simulate · launch Meteora Dynamic Bonding Curve tokens
                        with agent-treasury fee routing
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge tone="slate">Solana devnet</Badge>
                    <Badge tone="accent">Meteora DBC SDK v1.5</Badge>
                </div>
            </header>

            {modelResult.error && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                    <strong>Invalid curve parameters:</strong> {modelResult.error}
                </div>
            )}

            {/* designer + curve */}
            <div className="grid gap-5 lg:grid-cols-5">
                <div className="lg:col-span-2">
                    <ParamPanel
                        params={params}
                        presetId={presetId}
                        onPreset={applyPreset}
                        onChange={patchParams}
                    />
                </div>
                <Card
                    title="Bonding Curve"
                    subtitle={
                        model
                            ? `Constant product · threshold ${formatSol(model.thresholdSol)} SOL · price ${formatPrice(
                                  model ? model.P0 * model.P0 * 1e-3 : 0
                              )} → ${formatPrice(
                                  model ? model.P1 * model.P1 * 1e-3 : 0
                              )} SOL/token`
                            : 'Fix the parameters to render the curve'
                    }
                    className="lg:col-span-3"
                >
                    {model && <PriceCurveChart model={model} sim={sim} />}
                </Card>
            </div>

            {/* simulator */}
            {model && <Simulator model={model} params={params} onSim={onSim} />}

            {/* launch + analytics */}
            <div className="grid gap-5 lg:grid-cols-2">
                <LaunchPanel params={params} onLaunched={setPoolAddress} />
                <PoolAnalytics address={poolAddress} onAddressChange={setPoolAddress} />
            </div>

            {/* assistant + treasury */}
            <div className="grid gap-5 lg:grid-cols-2">
                <AiAssistant onApply={applyAssistant} />
                <TreasuryPanel creatorPct={params.creatorTradingFeePercentage} />
            </div>

            {/* prediction market on the launch outcome */}
            <PantaPanel poolAddress={poolAddress} />

            <footer className="border-t border-ink-800 pt-4 text-center text-[10px] text-slate-600">
                DBC Launch Studio · hackathon build · devnet only, not financial advice ·
                simulation is an off-chain approximation of on-chain math
            </footer>
        </main>
    )
}
