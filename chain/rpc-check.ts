/**
 * chain/rpc-check.ts — measured read-only health check against the configured
 * RPC endpoint (DBC_RPC_URL / RPC_URL / ANCHOR_PROVIDER_URL, devnet default).
 *
 * Used to verify provider integrations (e.g. RPC Fast) without touching the
 * launch flow: prints the endpoint host (API key masked), network label,
 * getVersion, a treasury getBalance, and per-call latency.
 *
 *   DBC_RPC_URL="https://solana-rpc.rpcfast.com/?api_key=…" npx tsx chain/rpc-check.ts
 */
import { RPC_URL, NET, FEE_CLAIMER_ADDRESS } from './env'

function maskEndpoint(url: string): string {
    try {
        const u = new URL(url)
        const key = u.searchParams.get('api_key')
        if (key) u.searchParams.set('api_key', key.slice(0, 6) + '…' + key.slice(-4))
        return u.toString()
    } catch {
        return url.replace(/api_key=[^&]+/, 'api_key=***')
    }
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const t0 = performance.now()
    const out = await fn()
    const ms = Math.round(performance.now() - t0)
    console.log(`  ${label}: ${ms}ms`)
    return out
}

async function rpc(method: string, params: unknown[] = []) {
    const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    const json = (await res.json()) as { result?: unknown; error?: unknown }
    if (json.error) throw new Error(`${method} error: ${JSON.stringify(json.error)}`)
    return json.result
}

async function main() {
    console.log(`RPC check — endpoint: ${maskEndpoint(RPC_URL)}`)
    console.log(`  detected network label: ${NET}`)

    const version = (await timed('getVersion', () => rpc('getVersion'))) as {
        'solana-core': string
    }
    console.log(`  solana-core: ${version['solana-core']}`)

    const bal = (await timed('getBalance(treasury)', () =>
        rpc('getBalance', [FEE_CLAIMER_ADDRESS]),
    )) as { context: { slot: number }; value: number }
    console.log(`  treasury ${FEE_CLAIMER_ADDRESS.slice(0, 6)}… balance: ${bal.value} lamports @ slot ${bal.context.slot}`)

    const bh = (await timed('getLatestBlockhash', () => rpc('getLatestBlockhash'))) as {
        context: { slot: number }
    }
    console.log(`  latest blockhash slot: ${bh.context.slot}`)
    console.log('RPC check OK')
}

main().catch((e) => {
    console.error('RPC check FAILED:', e.message)
    process.exit(1)
})
