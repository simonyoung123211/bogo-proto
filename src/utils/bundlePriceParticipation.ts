import { BUNDLE_PRICE_CHANNELS, BUNDLE_PRICE_ORDER_TYPES, normalizeBundleOrderTypes } from '../mockBundlePriceData'
import { products, stores } from '../mockData'
import type { BundlePriceActivityForm, ParticipationStatus } from '../types'
import { formatRuleSummary } from './bundlePriceActivity'

export interface BundlePriceParticipationRecord {
  id: string
  activityId: string
  orderId: string
  participatedAt: string
  storeId: string
  storeName: string
  userName: string
  userPhone: string
  pickupNo: string
  channel: string
  orderType: string
  hitLabel: string
  itemCount: number
  /** 进入打包价的商品及件数，如「卤鸭腿×2、薯条×1」 */
  productSummary: string
  bundlePrice: number
  /** 订单应付：参与商品原价合计 */
  payableAmount: number
  /** 订单实付：已支付为应付减优惠，已退款为 0 */
  paidAmount: number
  discountAmount: number
  orderedAt: string
  status: ParticipationStatus
}

const USERS = [
  { name: '小李', phone: '138****1024' },
  { name: '王女士', phone: '159****6631' },
  { name: '陈先生', phone: '186****2208' },
  { name: '周周', phone: '137****8840' },
  { name: '林小姐', phone: '150****3319' },
  { name: '赵先生', phone: '188****9072' },
]

function hash(text: string): number {
  let value = 0
  for (const ch of text) value = (value * 33 + ch.charCodeAt(0)) % 100000
  return value
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatAt(dayOffset: number, hour: number, minute: number): string {
  const date = new Date(2026, 9, 16)
  date.setDate(date.getDate() - dayOffset)
  return `2026-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour)}:${pad(minute)}:00`
}

function recordCountFor(status: BundlePriceActivityForm['status']): number {
  if (status === 'in_progress') return 8
  if (status === 'paused' || status === 'ended') return 4
  return 0
}

/** 按活动状态生成稳定的演示参与记录。草稿、待发布、未开始没有记录。 */
export function buildBundlePriceParticipationRecords(
  activities: BundlePriceActivityForm[],
): BundlePriceParticipationRecord[] {
  const rows: BundlePriceParticipationRecord[] = []
  for (const activity of activities) {
    const count = recordCountFor(activity.status)
    const activityStores = activity.storeScope === 'all' || activity.storeIds.length === 0
      ? stores.slice(0, 4)
      : stores.filter((store) => activity.storeIds.includes(store.id))
    const storePool = activityStores.length > 0 ? activityStores : stores.slice(0, 3)
    const productPool = products.filter((product) => activity.productIds.includes(product.id))
    const unitPrice = productPool.length > 0
      ? productPool.reduce((sum, product) => sum + product.price, 0) / productPool.length
      : 12
    const hit = activity.conditionMode === 'cyclic'
      ? { quantity: activity.cyclicQuantity, price: activity.cyclicPrice }
      : activity.tiers[0]
    const itemCount = hit?.quantity && hit.quantity > 0 ? hit.quantity : 3
    const bundlePrice = hit?.price && hit.price > 0 ? hit.price : 9.9
    const payableAmount = Math.round(unitPrice * itemCount * 100) / 100
    const discountAmount = Math.max(0, Math.round((payableAmount - bundlePrice) * 100) / 100)

    for (let i = 0; i < count; i += 1) {
      const seed = hash(`${activity.id}-${i}`)
      const user = USERS[seed % USERS.length]
      const store = storePool[seed % storePool.length]
      const channelId = activity.channels[seed % Math.max(activity.channels.length, 1)] ?? 'wechat'
      const rawOrderTypeId = activity.orderTypes[seed % Math.max(activity.orderTypes.length, 1)] ?? 'dine_in'
      const orderTypeId = normalizeBundleOrderTypes([rawOrderTypeId])[0] ?? 'dine_in'
      const hour = 10 + (seed % 10)
      const minute = seed % 60
      const at = formatAt(i, hour, minute)
      rows.push({
        id: `YKJR${activity.id.slice(-6)}${pad(i + 1)}`,
        activityId: activity.id,
        orderId: `DD202610${pad(16 - (i % 12))}${String(1000 + (seed % 8000)).padStart(4, '0')}`,
        participatedAt: at,
        storeId: store.id,
        storeName: store.name,
        userName: user.name,
        userPhone: user.phone,
        pickupNo: String(100 + (seed % 80)).padStart(3, '0'),
        channel: BUNDLE_PRICE_CHANNELS.find((item) => item.id === channelId)?.label ?? channelId,
        orderType: BUNDLE_PRICE_ORDER_TYPES.find((item) => item.id === orderTypeId)?.label ?? orderTypeId,
        hitLabel: formatRuleSummary(activity),
        itemCount,
        productSummary: formatProductSummary(productPool, itemCount, seed),
        bundlePrice,
        payableAmount,
        paidAmount: i % 7 === 0 ? 0 : Math.round((payableAmount - discountAmount) * 100) / 100,
        discountAmount,
        orderedAt: at,
        status: i % 7 === 0 ? 'refunded' : 'paid',
      })
    }
  }
  return rows.sort((a, b) => b.participatedAt.localeCompare(a.participatedAt))
}

const EXPORT_HEADERS = [
  '活动名称',
  '活动ID',
  '活动编码',
  '关联订单号',
  '下单时间',
  '参与门店',
  '参与渠道',
  '订单类型',
  '用户昵称',
  '用户手机号',
  '凑件件数',
  '参与商品',
  '订单应付(元)',
  '优惠金额(元)',
  '订单实付(元)',
  '支付状态',
] as const

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function formatProductSummary(
  productPool: { name: string }[],
  itemCount: number,
  seed: number,
): string {
  if (productPool.length === 0 || itemCount <= 0) return ''
  const first = productPool[seed % productPool.length]
  if (productPool.length === 1 || itemCount === 1) return `${first.name}×${itemCount}`
  const second = productPool[(seed + 1) % productPool.length]
  if (second.name === first.name) return `${first.name}×${itemCount}`
  const firstQty = 1 + (seed % (itemCount - 1))
  return `${first.name}×${firstQty}、${second.name}×${itemCount - firstQty}`
}

/** 按当前筛选结果生成参与明细。已退款的订单实付记为 0。 */
export function buildBundlePriceParticipationCsv(
  records: BundlePriceParticipationRecord[],
  activities: BundlePriceActivityForm[],
): string {
  const activityMap = new Map(activities.map((activity) => [activity.id, activity]))
  const lines = [EXPORT_HEADERS.join(',')]
  for (const record of records) {
    const activity = activityMap.get(record.activityId)
    lines.push([
      activity?.name || '未命名活动',
      record.activityId,
      activity?.activityCode || '',
      record.orderId,
      record.orderedAt,
      record.storeName,
      record.channel,
      record.orderType,
      record.userName,
      record.userPhone,
      record.itemCount,
      record.productSummary,
      record.payableAmount.toFixed(2),
      record.discountAmount.toFixed(2),
      record.paidAmount.toFixed(2),
      record.status === 'paid' ? '已支付' : '已退款',
    ].map(csvCell).join(','))
  }
  return lines.join('\n')
}

export function downloadBundlePriceParticipationCsv(csv: string): void {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `一口价参与记录_${stamp}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function countBundlePriceRecordsByActivity(
  records: BundlePriceParticipationRecord[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const record of records) {
    counts.set(record.activityId, (counts.get(record.activityId) ?? 0) + 1)
  }
  return counts
}
