/**
 * Client-safe constants. The agent treasury vault address is fixed by the
 * studio deployment — it is a fee *recipient* only, never a signer, and its
 * private key must never exist in this app.
 */
export const AGENT_TREASURY_ADDRESS =
    '7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG'

export const EXPLORER = 'https://explorer.solana.com'

export function explorerAddr(addr: string): string {
    return `${EXPLORER}/address/${addr}?cluster=devnet`
}

export function explorerTx(sig: string): string {
    return `${EXPLORER}/tx/${sig}?cluster=devnet`
}
