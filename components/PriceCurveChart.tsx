'use client'

import { useMemo } from 'react'
import type { CurveModel, SimSummary } from '@/lib/simulator'
import { priceAt, sampleCurve, soldAt } from '@/lib/simulator'
import { formatCompact, formatPrice, formatSol } from '@/lib/format'

const W = 640
const H = 340
const PAD = { l: 56, r: 16, t: 18, b: 34 }

/**
 * Hand-rolled SVG chart: price (SOL/token) vs fraction of curve supply sold,
 * with the migration point and the simulated trade path overlaid.
 */
export function PriceCurveChart({
    model,
    sim,
}: {
    model: CurveModel
    sim: SimSummary | null
}) {
    const data = useMemo(() => {
        const pts = sampleCurve(model, 200)
        const maxPrice = priceAt(model, model.P1)
        const minPrice = priceAt(model, model.P0)
        const maxSold = soldAt(model, model.P1)
        const x = (frac: number) =>
            PAD.l + Math.max(0, Math.min(1, frac)) * (W - PAD.l - PAD.r)
        const y = (price: number) => {
            const f = (price - minPrice) / (maxPrice - minPrice || 1)
            return H - PAD.b - f * (H - PAD.t - PAD.b)
        }
        const path = pts
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.soldFrac).toFixed(2)},${y(p.price).toFixed(2)}`)
            .join(' ')

        // simulated trade path overlay
        let tradePath = ''
        let markers: {
            x: number
            y: number
            side: 'buy' | 'sell'
            i: number
            label: string
        }[] = []
        if (sim) {
            const coords: { x: number; y: number }[] = [
                { x: x(0), y: y(minPrice) },
            ]
            sim.trades.forEach((t, i) => {
                if (t.rejected) return
                const frac = maxSold > 0 ? t.soldAfter / maxSold : 0
                const pt = { x: x(frac), y: y(t.priceAfter) }
                coords.push(pt)
                markers.push({
                    ...pt,
                    side: t.side,
                    i,
                    label: `${t.side === 'buy' ? 'BUY' : 'SELL'} ${
                        t.side === 'buy'
                            ? formatSol(t.amount) + ' SOL'
                            : formatCompact(t.amount) + ' tok'
                    } @ ${formatPrice(t.priceAfter)}`,
                })
            })
            tradePath = coords
                .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
                .join(' ')
        }
        return { path, tradePath, markers, maxPrice, minPrice, maxSold, x, y }
    }, [model, sim])

    const { x, y } = data
    const gridFracs = [0, 0.25, 0.5, 0.75, 1]

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="Bonding curve price chart"
        >
            <defs>
                <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5eead4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* gridlines + x labels */}
            {gridFracs.map((f) => (
                <g key={f}>
                    <line
                        x1={x(f)}
                        y1={PAD.t}
                        x2={x(f)}
                        y2={H - PAD.b}
                        stroke="#2a3347"
                        strokeDasharray="3 4"
                    />
                    <text
                        x={x(f)}
                        y={H - PAD.b + 16}
                        textAnchor="middle"
                        className="fill-slate-500"
                        fontSize="10"
                    >
                        {Math.round(f * 100)}%
                    </text>
                </g>
            ))}
            {/* y axis labels */}
            {[0, 0.5, 1].map((f) => {
                const price =
                    data.minPrice + (data.maxPrice - data.minPrice) * f
                return (
                    <text
                        key={f}
                        x={PAD.l - 6}
                        y={y(price) + 3}
                        textAnchor="end"
                        className="fill-slate-500"
                        fontSize="9"
                        fontFamily="ui-monospace, monospace"
                    >
                        {formatPrice(price)}
                    </text>
                )
            })}
            <text
                x={PAD.l + (W - PAD.l - PAD.r) / 2}
                y={H - 4}
                textAnchor="middle"
                className="fill-slate-500"
                fontSize="10"
            >
                fraction of curve supply sold
            </text>
            <text
                x={10}
                y={PAD.t - 6}
                className="fill-slate-500"
                fontSize="10"
            >
                price (SOL / token)
            </text>

            {/* area under curve */}
            <path
                d={`${data.path} L${x(1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`}
                fill="url(#curveFill)"
            />
            {/* the curve */}
            <path d={data.path} fill="none" stroke="#5eead4" strokeWidth="2" />

            {/* migration point */}
            <line
                x1={x(1)}
                y1={PAD.t}
                x2={x(1)}
                y2={H - PAD.b}
                stroke="#a78bfa"
                strokeDasharray="5 4"
                strokeWidth="1.2"
            />
            <circle cx={x(1)} cy={y(data.maxPrice)} r="5" fill="#a78bfa" />
            <text
                x={x(1) - 8}
                y={y(data.maxPrice) - 10}
                textAnchor="end"
                className="fill-violet2"
                fontSize="10"
                fontWeight="600"
            >
                migration → DAMM v2
            </text>

            {/* simulated trade path */}
            {data.tradePath && (
                <path
                    d={data.tradePath}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.6"
                    strokeDasharray="1 0"
                    opacity="0.9"
                />
            )}
            {data.markers.map((mk) => (
                <g key={mk.i}>
                    <circle
                        cx={mk.x}
                        cy={mk.y}
                        r="4.5"
                        fill={mk.side === 'buy' ? '#34d399' : '#fb7185'}
                        stroke="#07090d"
                        strokeWidth="1.5"
                    >
                        <title>
                            #{mk.i + 1} {mk.label}
                        </title>
                    </circle>
                    <text
                        x={mk.x}
                        y={mk.y - 8}
                        textAnchor="middle"
                        className="fill-slate-300"
                        fontSize="9"
                        fontFamily="ui-monospace, monospace"
                    >
                        {mk.i + 1}
                    </text>
                </g>
            ))}

            {/* start point */}
            <circle cx={x(0)} cy={y(data.minPrice)} r="3.5" fill="#5eead4" />
        </svg>
    )
}
