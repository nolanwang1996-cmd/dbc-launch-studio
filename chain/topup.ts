/** One-off: top up trader from creator on mainnet. */
import { SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { connection, loadOrCreateKeypair } from './env'
const conn = connection()
const creator = loadOrCreateKeypair('creator')
const trader = loadOrCreateKeypair('trader')
const need = 0.0075 * 1e9 - (await conn.getBalance(trader.publicKey))
if (need > 0) {
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: creator.publicKey, toPubkey: trader.publicKey, lamports: Math.ceil(need) + 10000 }))
  const sig = await sendAndConfirmTransaction(conn, tx, [creator])
  console.log('topup tx:', sig)
} else console.log('trader already funded')
console.log('creator', (await conn.getBalance(creator.publicKey))/1e9, 'trader', (await conn.getBalance(trader.publicKey))/1e9)
