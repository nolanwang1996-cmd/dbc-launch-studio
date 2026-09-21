import { chromium } from 'playwright'

const OUT = new URL('./', import.meta.url).pathname

const card = (inner: string) => `<!doctype html><html><body style="margin:0;width:1920px;height:1080px;background:#0b0f17;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,Helvetica,Arial,sans-serif;gap:28px">${inner}</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

await page.setContent(card(`
  <div style="color:#2dd4bf;font-size:92px;font-weight:800">DBC Launch Studio</div>
  <div style="color:#f1f5f9;font-size:44px">Design · Simulate · Launch Meteora Dynamic Bonding Curve tokens</div>
  <div style="color:#94a3b8;font-size:34px">with trading fees routed to an autonomous agent treasury</div>
  <div style="color:#64748b;font-size:26px;margin-top:60px">Colosseum Crypto World's Fair — Meteora DBC track · Solana devnet</div>
`))
await page.screenshot({ path: OUT + 'card-title.png' })

await page.setContent(card(`
  <div style="color:#2dd4bf;font-size:76px;font-weight:800">Verified on Solana devnet</div>
  <div style="color:#f1f5f9;font-size:40px">createConfig · createPool · buy · sell — all confirmed, err = null</div>
  <div style="color:#94a3b8;font-size:32px"><span style="font-family:monospace;background:#111827;padding:6px 14px;border-radius:8px">npm run chain:verify</span>&nbsp; re-fetches every signature from chain</div>
  <div style="color:#a78bfa;font-size:30px;margin-top:24px">Agent treasury (on-chain feeClaimer): 7YhFp4Rj…sdPkejAWT1PG</div>
  <div style="color:#64748b;font-size:24px;margin-top:50px">github · README + VERIFY.md in this repo</div>
`))
await page.screenshot({ path: OUT + 'card-end.png' })

await browser.close()
console.log('cards rendered')
