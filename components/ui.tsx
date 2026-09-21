'use client'

import type { ReactNode } from 'react'

export function Card({
    title,
    subtitle,
    children,
    className = '',
    actions,
}: {
    title?: string
    subtitle?: string
    children: ReactNode
    className?: string
    actions?: ReactNode
}) {
    return (
        <section
            className={`rounded-xl border border-ink-700 bg-ink-850/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_30px_rgba(0,0,0,0.35)] ${className}`}
        >
            {(title || actions) && (
                <header className="flex items-start justify-between gap-3 border-b border-ink-700/70 px-5 py-3.5">
                    <div>
                        {title && (
                            <h2 className="text-sm font-semibold tracking-wide text-slate-100">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
                        )}
                    </div>
                    {actions}
                </header>
            )}
            <div className="px-5 py-4">{children}</div>
        </section>
    )
}

export function Field({
    label,
    hint,
    children,
}: {
    label: string
    hint?: string
    children: ReactNode
}) {
    return (
        <label className="block">
            <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-slate-400">
                <span>{label}</span>
                {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
            </span>
            {children}
        </label>
    )
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    step,
    suffix,
}: {
    value: number
    onChange: (v: number) => void
    min?: number
    max?: number
    step?: number
    suffix?: string
}) {
    return (
        <div className="relative">
            <input
                type="number"
                value={Number.isFinite(value) ? value : ''}
                min={min}
                max={max}
                step={step}
                onChange={(e) => {
                    const v = e.target.valueAsNumber
                    onChange(Number.isNaN(v) ? 0 : v)
                }}
                className="w-full rounded-md border border-ink-600 bg-ink-900 px-3 py-1.5 pr-12 font-mono text-sm text-slate-100 outline-none transition focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
            />
            {suffix && (
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] uppercase text-slate-500">
                    {suffix}
                </span>
            )}
        </div>
    )
}

export function Stat({
    label,
    value,
    sub,
    tone = 'default',
}: {
    label: string
    value: string
    sub?: string
    tone?: 'default' | 'accent' | 'amber' | 'violet'
}) {
    const tones: Record<string, string> = {
        default: 'text-slate-100',
        accent: 'text-accent',
        amber: 'text-amber2',
        violet: 'text-violet2',
    }
    return (
        <div className="rounded-lg border border-ink-700/70 bg-ink-900/60 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
                {label}
            </div>
            <div className={`mt-0.5 font-mono text-sm font-semibold ${tones[tone]}`}>
                {value}
            </div>
            {sub && <div className="mt-0.5 text-[10px] text-slate-500">{sub}</div>}
        </div>
    )
}

export function Button({
    children,
    onClick,
    variant = 'primary',
    disabled,
    type = 'button',
    className = '',
}: {
    children: ReactNode
    onClick?: () => void
    variant?: 'primary' | 'ghost' | 'danger'
    disabled?: boolean
    type?: 'button' | 'submit'
    className?: string
}) {
    const styles: Record<string, string> = {
        primary:
            'bg-accent/90 text-ink-950 hover:bg-accent disabled:bg-ink-600 disabled:text-slate-500',
        ghost:
            'border border-ink-600 text-slate-300 hover:border-accent/50 hover:text-accent disabled:opacity-40',
        danger:
            'border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40',
    }
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
        >
            {children}
        </button>
    )
}

export function Badge({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'violet' | 'amber' | 'slate' }) {
    const tones: Record<string, string> = {
        accent: 'border-accent/40 bg-accent/10 text-accent',
        violet: 'border-violet2/40 bg-violet2/10 text-violet2',
        amber: 'border-amber2/40 bg-amber2/10 text-amber2',
        slate: 'border-ink-600 bg-ink-800 text-slate-400',
    }
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>
            {children}
        </span>
    )
}
