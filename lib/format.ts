/** Friendly number formatting helpers for the studio UI. */

/** Compact token amounts: 1.23B / 456M / 12.3K */
export function formatCompact(n: number, digits = 2): string {
    if (!isFinite(n)) return '—'
    const abs = Math.abs(n)
    if (abs >= 1e12) return (n / 1e12).toFixed(digits) + 'T'
    if (abs >= 1e9) return (n / 1e9).toFixed(digits) + 'B'
    if (abs >= 1e6) return (n / 1e6).toFixed(digits) + 'M'
    if (abs >= 1e3) return (n / 1e3).toFixed(digits) + 'K'
    return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

/** SOL amounts with sensible precision. */
export function formatSol(n: number): string {
    if (!isFinite(n)) return '—'
    const abs = Math.abs(n)
    if (abs >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
    if (abs >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 3 })
    if (abs >= 1e-4) return n.toFixed(6)
    if (abs === 0) return '0'
    return n.toExponential(2)
}

/** Price in SOL per token — always tiny, use significant digits. */
export function formatPrice(n: number): string {
    if (!isFinite(n) || n === 0) return '—'
    if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 })
    if (n >= 1e-6) return n.toPrecision(4)
    return n.toExponential(2)
}

export function formatPct(n: number, digits = 1): string {
    if (!isFinite(n)) return '—'
    return n.toFixed(digits) + '%'
}

export function formatBps(bps: number): string {
    return (bps / 100).toFixed(2) + '%'
}

/** Shorten a base58 address: 7YhF…T1PG */
export function shortAddr(a: string, head = 4, tail = 4): string {
    if (a.length <= head + tail + 3) return a
    return `${a.slice(0, head)}…${a.slice(-tail)}`
}
