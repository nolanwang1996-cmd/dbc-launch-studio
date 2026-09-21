/** Read back the live pool state from devnet and print analytics. */
import { Connection, PublicKey } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { readState } from './env'

async function main() {
    const st = readState()
    const poolArg = process.argv[2] || st.poolAddress
    if (!poolArg) throw new Error('no pool address (arg or .state.json)')
    const conn = new Connection(
        process.env.DBC_RPC_URL || 'https://api.devnet.solana.com',
        'confirmed'
    )
    const client = DynamicBondingCurveClient.create(conn, 'confirmed')
    const pool = await client.state.getPool(new PublicKey(poolArg))
    if (!pool) throw new Error('pool not found on ' + conn.rpcEndpoint)
    const cfg = await client.state.getPoolConfig(pool.poolState.config)
    const ps = pool.poolState
    const quoteReserve = ps.quoteReserve.toNumber() / 1e9
    const baseReserve = ps.baseReserve.toNumber() / 1e6
    const threshold = (cfg as any).migrationQuoteThreshold.toNumber() / 1e9
    console.log('pool           :', poolArg)
    console.log('baseMint       :', ps.baseMint.toBase58())
    console.log('creator        :', ps.creator.toBase58())
    console.log('config         :', ps.config.toBase58())
    console.log('baseReserve    :', baseReserve.toLocaleString(), 'tokens')
    console.log('quoteReserve   :', quoteReserve, 'SOL')
    console.log('migrationThresh:', threshold, 'SOL')
    console.log(
        'migrationProg  :',
        ((quoteReserve / threshold) * 100).toFixed(4) + '%'
    )
    console.log('migrated       :', (ps as any).isMigrated ?? 'n/a')
    console.log('feeClaimer     :', (cfg as any).feeClaimer?.toBase58?.() ?? 'n/a')
}
main().catch((e) => {
    console.error(e.message)
    process.exit(1)
})
