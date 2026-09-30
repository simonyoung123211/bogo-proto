/**
 * 已停业门店自动剔除 · PRD 原型截图
 * 运行：node docs/prd/_capture-store-closure.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'assets', 'store-closure')
const BASE = 'http://127.0.0.1:5180/'

fs.mkdirSync(OUT, { recursive: true })

async function clearHl(page) {
  await page.evaluate(() => document.querySelectorAll('[data-prd-hl]').forEach((el) => el.remove()))
}

async function highlight(page, selectorOrFn) {
  await clearHl(page)
  return page.evaluate((arg) => {
    let el = null
    if (typeof arg === 'string') el = document.querySelector(arg)
    else {
      // find by text content helpers passed as type tag
    }
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    const hl = document.createElement('div')
    hl.setAttribute('data-prd-hl', '1')
    Object.assign(hl.style, {
      position: 'fixed',
      left: `${r.left - 4}px`,
      top: `${r.top - 4}px`,
      width: `${r.width + 8}px`,
      height: `${r.height + 8}px`,
      border: '3px solid #e11d48',
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: '99999',
      boxSizing: 'border-box',
    })
    document.body.appendChild(hl)
    return true
  }, selectorOrFn)
}

async function highlightByText(page, text, rootSel = 'body') {
  await clearHl(page)
  return page.evaluate(
    ({ text, rootSel }) => {
      const root = document.querySelector(rootSel) || document.body
      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if ((node.textContent || '').includes(text)) return node.parentElement
          return null
        }
        for (const c of node.childNodes) {
          const hit = walk(c)
          if (hit) return hit
        }
        return null
      }
      let el = walk(root)
      if (!el) return false
      // prefer badge/button if nearby
      const badge = el.closest('.store-issue-badge, .store-summary-cell, button, .store-issue-banner')
      if (badge) el = badge
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      const hl = document.createElement('div')
      hl.setAttribute('data-prd-hl', '1')
      Object.assign(hl.style, {
        position: 'fixed',
        left: `${r.left - 4}px`,
        top: `${r.top - 4}px`,
        width: `${r.width + 8}px`,
        height: `${r.height + 8}px`,
        border: '3px solid #e11d48',
        borderRadius: '8px',
        pointerEvents: 'none',
        zIndex: '99999',
        boxSizing: 'border-box',
      })
      document.body.appendChild(hl)
      return true
    },
    { text, rootSel },
  )
}

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(250)
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false })
  console.log('OK', name, fs.statSync(file).size)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(20000)

  // fresh storage so demo activities exist and store not already closed
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const keep = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.includes('store') || k.includes('promo-inbox') || k.includes('bogo-activities'))) {
        keep.push(k)
      }
    }
    // reset activity + store registry + inbox for clean demo
    Object.keys(localStorage).forEach((k) => {
      if (
        k.startsWith('bogo-activities') ||
        k.startsWith('promo-inbox') ||
        k.startsWith('store-registry') ||
        k.includes('storeClosure') ||
        k.includes('closed-stores')
      ) {
        localStorage.removeItem(k)
      }
    })
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.admin-main')

  // ensure 买1送N list
  const bogoNav = page.getByText('买1送N', { exact: true }).first()
  if (await bogoNav.count()) await bogoNav.click()
  await page.waitForTimeout(600)

  // 01 list with simulate button
  await highlightByText(page, '模拟门店已停业')
  await shot(page, '01-list-simulate-entry')
  await clearHl(page)

  // 02 open modal
  await page.getByRole('button', { name: '模拟门店已停业' }).click()
  await page.waitForTimeout(500)
  await shot(page, '02-simulate-modal')

  // pick store that is in demo activities - usually show store list
  // Prefer 高新 / s2 related
  const storeOption = page.locator('label, .radio, .checkbox, select, option, .store-option, tr').filter({ hasText: /高新|s2|旗舰/ }).first()
  if (await page.locator('select').count()) {
    const sel = page.locator('select').first()
    const opts = await sel.locator('option').allTextContents()
    console.log('select options', opts.slice(0, 8))
    // choose second option if first is placeholder
    const values = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value))
    const pick = values.find((v) => v && v !== '') || values[1]
    if (pick) await sel.selectOption(pick)
  } else if (await storeOption.count()) {
    await storeOption.click({ force: true })
  } else {
    // click first radio in modal
    const radio = page.locator('.modal label.radio, .modal input[type=radio]').first()
    if (await radio.count()) await radio.click({ force: true })
  }
  await page.waitForTimeout(300)
  await shot(page, '03-simulate-modal-selected')

  await page.getByRole('button', { name: /确认已停业并清理/ }).click()
  await page.waitForTimeout(900)

  // 04 list after cleanup with badges
  await page.locator('.status-tab', { hasText: '所有活动' }).first().click().catch(() => {})
  await page.waitForTimeout(400)
  // search demo activities
  const kw = page.getByPlaceholder(/活动名称|搜索|关键词/).first()
  if (await kw.count()) {
    await kw.fill('已停业清理演示')
    await page.waitForTimeout(400)
  }
  await highlightByText(page, '有效参与门店为 0')
  const hasS1 = await page.getByText('有效参与门店为 0').count()
  const hasS2 = await page.getByText('不参与门店已清空').count()
  console.log('badges S1', hasS1, 'S2', hasS2)
  await shot(page, '04-list-after-cleanup-badges')
  await clearHl(page)

  // also highlight S2 if present in another shot
  if (hasS2) {
    await highlightByText(page, '不参与门店已清空')
    await shot(page, '05-list-S2-badge')
    await clearHl(page)
  }

  // 06 open view of S1 activity
  const s1Row = page.locator('tr, [class*=row]').filter({ hasText: '有效参与门店为 0' }).first()
  if (await s1Row.count()) {
    const viewBtn = s1Row.getByRole('button', { name: /查看/ }).first()
    if (await viewBtn.count()) await viewBtn.click()
    else await s1Row.click({ force: true })
  } else {
    await page.getByText('已停业清理演示·指定参与').first().click({ force: true }).catch(() => {})
  }
  await page.waitForTimeout(800)
  // jump to preview if wizard
  const previewBtn = page.getByRole('button', { name: /预览并保存|预览/ })
  if (await previewBtn.count()) {
    await previewBtn.last().click({ force: true }).catch(() => {})
    await page.waitForTimeout(600)
  }
  await highlightByText(page, '参与门店已清空')
  await shot(page, '06-detail-S1-banner')
  await clearHl(page)

  // back to list
  const cancel = page.getByRole('button', { name: /取消|返回|关闭/ }).first()
  if (await cancel.count()) await cancel.click().catch(() => {})
  await page.waitForTimeout(400)
  // try navigate list via sidebar
  await page.getByText('买1送N', { exact: true }).first().click().catch(() => {})
  await page.waitForTimeout(500)

  // 07 open S2 detail if exists
  if (await page.getByText('已停业清理演示·指定不参与').count()) {
    const s2Row = page.locator('tr').filter({ hasText: '已停业清理演示·指定不参与' }).first()
    if (await s2Row.count()) {
      const vb = s2Row.getByRole('button', { name: /查看/ }).first()
      if (await vb.count()) await vb.click()
      else await page.getByText('已停业清理演示·指定不参与').first().click({ force: true })
      await page.waitForTimeout(700)
      const pb = page.getByRole('button', { name: /预览并保存|预览/ })
      if (await pb.count()) await pb.last().click({ force: true }).catch(() => {})
      await page.waitForTimeout(500)
      await highlightByText(page, '不参与门店已清空')
      await shot(page, '07-detail-S2-banner')
      await clearHl(page)
      if (await cancel.count()) await cancel.click().catch(() => {})
      await page.getByText('买1送N', { exact: true }).first().click().catch(() => {})
      await page.waitForTimeout(400)
    }
  }

  // 08 inbox
  const bell = page.locator('button[aria-label="站内信"], button[aria-label="通知"]').first()
  if (await bell.count()) await bell.click()
  else await page.locator('.admin-header__icon-btn').nth(1).click({ force: true })
  await page.waitForTimeout(600)
  await shot(page, '08-inbox-drawer')

  // 09 store picker - edit a new activity or edit existing
  await page.keyboard.press('Escape').catch(() => {})
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '新建活动' }).click()
  await page.waitForTimeout(600)
  await page.getByPlaceholder('请输入活动名称').fill('截图-选店已停业').catch(() => {})
  // go to store step
  const next = page.getByRole('button', { name: '下一步' })
  if (await next.count()) {
    await next.click()
    await page.waitForTimeout(500)
  }
  // select partial include
  const partial = page.locator('label.radio').filter({ hasText: /部分门店参与|指定参与/ }).first()
  if (await partial.count()) await partial.click()
  await page.waitForTimeout(400)
  // open store picker if button
  const pickStore = page.getByRole('button', { name: /选择门店|添加门店|选门店/ }).first()
  if (await pickStore.count()) await pickStore.click()
  await page.waitForTimeout(600)
  // highlight closed hint
  await highlightByText(page, '已停业')
  await shot(page, '09-store-picker-closed')
  await clearHl(page)

  await browser.close()
  console.log('done ->', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
