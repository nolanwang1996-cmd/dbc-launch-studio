/**
 * End-to-end devnet flow for DBC Launch Studio:
 *   createConfig -> createPool -> buy -> sell
 * Prints real transaction signatures and persists addresses in chain/.state.json
 *
 * Run:  HTTPS_PROXY=http://127.0.0.1:8892 NODE_USE_ENV_PROXY=1 npm run chain:flow
 */
import { Keypair, PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import BN from 'bn.js'
import {
    deriveDbcPoolAddress,
    DynamicBondingCurveClient,
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import {
    connection,
    explorerAddr,
    explorerTx,
    FEE_CLAIMER_ADDRESS,
    fundWithAirdrop,
    loadOrCreateKeypair,
    readState,
    sendAndConfirm,
    writeState,
} from './env'
import { buildStudioConfig, PRESETS } from '../lib/studio'

const BUY_SOL = 0.05
const SELL_FRACTION = 0.5

async function main() {
    const conn = connection()
    const client = DynamicBondingCurveClient.create(conn, 'confirmed')

    const partner = loadOrCreateKeypair('partner') // pays for config, receives leftover
    const creator = loadOrCreateKeypair('creator') // pool creator
    const trader = loadOrCreateKeypair('trader') // buys & sells

    console.log('RPC:', conn.rpcEndpoint)
    console.log('partner :', partner.publicKey.toBase58())
    console.log('creator :', creator.publicKey.toBase58())
    console.log('trader  :', trader.publicKey.toBase58())
    console.log('feeClaimer (agent vault):', FEE_CLAIMER_ADDRESS)

    // --- fund wallets -------------------------------------------------------
    for (const [name, kp, sol] of [
        ['partner', partner, 1],
        ['creator', creator, 1],
        ['trader', trader, 1],
    ] as const) {
        await fundWithAirdrop(conn, kp, sol)
        console.log(
            `${name} balance:`,
            ((await conn.getBalance(kp.publicKey)) / 1e9).toFixed(4),
            'SOL'
        )
    }

    // --- 1. createConfig ----------------------------------------------------
    const preset = PRESETS.find((p) => p.id === 'agent')!
    const curveConfig = buildStudioConfig(preset)

    let state = readState()
    let configPubkey: string
    if (!state.configAddress) {
        const config = Keypair.generate()
        const tx = await client.partner.createConfig({
            config: config.publicKey,
            feeClaimer: FEE_CLAIMER_ADDRESS as any, // agent treasury vault
            leftoverReceiver: partner.publicKey,
            payer: partner.publicKey,
            quoteMint: NATIVE_MINT,
            ...curveConfig,
        })
        tx.feePayer = partner.publicKey
        const sig = await sendAndConfirm(conn, tx, [partner, config])
        configPubkey = config.publicKey.toBase58()
        writeState({
            configAddress: configPubkey,
            createConfigTx: sig,
            preset: preset.id,
        })
        console.log('\n[1] createConfig OK')
        console.log('    config:', explorerAddr(configPubkey))
        console.log('    tx    :', explorerTx(sig))
    } else {
        configPubkey = state.configAddress
        console.log('\n[1] createConfig skipped (exists):', configPubkey)
    }

    // --- 2. createPool ------------------------------------------------------
    state = readState()
    let poolAddress: string, baseMintAddress: string
    if (!state.poolAddress) {
        const baseMint = Keypair.generate()
        const tx = await client.creator.createPool({
            baseMint: baseMint.publicKey,
            config: configPubkey as any,
            name: 'Agent Compute Credit',
            symbol: 'AGTC',
            uri: 'https://arweave.net/placeholder-dbc-launch-studio',
            payer: creator.publicKey,
            poolCreator: creator.publicKey,
        })
        tx.feePayer = creator.publicKey
        const sig = await sendAndConfirm(conn, tx, [baseMint, creator])
        poolAddress = deriveDbcPoolAddress(
            NATIVE_MINT,
            baseMint.publicKey,
            configPubkey as any
        ).toBase58()
        baseMintAddress = baseMint.publicKey.toBase58()
        writeState({ poolAddress, baseMint: baseMintAddress, createPoolTx: sig })
        console.log('\n[2] createPool OK')
        console.log('    pool :', explorerAddr(poolAddress))
        console.log('    mint :', explorerAddr(baseMintAddress))
        console.log('    tx   :', explorerTx(sig))
    } else {
        poolAddress = state.poolAddress
        baseMintAddress = state.baseMint
        console.log('\n[2] createPool skipped (exists):', poolAddress)
    }

    // let the anti-sniper fee scheduler fully decay before trading
    const waitS = Math.max(5, preset.feeDurationSeconds + 2)
    console.log(`\nwaiting ${waitS}s for fee scheduler to decay...`)
    await new Promise((r) => setTimeout(r, waitS * 1000))

    // --- 3. buy -------------------------------------------------------------
    state = readState()
    if (!state.buyTx) {
        const amountIn = new BN(Math.round(BUY_SOL * 1e9))
        const tx = await client.pool.swap({
            owner: trader.publicKey,
            payer: trader.publicKey,
            pool: poolAddress as any,
            amountIn,
            minimumAmountOut: new BN(1),
            swapBaseForQuote: false,
            referralTokenAccount: null,
        })
        tx.feePayer = trader.publicKey
        const sig = await sendAndConfirm(conn, tx, [trader])
        writeState({ buyTx: sig, buySol: BUY_SOL })
        console.log('\n[3] BUY OK:', BUY_SOL, 'SOL')
        console.log('    tx:', explorerTx(sig))
    } else {
        console.log('\n[3] buy skipped (exists):', state.buyTx)
    }

    // --- 4. sell ------------------------------------------------------------
    state = readState()
    if (!state.sellTx) {
        const { getAssociatedTokenAddressSync } = await import(
            '@solana/spl-token'
        )
        const ata = getAssociatedTokenAddressSync(
            new PublicKey(baseMintAddress),
            trader.publicKey
        )
        const bal = await conn.getTokenAccountBalance(ata)
        const raw = BigInt(bal.value.amount)
        const sellAmount = new BN((raw / 2n).toString())
        console.log(
            `    trader holds ${bal.value.uiAmountString} AGTC, selling ${(
                Number(sellAmount.toString()) / 1e6
            ).toLocaleString()}`
        )
        const tx = await client.pool.swap({
            owner: trader.publicKey,
            payer: trader.publicKey,
            pool: new PublicKey(poolAddress),
            amountIn: sellAmount,
            minimumAmountOut: new BN(1),
            swapBaseForQuote: true,
            referralTokenAccount: null,
        })
        tx.feePayer = trader.publicKey
        const sig = await sendAndConfirm(conn, tx, [trader])
        writeState({ sellTx: sig })
        console.log('\n[4] SELL OK')
        console.log('    tx:', explorerTx(sig))
    } else {
        console.log('\n[4] sell skipped (exists):', state.sellTx)
    }

    // --- 5. read back pool state -------------------------------------------
    const poolState = await client.state.getPool(new PublicKey(poolAddress))
    const poolConfig = await client.state.getPoolConfig(new PublicKey(configPubkey))
    const quoteReserve = poolState!.poolState.quoteReserve.toNumber() / 1e9
    const threshold =
        (poolConfig as any).migrationQuoteThreshold.toNumber() / 1e9
    console.log('\n[5] pool state')
    console.log('    quoteReserve        :', quoteReserve.toFixed(6), 'SOL')
    console.log('    migrationThreshold  :', threshold.toFixed(4), 'SOL')
    console.log(
        '    migration progress  :',
        ((quoteReserve / threshold) * 100).toFixed(2) + '%'
    )
    writeState({ quoteReserve, migrationThreshold: threshold })
    console.log('\nDONE ✔  all signatures written to chain/.state.json')
}

main().catch((e) => {
    console.error('FLOW FAILED:', e?.message || e)
    if (e?.logs) console.error(e.logs.slice(-10).join('\n'))
    process.exit(1)
})
