import { Connection, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js'
import { loadOrCreateKeypair } from './env'
const conn = new Connection(process.env.DBC_RPC_URL || 'https://api.devnet.solana.com', 'confirmed')
const partner = loadOrCreateKeypair('partner')
const trader = loadOrCreateKeypair('trader')
const bal = await conn.getBalance(trader.publicKey)
if (bal < 1 * LAMPORTS_PER_SOL) {
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: partner.publicKey, toPubkey: trader.publicKey, lamports: 2 * LAMPORTS_PER_SOL }))
  const sig = await sendAndConfirmTransaction(conn, tx, [partner])
  console.log('transfer tx:', sig)
}
for (const [n,k] of [['partner',partner],['trader',trader]] as const) console.log(n, (await conn.getBalance(k.publicKey))/1e9, 'SOL')
