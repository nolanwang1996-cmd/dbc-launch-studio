/** Update the AGTC mint's Metaplex metadata (name/symbol/uri) on mainnet.
 *  Manual UpdateMetadataAccountV2 instruction (no umi dependency). */
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { connection, loadOrCreateKeypair, sendAndConfirm } from './env'

const METAPLEX = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
const MINT = new PublicKey('2KYxjNxqUgpxTbpwFQMxXT6QbRJ8v8N63LC4Gb2SQnU7')
const METADATA_URI = 'https://raw.githubusercontent.com/nolanwang1996-cmd/dbc-launch-studio/main/assets/agtc-metadata.json'

function borshString(s: string): Buffer {
    const b = Buffer.from(s, 'utf8')
    const len = Buffer.alloc(4)
    len.writeUInt32LE(b.length)
    return Buffer.concat([len, b])
}

const conn = connection()
const partner = loadOrCreateKeypair('partner')

const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METAPLEX.toBuffer(), MINT.toBuffer()],
    METAPLEX
)
console.log('metadata PDA:', metadataPda.toBase58())
const info = await conn.getAccountInfo(metadataPda)
if (!info) throw new Error('metadata account not found')
// layout: key(1) updateAuthority(32) mint(32) name(4+32) symbol(4+10) uri(4+200)...
const updateAuthority = new PublicKey(info.data.subarray(1, 33))
console.log('current updateAuthority:', updateAuthority.toBase58())
console.log('our partner         :', partner.publicKey.toBase58())
if (!updateAuthority.equals(partner.publicKey)) {
    console.log('NOTE: update authority is the treasury vault (Seeker wallet) — metadata')
    console.log('updates must be signed on the Seeker. Skipping (not an error).')
    process.exit(0)
}
// read current name/uri for sanity
const nameLen = info.data.readUInt32LE(65)
const name = info.data.subarray(69, 69 + Math.min(nameLen, 32)).toString().replace(/\0+$/g, '')
console.log('current name:', name)

// DataV2 { name, symbol, uri, sellerFeeBasisPoints, creators: None }
const dataV2 = Buffer.concat([
    borshString('Agent Compute Credit'),
    borshString('AGTC'),
    borshString(METADATA_URI),
    (() => { const b = Buffer.alloc(2); b.writeUInt16LE(0); return b })(),
    Buffer.from([0]), // creators: None
])
// UpdateMetadataAccountV2 args: disc=15, Some(DataV2), updateAuthority None, primarySale None, isMutable Some(true)
const data = Buffer.concat([
    Buffer.from([15, 1]), dataV2,
    Buffer.from([0]), // new updateAuthority: None
    Buffer.from([0]), // primarySaleHappened: None
    Buffer.from([1, 1]), // isMutable: Some(true)
])
const ix = new TransactionInstruction({
    programId: METAPLEX,
    keys: [
        { pubkey: metadataPda, isSigner: false, isWritable: true },
        { pubkey: partner.publicKey, isSigner: true, isWritable: false },
    ],
    data,
})
const tx = new Transaction().add(ix)
tx.feePayer = partner.publicKey
const sig = await sendAndConfirm(conn, tx, [partner])
console.log('METADATA UPDATED ✔ tx:', sig)
console.log('https://explorer.solana.com/tx/' + sig)
