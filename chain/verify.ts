/** Independent on-chain verification of the recorded signatures. */
import { Connection } from '@solana/web3.js'
import { readState } from './env'

const conn = new Connection(process.env.DBC_RPC_URL || 'https://api.devnet.solana.com', 'confirmed')
const st = readState()
const keys: [string, string][] = [
  ['createConfigTx', st.createConfigTx],
  ['createPoolTx', st.createPoolTx],
  ['buyTx', st.buyTx],
  ['sellTx', st.sellTx],
]
let ok = true
for (const [label, sig] of keys) {
  if (!sig) { console.log(label, 'MISSING'); ok = false; continue }
  for (let attempt = 0; attempt < 8; attempt++) {
    const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })
    if (tx) {
      console.log(label, sig.slice(0, 20) + '...', 'slot', tx.slot, 'err:', JSON.stringify(tx.meta?.err), 'fee(lamports):', tx.meta?.fee)
      if (tx.meta?.err) ok = false
      break
    }
    if (attempt === 7) { console.log(label, sig, 'NOT FOUND'); ok = false }
    await new Promise(r => setTimeout(r, 3000))
  }
}
console.log(ok ? 'ALL VERIFIED ON-CHAIN ✔' : 'VERIFICATION FAILED ✘')
