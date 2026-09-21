/**
 * /api/panta/[...path] — server-side proxy for the Panta prediction-market API.
 *
 * Key resolution (NEVER logged, NEVER returned):
 *   1. <workspace>/.secrets/panta.env  (PANTA_API_KEY=pk_test_…)
 *   2. process.env.PANTA_API_KEY
 *   Missing → 503 JSON.
 *
 * Known endpoints are delegated to the live-tested typed client in
 * lib/panta.ts (listMarkets / quoteLaunchMarket); any other path is
 * transparently forwarded with the X-Api-Key header. 30s timeout;
 * upstream status + body are passed through on errors.
 *
 * Test key → Panta sandbox fixture data (no mainnet side effects).
 */
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    listMarkets,
    quoteLaunchMarket,
    PANTA_BASE_URL,
    type LaunchMarketInput,
} from '@/lib/panta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 30_000

const __dirname = dirname(fileURLToPath(import.meta.url))
// dbc-launch-studio/app/api/panta/[...path] → work/cwsf/.secrets/panta.env
const PANTA_ENV_FILE = join(__dirname, '..', '..', '..', '..', '..', '.secrets', 'panta.env')

function resolveApiKey(): string | null {
    try {
        if (existsSync(PANTA_ENV_FILE)) {
            const raw = readFileSync(PANTA_ENV_FILE, 'utf8')
            const line = raw
                .split('\n')
                .find((l) => l.trim().startsWith('PANTA_API_KEY='))
            const k = line?.split('=').slice(1).join('=').trim()
            if (k) return k
        }
    } catch {
        // fall through to env var
    }
    const envKey = process.env.PANTA_API_KEY?.trim()
    return envKey || null
}

/** Make the key available to lib/panta.ts (its key() reads process.env). */
function ensureKey(): string | null {
    const k = resolveApiKey()
    if (k && !process.env.PANTA_API_KEY) process.env.PANTA_API_KEY = k
    return k
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
    return Promise.race([
        p,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Panta upstream timeout (30s)')), TIMEOUT_MS)
        ),
    ])
}

/** lib/panta.ts throws `Panta <path> -> <status>: <json body>` — unpack it. */
function pantaError(e: any): NextResponse {
    const msg: string = e?.message || String(e)
    if (msg.includes('timeout')) {
        return NextResponse.json({ error: msg }, { status: 504 })
    }
    const m = msg.match(/-> (\d{3}): (.*)$/s)
    if (m) {
        return new NextResponse(m[2], {
            status: Number(m[1]),
            headers: { 'content-type': 'application/json' },
        })
    }
    return NextResponse.json({ error: msg }, { status: 502 })
}

function str(v: unknown, max = 500): string {
    return String(v ?? '').slice(0, max)
}
function num(v: unknown, fallback: number): number {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

/** Generic passthrough for paths without a typed client function. */
async function passthrough(
    req: NextRequest,
    path: string,
    apiKey: string
): Promise<NextResponse> {
    const url = `${PANTA_BASE_URL}/${path ? path + '/' : ''}${req.nextUrl.search}`
    const headers: Record<string, string> = {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
    }
    const init: RequestInit = {
        method: req.method,
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'manual',
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = await req.text()
        headers['Content-Type'] =
            req.headers.get('content-type') ?? 'application/json'
    }
    let upstream: Response
    try {
        upstream = await fetch(url, init)
    } catch (e: any) {
        return NextResponse.json(
            { error: `Panta upstream unreachable: ${e?.message || 'network error'}` },
            { status: 502 }
        )
    }
    const body = await upstream.text()
    return new NextResponse(body, {
        status: upstream.status,
        headers: {
            'content-type':
                upstream.headers.get('content-type') ?? 'application/json',
        },
    })
}

async function handle(req: NextRequest, pathSegments: string[]) {
    const apiKey = ensureKey()
    if (!apiKey) {
        return NextResponse.json(
            {
                error: 'PANTA_API_KEY not configured',
                detail: 'Missing .secrets/panta.env and PANTA_API_KEY env var',
            },
            { status: 503 }
        )
    }

    const path = pathSegments.filter(Boolean).join('/')

    try {
        // typed, live-tested endpoints via lib/panta.ts
        if (req.method === 'GET' && path === 'markets') {
            const items = await withTimeout(listMarkets())
            return NextResponse.json({ items })
        }
        if (req.method === 'POST' && path === 'markets/create/quote') {
            const raw = await req.json().catch(() => ({}))
            const now = Math.floor(Date.now() / 1000)
            const input: LaunchMarketInput = {
                wallet: str(raw.wallet, 64),
                question: str(raw.question, 300),
                title: str(raw.title, 120),
                description: str(raw.description, 1000),
                resolutionRule: str(raw.resolutionRule, 500),
                sourcesOfTruth: Array.isArray(raw.sourcesOfTruth)
                    ? raw.sourcesOfTruth.map((s: unknown) => str(s, 300)).slice(0, 5)
                    : [],
                imageUrl: str(raw.imageUrl, 300),
                startTime: num(raw.startTime, now + 3600),
                endTime: num(raw.endTime, now + 7 * 86400),
                resolutionTime: num(raw.resolutionTime, now + 7 * 86400 + 3600),
            }
            const quote = await withTimeout(quoteLaunchMarket(input))
            return NextResponse.json(quote)
        }
    } catch (e: any) {
        return pantaError(e)
    }

    return passthrough(req, path, apiKey)
}

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ path: string[] }> }
) {
    return handle(req, (await ctx.params).path)
}

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ path: string[] }> }
) {
    return handle(req, (await ctx.params).path)
}
