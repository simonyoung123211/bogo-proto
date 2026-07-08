import type {
  ActivityForm,
  ActivityParticipationRecord,
  GiftType,
  Order,
  ParticipationGiftBrief,
  ParticipationStatus,
} from './types'
import { couponTemplates, initialActivities, products, stores } from './mockData'
import { orders } from './orderData'

/** 参与状态标签 */
export const PARTICIPATION_STATUS_LABELS: Record<ParticipationStatus, string> = {
  paid: '已支付',
  refunded: '已退款',
}

/** 参与状态筛选 Tab（仅保留已支付、已退款） */
export const PARTICIPATION_STATUS_TABS: (ParticipationStatus | 'all')[] = [
  'all', 'paid', 'refunded',
]

const productMap = new Map(products.map((p) => [p.id, p]))
const storeMap = new Map(stores.map((s) => [s.id, s]))

const USER_NAMES = ['王女士', '李先生', '陈先生', '赵女士', '刘先生', '周女士', '吴先生', '郑女士', '孙先生', '钱女士']
const USER_PHONES = ['138****6621', '156****8319', '155****9982', '157****9092', '139****1120', '186****4457', '135****7788', '188****3345', '159****0012', '133****9008']
const ORDER_TYPES = ['普通订单', '预订单', '团购订单']
const ORDER_SOURCES = ['小程序订单', '微信小程序', '抖音小程序', '企业级测试POS']
const ORDER_CHANNELS = ['微信', '支付宝', '抖音', 'POS']
const PAID_ORDER_STATUSES: Order['status'][] = ['completed', 'completed', 'picked_up', 'made', 'ordered']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function addMinutes(base: string, minutes: number): string {
  const d = new Date(base.replace(/-/g, '/'))
  d.setMinutes(d.getMinutes() + minutes)
  return formatDateTime(d)
}

/** 寄存券有效期：自营业日起顺延 30 天 */
function couponValidity(businessDay: string): string {
  const start = new Date(businessDay.replace(/-/g, '/'))
  const end = new Date(start)
  end.setDate(end.getDate() + 30)
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return `${fmt(start)} 至 ${fmt(end)}`
}

const STORAGE_COUPON_TEMPLATE = couponTemplates[1]

function makeCouponGift(businessDay: string): ParticipationGiftBrief {
  return {
    name: STORAGE_COUPON_TEMPLATE.name,
    giftType: 'storage_coupon',
    quantity: 1,
    couponTemplateName: STORAGE_COUPON_TEMPLATE.name,
    validity: couponValidity(businessDay),
  }
}

/** 参与时间落在活动窗口内（不晚于「当前」演示时间） */
function participationTime(activity: ActivityForm, k: number): string {
  const start = new Date(activity.startTime.replace(/-/g, '/'))
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const demoNow = new Date('2026-06-22T23:59:59')
  const upper = end < demoNow ? end : demoNow
  const spanDays = Math.max(1, Math.round((upper.getTime() - start.getTime()) / 86_400_000))
  const d = new Date(start)
  d.setDate(d.getDate() + (k * 3 + 1) % spanDays)
  d.setHours(9 + (k % 12), (k * 7) % 60, 0, 0)
  return formatDateTime(d)
}

/** 选取活动的触发商品 */
function pickTriggerProduct(activity: ActivityForm, k: number) {
  const ids = activity.productScope === 'partial' && activity.productIds.length > 0
    ? activity.productIds
    : products.map((p) => p.id)
  const id = ids[k % ids.length]
  return productMap.get(id) ?? products[k % products.length]
}

