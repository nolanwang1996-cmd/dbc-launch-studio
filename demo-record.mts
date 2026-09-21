/**
 * Demo recorder: drives the real UI in headless Chromium, records .webm video
 * and captures screenshots into ../demo/.
 *
 * Usage:  npx tsx demo-record.mts            (screenshots only)
 *         VIDEO=1 npx tsx demo-record.mts    (screenshots + video)
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3777'
const OUT = new URL('../demo/', import.meta.url).pathname // demo/
mkdirSync(OUT + 'raw', { recursive: true })
const WITH_VIDEO = process.env.VIDEO === '1'
// pool launched earlier by chain/run-flow.ts (see ../VERIFY.md)
const LIVE_POOL = 'GzRDmC7P2evninsmpfZKcMHucpXqGE5CVqRaD3Kap3sS'

const slow = (ms: number) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({ channel: 'chromium', headless: true })
const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: WITH_VIDEO
        ? { dir: OUT + 'raw', size: { width: 1440, height: 900 } }
        : undefined,
})
const page = await ctx.newPage()
page.setDefaultTimeout(15000)

async function shot(name: string) {
    await page.screenshot({ path: OUT + name })
    console.log('shot:', name)
}

// --- Scene 1: hero + curve designer -----------------------------------------
await page.goto(BASE, { waitUntil: 'networkidle' })
await slow(2500)
await shot('01-hero-designer.png')

// switch presets to show the curve reacting
await page.getByRole('button', { name: /Utility Token/ }).click()
await slow(1500)
await page.getByRole('button', { name: /Agent Token/ }).click()
await slow(1800)
await shot('02-preset-agent.png')

// --- Scene 2: trade flow simulator ------------------------------------------
const sim = page.locator('div', { hasText: 'Trade Flow Simulator' }).last()
await page.getByText('Trade Flow Simulator').scrollIntoViewIfNeeded()
await slow(1200)

async function addTrade(side: 'buy' | 'sell', amount: string, t: string) {
    await page.getByRole('button', { name: side, exact: true }).click()
    await slow(300)
    const amt = page.getByPlaceholder(side === 'buy' ? 'SOL in' : 'tokens in')
    await amt.fill(amount)
    await slow(300)
    // the simulator's t(sec) input is the number input right before the "t (sec)" label
    const timeInput = page.locator(
        'xpath=//span[contains(normalize-space(),"t (sec)")]/preceding-sibling::input[1]'
    )
    await timeInput.fill(t)
    await slow(300)
    await page.getByRole('button', { name: '+ Add trade' }).click()
    await slow(1400)
}

await addTrade('buy', '2', '5')
await addTrade('buy', '3', '30')
await addTrade('sell', '150000000', '90')
await addTrade('buy', '4', '150')
await slow(1500)
await shot('03-simulator.png')

// --- Scene 3: AI parameter assistant ----------------------------------------
await page.getByText(/AI Parameter Assistant|AI assistant/i).first().scrollIntoViewIfNeeded().catch(() => {})
const aiBox = page.getByPlaceholder(/fair meme launch/i)
await aiBox.scrollIntoViewIfNeeded()
await slow(800)
await aiBox.pressSequentially(
    'Fair meme launch, strong anti-sniper, graduate around 80 SOL, fees feed the agent treasury',
    { delay: 35 }
)
await slow(600)
await page.getByRole('button', { name: 'Send' }).click()
await slow(2500)
await shot('04-ai-assistant.png')
const applyBtn = page.getByRole('button', { name: /Apply to designer/ })
if (await applyBtn.count()) {
    await applyBtn.first().click()
    await slow(1200)
}

// --- Scene 4: one-click launch (real devnet transaction) --------------------
await page.getByText('One-Click Launch').scrollIntoViewIfNeeded()
await slow(800)
const launchCard = page.locator('div').filter({ hasText: 'One-Click Launch' }).last()
const inputs = page.locator('input:not([type=number])')
// name & symbol are the two text inputs inside the launch card
const nameInput = page.locator('input[maxlength="64"]')
const symbolInput = page.locator('input[maxlength="10"]')
await nameInput.fill('Agent Compute Credit')
await slow(300)
await symbolInput.fill('AGTC3')
await slow(300)
await shot('05-launch-form.png')

if (process.env.LAUNCH === '1') {
    await page.getByRole('button', { name: /Launch on devnet/ }).click()
    // wait for the success card (on-chain, can take 60-150s)
    await page
        .getByText(/Launched — pool is live on devnet|Launch failed|error/i)
        .first()
        .waitFor({ timeout: 240_000 })
        .catch(() => console.log('launch wait timed out'))
    await slow(2000)
    await shot('06-launch-result.png')
}

// --- Scene 5: live pool analytics -------------------------------------------
await page.getByText('Live Pool Analytics').scrollIntoViewIfNeeded()
const poolInput = page.getByPlaceholder(/Pool address/)
await poolInput.fill(LIVE_POOL)
await page.getByRole('button', { name: 'Load' }).click()
await slow(6000)
await shot('07-pool-analytics.png')
await slow(2000)

await ctx.close()
await browser.close()
console.log('demo recording done')
