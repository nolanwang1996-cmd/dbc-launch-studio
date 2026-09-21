'use client'

import { PRESETS, type StudioParams } from '@/lib/studio'
import { Card, Field, NumberInput } from './ui'

export function ParamPanel({
    params,
    presetId,
    onPreset,
    onChange,
}: {
    params: StudioParams
    presetId: string
    onPreset: (id: string) => void
    onChange: (patch: Partial<StudioParams>) => void
}) {
    return (
        <Card
            title="Curve Designer"
            subtitle="Params map 1:1 to the on-chain DBC config via buildStudioConfig()"
            className="h-full"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    {PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => onPreset(p.id)}
                            title={p.description}
                            className={`rounded-lg border px-2 py-2 text-left transition ${
                                presetId === p.id
                                    ? 'border-accent/60 bg-accent/10'
                                    : 'border-ink-600 bg-ink-900 hover:border-slate-500'
                            }`}
                        >
                            <div
                                className={`text-xs font-semibold ${
                                    presetId === p.id ? 'text-accent' : 'text-slate-200'
                                }`}
                            >
                                {p.label}
                            </div>
                            <div className="mt-0.5 text-[10px] leading-tight text-slate-500">
                                {p.initialMarketCap}→{p.migrationMarketCap} SOL
                            </div>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Initial market cap" hint="SOL">
                        <NumberInput
                            value={params.initialMarketCap}
                            min={0.01}
                            step={0.5}
                            suffix="SOL"
                            onChange={(v) => onChange({ initialMarketCap: v })}
                        />
                    </Field>
                    <Field label="Migration market cap" hint="SOL">
                        <NumberInput
                            value={params.migrationMarketCap}
                            min={1}
                            step={5}
                            suffix="SOL"
                            onChange={(v) => onChange({ migrationMarketCap: v })}
                        />
                    </Field>
                    <Field label="Total supply" hint="tokens">
                        <NumberInput
                            value={params.totalTokenSupply}
                            min={1000}
                            step={1_000_000}
                            onChange={(v) =>
                                onChange({ totalTokenSupply: Math.round(v) })
                            }
                        />
                    </Field>
                    <Field label="Creator fee share" hint="%">
                        <NumberInput
                            value={params.creatorTradingFeePercentage}
                            min={0}
                            max={100}
                            step={5}
                            suffix="%"
                            onChange={(v) =>
                                onChange({
                                    creatorTradingFeePercentage: Math.max(
                                        0,
                                        Math.min(100, Math.round(v))
                                    ),
                                })
                            }
                        />
                    </Field>
                    <Field label="Starting fee" hint="bps (anti-sniper)">
                        <NumberInput
                            value={params.startingFeeBps}
                            min={0}
                            max={9900}
                            step={100}
                            suffix="bps"
                            onChange={(v) => onChange({ startingFeeBps: Math.round(v) })}
                        />
                    </Field>
                    <Field label="Ending fee" hint="bps (steady state)">
                        <NumberInput
                            value={params.endingFeeBps}
                            min={0}
                            max={2000}
                            step={10}
                            suffix="bps"
                            onChange={(v) => onChange({ endingFeeBps: Math.round(v) })}
                        />
                    </Field>
                    <Field label="Fee decay duration" hint="seconds">
                        <NumberInput
                            value={params.feeDurationSeconds}
                            min={1}
                            max={3600}
                            step={5}
                            suffix="sec"
                            onChange={(v) =>
                                onChange({ feeDurationSeconds: Math.round(v) })
                            }
                        />
                    </Field>
                    <Field label="Locked liquidity at migration" hint="% partner">
                        <NumberInput
                            value={params.partnerPermanentLockedLiquidityPercentage}
                            min={0}
                            max={100}
                            step={10}
                            suffix="%"
                            onChange={(v) =>
                                onChange({
                                    partnerPermanentLockedLiquidityPercentage:
                                        Math.max(0, Math.min(100, Math.round(v))),
                                })
                            }
                        />
                    </Field>
                </div>

                {params.migrationMarketCap <= params.initialMarketCap && (
                    <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                        Migration market cap must be greater than the initial market cap.
                    </p>
                )}
                {params.endingFeeBps > params.startingFeeBps && (
                    <p className="rounded-md border border-amber2/40 bg-amber2/10 px-3 py-2 text-xs text-amber2">
                        Ending fee is above starting fee — the anti-sniper scheduler will
                        ramp up instead of decaying.
                    </p>
                )}
            </div>
        </Card>
    )
}
