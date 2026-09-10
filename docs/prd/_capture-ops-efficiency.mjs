/**
 * 运营效率优化 PRD 原型截图采集
 * 运行：node docs/prd/_capture-ops-efficiency.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'assets', 'ops-efficiency')
const BASE = 'http://127.0.0.1:5180/'

fs.mkdirSync(OUT, { recursive: true })

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

  // ========== 1 暂停 ==========
  await page.getByText('买1送N', { exact: true }).first().click()
  await page.waitForTimeout(500)
  await page.locator('.status-tab', { hasText: '进行中' }).first().click()
  await page.waitForTimeout(400)
  await shot(page, '01-bogo-list-pause-tab')

  // 打开第一行「更多」
  const firstMore = page.locator('.table--list tbody tr').first().locator('.row-action-menu__trigger')
  await firstMore.click()
  await page.waitForTimeout(300)
  await shot(page, '02-bogo-row-menu-pause', { fullPage: false })

  await page.getByText('暂停活动', { exact: true }).first().click()
  await page.waitForTimeout(400)
  await shot(page, '03-bogo-pause-confirm', { fullPage: false })
  await page.getByRole('button', { name: '取消' }).first().click()
  await page.waitForTimeout(300)

  // 确认暂停一条，便于拍已暂停列表
  await firstMore.click()
  await page.waitForTimeout(200)
  await page.getByText('暂停活动', { exact: true }).first().click()
  await page.waitForTimeout(200)
  const confirmPause = page.getByRole('button', { name: /确认暂停|确定/ })
  if (await confirmPause.count()) await confirmPause.last().click()
  await page.waitForTimeout(500)

  await page.locator('.status-tab', { hasText: '已暂停' }).first().click()
  await page.waitForTimeout(400)
  await shot(page, '04-bogo-paused-list')

  // ========== 2 参与记录 ==========
  await page.locator('.status-tab', { hasText: '所有活动' }).first().click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '参与记录' }).first().click()
  await page.waitForTimeout(700)
  await shot(page, '05-participation-all')

  await page.getByRole('button', { name: /选择活动/ }).first().click()
  await page.waitForTimeout(500)
  await shot(page, '06-participation-picker', { fullPage: false })

  const pickerRows = page.locator('.activity-picker__list tbody tr.table-row--clickable')
  const pn = Math.min(3, await pickerRows.count())
  for (let i = 0; i < pn; i++) await pickerRows.nth(i).click()
  await page.waitForTimeout(200)
  await shot(page, '07-participation-picker-selected', { fullPage: false })
  await page.locator('.modal__footer').getByRole('button', { name: '确定' }).click()
  await page.waitForTimeout(500)
  await shot(page, '08-participation-multi-detail')

  await page.getByRole('button', { name: '按活动汇总' }).click()
  await page.waitForTimeout(400)
  await shot(page, '09-participation-by-activity')

  await page.getByRole('button', { name: /返回活动列表/ }).click()
  await page.waitForTimeout(400)

  // ========== 3 已选商品检索 ==========
  // 用会员价：商品配置步更容易有检索条；或买1送N 编辑后点步骤 3
  await page.getByText('会员价', { exact: true }).first().click()
  await page.waitForTimeout(600)
  await page.locator('.status-tab', { hasText: '所有活动' }).first().click().catch(() => {})
  await page.waitForTimeout(300)

  // 找可编辑行 → 更多 → 编辑
  const mpRow = page.locator('.table--list tbody tr').first()
  await mpRow.locator('.row-action-menu__trigger').click()
  await page.waitForTimeout(200)
  const editBtn = page.locator('.row-action-menu__dropdown').getByText('编辑', { exact: true })
  if (await editBtn.count()) {
    await editBtn.click()
  } else {
    // 关闭菜单，点查看后找编辑；或新建
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: /新建/ }).first().click()
  }
  await page.waitForTimeout(800)

  // 会员价向导步骤：点「参与商品」类步骤
  for (let i = 0; i < 6; i++) {
    if (await page.locator('.selected-product-search__input').count()) break
    // 点击步骤条
    const steps = page.locator('.wizard-steps__item, .steps-nav button, .wizard-nav button, [class*="step"]')
    const productStep = page.locator('button, .wizard-steps__item, .step').filter({ hasText: /商品|优惠设置|规则/ })
    if (await productStep.count()) {
      // try each
      const count = await productStep.count()
      for (let j = 0; j < count; j++) {
        const t = await productStep.nth(j).innerText().catch(() => '')
        if (/商品|优惠/.test(t)) {
          await productStep.nth(j).click().catch(() => {})
          await page.waitForTimeout(400)
          if (await page.locator('.selected-product-search__input').count()) break
        }
      }
    }
    if (await page.locator('.selected-product-search__input').count()) break
    const next = page.getByRole('button', { name: '下一步' })
    if (await next.count()) {
      await next.click()
      await page.waitForTimeout(500)
    } else break
  }

  // 若仍没有：确保选了部分商品并有已选
  if (!(await page.locator('.selected-product-search__input').count())) {
    const partial = page.getByText('部分商品', { exact: true })
    if (await partial.count()) {
      await partial.first().click()
      await page.waitForTimeout(300)
    }
    const add = page.getByRole('button', { name: /添加商品/ })
    if (await add.count()) {
      await add.first().click()
      await page.waitForTimeout(500)
      // 勾选若干商品确认
      const checks = page.locator('.modal input[type=checkbox], .picker-main input[type=checkbox]')
      const cn = Math.min(8, await checks.count())
      for (let i = 0; i < cn; i++) {
        await checks.nth(i).check({ force: true }).catch(() => checks.nth(i).click())
      }
      const confirm = page.locator('.modal__footer').getByRole('button', { name: /确定|确认/ })
      if (await confirm.count()) await confirm.click()
      await page.waitForTimeout(500)
    }
  }

  if (await page.locator('.selected-product-search__input').count()) {
    await page.locator('.selected-product-search__input').scrollIntoViewIfNeeded()
    await shot(page, '10-selected-product-search-bar')
    await page.fill('.selected-product-search__input', 'a')
    await page.waitForTimeout(400)
    // 若无结果换关键词
    const empty = page.locator('.table-empty-state')
    if (await empty.count()) {
      await page.fill('.selected-product-search__input', '')
      await page.waitForTimeout(200)
      // 取第一行商品名的前两字
      const firstName = page.locator('.table--list tbody tr td').first()
      const text = (await firstName.innerText().catch(() => '商品')).trim().slice(0, 2)
      await page.fill('.selected-product-search__input', text || '1')
      await page.waitForTimeout(400)
    }
    await shot(page, '11-selected-product-filtered')
  } else {
    console.log('FAIL product search still missing, dump body snippet')
    const html = await page.locator('.admin-main').innerText()
    console.log(html.slice(0, 500))
    await shot(page, '10-selected-product-fallback')
  }

  // 取消向导
  const cancel = page.getByRole('button', { name: /取消|返回/ }).first()
  if (await cancel.count()) {
    await cancel.click()
    await page.waitForTimeout(300)
    const leave = page.getByRole('button', { name: /确定|离开|不保存/ })
    if (await leave.count()) await leave.first().click()
  }

  // ========== 4 付费会员价草稿 ==========
  await page.getByText('付费会员价', { exact: true }).first().click()
  await page.waitForTimeout(700)
  await shot(page, '12-paid-member-list-draft-tab')
  await page.locator('.status-tab', { hasText: '草稿' }).first().click()
  await page.waitForTimeout(400)
  await shot(page, '13-paid-member-draft-list')

  // 打开草稿编辑看保存草稿按钮
  const draftMore = page.locator('.table--list tbody tr').first().locator('.row-action-menu__trigger')
  if (await draftMore.count()) {
    await draftMore.click()
    await page.waitForTimeout(200)
    const dEdit = page.locator('.row-action-menu__dropdown').getByText('编辑', { exact: true })
    if (await dEdit.count()) {
      await dEdit.click()
      await page.waitForTimeout(700)
      await shot(page, '14-paid-member-draft-wizard')
    }
  }

  await browser.close()
  console.log('done', OUT)
  console.log(fs.readdirSync(OUT).join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
