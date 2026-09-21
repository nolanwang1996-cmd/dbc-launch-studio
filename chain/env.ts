import { Connection, Keypair } from '@solana/web3.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = join(__dirname, '..')
export const KEYS_DIR = join(PROJECT_ROOT, '.keys')
export const STATE_FILE = join(PROJECT_ROOT, 'chain', '.state.json')

export const RPC_URL =
    process.env.DBC_RPC_URL || 'https://api.devnet.solana.com'
export const EXPLORER = 'https://explorer.solana.com'

// Fee routing vault: protocol fee claimer / agent treasury (payout address)
export const FEE_CLAIMER_ADDRESS =
    '7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG'

export function connection(): Connection {
    return new Connection(RPC_URL, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 90_000,
    })
}

export function loadOrCreateKeypair(name: string): Keypair {
    mkdirSync(KEYS_DIR, { recursive: true })
    const file = join(KEYS_DIR, `${name}.json`)
    if (existsSync(file)) {
        const raw = JSON.parse(readFileSync(file, 'utf8')) as number[]
        return Keypair.fromSecretKey(Uint8Array.from(raw))
    }
    const kp = Keypair.generate()
    writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), {
        mode: 0o600,
    })
    return kp
}

export function readState(): Record<string, any> {
    if (!existsSync(STATE_FILE)) return {}
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'))
}

export function writeState(patch: Record<string, any>) {
    const next = { ...readState(), ...patch }
    writeFileSync(STATE_FILE, JSON.stringify(next, null, 2))
}

export function explorerTx(sig: string): string {
    return `${EXPLORER}/tx/${sig}?cluster=devnet`
}

export function explorerAddr(addr: string): string {
    return `${EXPLORER}/address/${addr}?cluster=devnet`
}

export async function fundWithAirdrop(
    conn: Connection,
    kp: Keypair,
    sol = 2,
    retries = 5
): Promise<void> {
    const bal = await conn.getBalance(kp.publicKey)
    if (bal >= 0.5 * 1e9) return
    for (let i = 0; i < retries; i++) {
        try {
            const sig = await conn.requestAirdrop(
                kp.publicKey,
                sol * 1e9
            )
            const bh = await conn.getLatestBlockhash()
            await conn.confirmTransaction(
                {
                    signature: sig,
                    blockhash: bh.blockhash,
                    lastValidBlockHeight: bh.lastValidBlockHeight,
                },
                'confirmed'
            )
            return
        } catch (e: any) {
            const wait = 5_000 * (i + 1)
            console.log(
                `airdrop attempt ${i + 1} failed (${e?.message?.slice(0, 80)}), retry in ${wait / 1000}s`
            )
            await new Promise((r) => setTimeout(r, wait))
        }
    }
    throw new Error('airdrop failed after retries')
}

export async function sendAndConfirm(
    conn: Connection,
    tx: any,
    signers: Keypair[]
): Promise<string> {
    const { sendAndConfirmTransaction } = await import('@solana/web3.js')
    return sendAndConfirmTransaction(conn, tx, signers, {
        commitment: 'confirmed',
        skipPreflight: false,
    })
}