/** 根据活动规则构造赠品明细 */
function buildGiftBriefs(activity: ActivityForm, triggerName: string, k: number, businessDay: string): {
  gifts: ParticipationGiftBrief[]
  giftValue: number
} {
  const gifts: ParticipationGiftBrief[] = []
  let giftValue = 0

  if (activity.ruleType === 'buyA_getA') {
    const prod = pickTriggerProduct(activity, k)
    gifts.push({ name: `${triggerName}（赠品）`, giftType: 'physical', quantity: 1 })
    giftValue += prod.price
    // 买A送A 若开启赠品寄存，或按演示分布，附带寄存券
    if (activity.buyAStorageGift?.storageEnabled || k % 3 === 1) {
      gifts.push(makeCouponGift(businessDay))
    }
    return { gifts, giftValue }
  }

  const groups = activity.giftGroups.length > 0 ? activity.giftGroups : []
  groups.forEach((g, gi) => {
    const pid = g.physicalProductIds[k % Math.max(1, g.physicalProductIds.length)]
    const prod = pid ? productMap.get(pid) : undefined
    if (prod) {
      gifts.push({ name: `${prod.name}（赠品）`, giftType: 'physical', quantity: 1 })
      giftValue += prod.price
    }
    if (g.couponGift.storageEnabled && gi === 0) {
      gifts.push({
        name: g.couponGift.couponTemplate?.name ?? STORAGE_COUPON_TEMPLATE.name,
        giftType: 'storage_coupon',
        quantity: 1,
        couponTemplateName: g.couponGift.couponTemplate?.name ?? STORAGE_COUPON_TEMPLATE.name,
        validity: couponValidity(businessDay),
      })
    }
  })
  if (gifts.length === 0) {
    const prod = products[(k + 5) % products.length]
    gifts.push({ name: `${prod.name}（赠品）`, giftType: 'physical', quantity: 1 })
    giftValue += prod.price
  }
  // 演示分布：部分买A送B记录附带寄存券
  if (!gifts.some((g) => g.giftType === 'storage_coupon') && k % 3 === 1) {
    gifts.push(makeCouponGift(businessDay))
  }
  return { gifts, giftValue }
}

function pickStore(activity: ActivityForm, k: number) {
  const ids = activity.storeScope !== 'all' && activity.storeIds.length > 0
    ? activity.storeIds
    : stores.map((s) => s.id)
  const id = ids[k % ids.length]
  return storeMap.get(id) ?? stores[k % stores.length]
}

/** 每个活动生成的参与记录条数（进行中更多，已结束略少） */
function recordCountFor(activity: ActivityForm, index: number): number {
  if (activity.status === 'in_progress') return 8 + ((index * 5 + 7) % 13)
  if (activity.status === 'ended') return 5 + ((index * 3 + 4) % 8)
  return 0
}

function generateForActivity(activity: ActivityForm, index: number): ActivityParticipationRecord[] {
  const count = recordCountFor(activity, index)
  if (count === 0) return []

  const ruleName = activity.ruleType === 'buyA_getA' ? '买A送A' : '买A送B'
  const records: ActivityParticipationRecord[] = []

  for (let k = 0; k < count; k++) {
    const trigger = pickTriggerProduct(activity, k)
    const store = pickStore(activity, k)
    const qty = (k % 3) + 1

    const orderedAt = participationTime(activity, k)
    const paidAt = addMinutes(orderedAt, (k % 3) + 1)
    const businessDay = orderedAt.slice(0, 10)

    const { gifts, giftValue } = buildGiftBriefs(activity, trigger.name, k, businessDay)
    const giftTypes = [...new Set(gifts.map((g) => g.giftType))] as GiftType[]

    const basePaid = trigger.price * qty
    const payable = basePaid + giftValue
    const discountAmount = giftValue

    const isRefunded = k % 7 === 6
    const orderStatus: Order['status'] = isRefunded ? 'refunded' : PAID_ORDER_STATUSES[k % PAID_ORDER_STATUSES.length]
    const status: ParticipationStatus = isRefunded ? 'refunded' : 'paid'

    // 循环复用真实订单号，保证「查看原订单」可跳转
    const linkedOrder = orders[(index * 7 + k) % orders.length]

    records.push({
      id: `PR${activity.id}${pad(k + 1)}`,
      activityId: activity.id,
      orderId: linkedOrder.id,
      participatedAt: paidAt,
      businessDay,
      storeId: store.id,
      storeName: store.name,
      userName: USER_NAMES[(index + k) % USER_NAMES.length],
      userPhone: USER_PHONES[(index * 3 + k) % USER_PHONES.length],
      pickupNo: pad(k + 1),
      channel: ORDER_CHANNELS[k % ORDER_CHANNELS.length],
      ruleName,
      triggerProducts: [`${trigger.name} ×${qty}`],
      giftProducts: gifts,
      giftTypes,
      discountAmount,
      orderType: ORDER_TYPES[k % ORDER_TYPES.length],
      source: ORDER_SOURCES[k % ORDER_SOURCES.length],
      payable,
      paid: basePaid,
      orderedAt,
      paidAt,
      isNewUserAtParticipation: (index + k) % 3 === 0,
      orderStatus,
      status,
    })
  }

  return records
}

/**
 * 营销参与事实表：以活动维度独立生成，覆盖每个进行中/已结束活动，
 * 关联订单号仅作引用，供活动参与记录查询与后续统计分析使用。
 */
export const participationRecords: ActivityParticipationRecord[] = initialActivities
  .flatMap((activity, index) => generateForActivity(activity, index))
