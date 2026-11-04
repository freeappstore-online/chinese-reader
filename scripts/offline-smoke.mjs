import { chromium } from '@playwright/test'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const profile = await mkdtemp(join(tmpdir(), 'chinese-reader-offline-'))
const base = process.env.READER_URL || 'http://127.0.0.1:5180'
let context
try {
  await mkdir('artifacts', { recursive: true })
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 390, height: 844 } })
  let page = await context.newPage()
  await page.goto(base)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await page.getByRole('button', { name: 'Try the sample reading' }).click()
  await page.getByRole('button', { name: 'Save reading', exact: true }).click()
  await page.getByLabel('Chinese passage').getByRole('button', { name: /^下午,/ }).click()
  await page.getByLabel('Selected word').locator('svg path').first().waitFor({ state: 'attached' })
  await page.screenshot({ path: 'artifacts/mobile-inspector.png' })
  await page.setViewportSize({ width: 320, height: 740 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.getByRole('button', { name: 'Back to passage' }).click()
  await page.getByRole('button', { name: 'Open profile', exact: true }).click()
  await page.getByLabel('Theme', { exact: true }).selectOption('dark')
  await page.getByRole('button', { name: 'Back to reading', exact: true }).click()
  await page.screenshot({ path: 'artifacts/mobile-dark.png' })
  await context.close()
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 390, height: 844 }, offline: true })
  page = await context.newPage()
  await page.goto(`${base}/library`)
  await page.getByRole('heading', { name: 'An afternoon at the café' }).waitFor()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'New text', exact: true }).click()
  await page.getByLabel('Reading title').fill('Fresh offline text')
  await page.getByLabel('Your Chinese text', { exact: true }).fill('今天我去银行。')
  await page.getByRole('button', { name: 'Open my reading' }).click()
  await page.getByLabel('Chinese passage').getByRole('button', { name: /^银行, yín háng,/ }).waitFor()
  await page.screenshot({ path: 'artifacts/offline-reading.png' })
  console.log('PASS: production PWA reopened offline, restored library, annotated new text; 320px layout fits.')
} finally { await context?.close(); await rm(profile, { recursive: true, force: true }) }
