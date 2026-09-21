/** Claim creator trading fees from a DBC pool (proves the fee-routing loop). */
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import { connection, loadOrCreateKeypair, sendAndConfirm, writeState, readState } from './env'

const pool = new PublicKey(process.argv[2] || readState().poolAddress)
const conn = connection()
const client = DynamicBondingCurveClient.create(conn, 'confirmed')
const creator = loadOrCreateKeypair('creator')

const before = await conn.getBalance(creator.publicKey)
const tx = await client.creator.claimCreatorTradingFee({
    creator: creator.publicKey,
    pool,
    payer: creator.publicKey,
    maxBaseAmount: new BN(0),
    maxQuoteAmount: new BN('18446744073709551615'), // u64 max: claim all quote fees
})
tx.feePayer = creator.publicKey
const sig = await sendAndConfirm(conn, tx, [creator])
const after = await conn.getBalance(creator.publicKey)
console.log('claim tx:', sig)
console.log('creator balance delta:', (after - before) / 1e9, 'SOL')
writeState({ claimCreatorFeeTx: sig, claimDeltaSol: (after - before) / 1e9 })
