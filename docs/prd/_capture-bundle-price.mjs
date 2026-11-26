/**
 * 一口价商家端 PRD 原型截图，并走通「满 3 件一口价 9.9」新建与阶梯校验。
 * 运行：node docs/prd/_capture-bundle-price.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'assets', 'bundle-price')
const BASE = process.env.BUNDLE_PRICE_BASE || 'http://127.0.0.1:5180/'

fs.mkdirSync(OUT, { recursive: true })

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? true })
  console.log('OK', name, fs.statSync(file).size)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(15000)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('.admin-main')
  await page.getByText('一口价', { exact: true }).first().click()
  await page.waitForTimeout(500)
  await page.getByRole('heading', { name: '一口价' }).waitFor()
  const seeded = await page.locator('.activity-name-cell__rule').first().innerText()
  assert(seeded.includes('满3件一口价9.9元'), `列表摘要不符合预期：${seeded}`)
  await shot(page, '01-list')

  await page.getByRole('button', { name: '新建活动' }).first().click()
  await page.waitForTimeout(400)
  await page.locator('input[placeholder="如：卤鸭腿一口价"]').fill('验收一口价')
  await page.locator('input[placeholder="如：3件9.9"]').fill('3件9.9')
  const ruleText = await page.locator('.wizard-step').innerText()
  assert(ruleText.includes('特价（打包一口价）'), '未锁定特价')
  assert(ruleText.includes('任意活动商品合计'), '未展示固定计件范围')
  assert(ruleText.includes('阶梯就高'), '未展示阶梯就高')
  assert(!ruleText.includes('循环满减'), '不应出现循环满减')
  await page.getByRole('button', { name: '高级选项' }).click()
  await page.waitForTimeout(200)
  await shot(page, '02-wizard-rules')

  await page.getByRole('button', { name: '+ 新增一级' }).click()
  const inputs = page.locator('.fr-tier-table input')
  await inputs.nth(3).fill('8')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.locator('.form-error').waitFor()
  const err1 = await page.locator('.form-error').innerText()
  assert(err1.includes('一口价金额须高于上一级'), `金额递增校验未生效：${err1}`)
  await shot(page, '03-tier-amount-error')

  await inputs.nth(2).fill('3')
  await inputs.nth(3).fill('15')
  await page.getByRole('button', { name: '下一步' }).click()
  const err2 = await page.locator('.form-error').innerText()
  assert(err2.includes('件数须大于上一级'), `件数递增校验未生效：${err2}`)
  await shot(page, '04-tier-quantity-error')

  await inputs.nth(2).fill('5')
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByText('参与门店').first().waitFor()
  const storeBox = page.locator('.store-picker tbody input[type="checkbox"]:not([disabled])').first()
  await storeBox.check()
  await shot(page, '05-wizard-stores')

  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '添加商品' }).click()
  await page.locator('.modal .table tbody tr.table-row--clickable').first().click()
  await page.locator('.modal__footer').getByRole('button', { name: '确定' }).click()
  await page.waitForTimeout(300)
  const productStepText = await page.locator('.wizard-step').innerText()
  assert(productStepText.includes('pos 改价商品'), `商品步未展示已选商品：${productStepText.slice(0, 240)}`)
  await shot(page, '06-wizard-products')

  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByText('配置摘要').waitFor()
  const preview = await page.locator('.activity-preview').innerText()
  assert(preview.includes('满3件一口价9.9元'), '预览未展示第一档')
  assert(preview.includes('满5件一口价15元'), '预览未展示第二档')
  assert(preview.includes('特价（打包一口价）'), '预览优惠方式不对')
  await shot(page, '07-wizard-preview')

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await page.getByRole('heading', { name: '一口价' }).waitFor()
  await page.waitForTimeout(400)
  const firstName = await page.locator('.activity-name-cell__name').first().innerText()
  const firstRule = await page.locator('.activity-name-cell__rule').first().innerText()
  assert(firstName.includes('验收一口价'), `保存后列表首行不是新活动：${firstName}`)
  assert(firstRule.includes('满3件一口价9.9元'), `保存后摘要不对：${firstRule}`)
  assert(firstRule.includes('满5件一口价15元'), `保存后未带上第二档：${firstRule}`)
  await shot(page, '08-list-after-save')

  await page.locator('.table--list tbody tr').first().locator('.row-action-menu__trigger').click()
  await page.waitForTimeout(200)
  const menu = await page.locator('.row-action-menu__dropdown').innerText()
  assert(menu.includes('编辑'), '缺少编辑')
  assert(menu.includes('复制'), '缺少复制')
  assert(menu.includes('发布'), '待发布活动缺少发布')
  assert(menu.includes('作废'), '待发布活动缺少作废')
  await page.keyboard.press('Escape')
  await page.locator('.table--list tbody tr', { hasText: '周末一口价草稿' }).locator('.row-action-menu__trigger').click()
  await page.waitForTimeout(200)
  const draftMenu = await page.locator('.row-action-menu__dropdown').innerText()
  assert(draftMenu.includes('删除'), '草稿缺少删除')
  await shot(page, '09-row-actions', { fullPage: false })

  console.log('FLOW_OK')
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
