import type { ActivityForm, Product } from '../types'
import { products } from '../mockData'

/** 消费者端固定承接的买A送B活动 ID */
export const CONSUMER_BOGO_ACTIVITY_ID = 'act-bogo-001'

export const DEMO_BRIDGE_SOURCE_KEY = 'bogo-demo-bridge-source-id'
export const DEMO_BRIDGE_API = '/api/demo-bogo-bridge'

/** 与消费者端 BuyOneGetOneActivity 对齐的桥接载荷（避免跨仓类型依赖） */
export interface ConsumerBogoBridgeActivity {
  id: string
  type: 'buy_one_get_one'
  title: string
  shortTag: string
  subtitle: string
  rules: string[]
  ruleFields?: { label: string; value: string }[]
  description?: string
  eligibleProductIds: string[]
  defaultSpecsByProduct: Record<string, { groupId: string; optionId: string }[]>
  giftGroups: Array<{
    id: string
    type: 'physical' | 'coupon'
    title: string
    subtitle: string
    icon: string
    physicalSkus?: Array<{
      id: string
      productId: string
      productName: string
      specsText: string
      specsShort?: string
      originalPrice?: number
      soldOut?: boolean
    }>
    coupon?: {
      id: string
      title: string
      faceValue: number
      minSpend?: number
      desc: string
      expireDays: number
      kind?: 'discount' | 'exchange'
      redeemProductIds?: string[]
      redeemLabel?: string
    }
  }>
  extraGiftGroup?: {
    id: string
    title: string
    subtitle: string
    items: Array<{
      id: string
      type: 'physical' | 'coupon'
      productName?: string
      specsText?: string
      originalPrice?: number
      giftKind?: 'merch' | 'snack'
      soldOut?: boolean
      coupon?: {
        id: string
        title: string
        faceValue: number
        minSpend?: number
        desc: string
        expireDays: number
      }
    }>
  }
  memberOnly?: boolean
  giftRule?: 'choose_from_list' | 'same_as_threshold'
  /** 赠品组1在选赠品页的副标题说明；未填写则不展示 */
  giftGroup1Subtitle?: string
  giftDiscountCapByMainSku?: boolean
  toppingsDiscount?: boolean
  preparationSurchargeDiscount?: boolean
}

export interface DemoBogoBridgePayload {
  version: 1
  updatedAt: string
  merchantActivityId: string
  consumerActivityId: string
  activity: ConsumerBogoBridgeActivity
}

/** 消费者端菜单已知商品 ID（与 User/点餐优惠计算 mock 对齐） */
const CONSUMER_MENU_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'] as const
const DEFAULT_ELIGIBLE = ['p3', 'p9']
const DEFAULT_GIFT_IDS = ['p1', 'p2', 'p4', 'p7', 'p10']

function findProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

function toConsumerMenuIds(ids: string[], fallback: string[]): string[] {
  const hit = ids.filter((id) => (CONSUMER_MENU_IDS as readonly string[]).includes(id))
  return hit.length ? hit : fallback
}

function toPhysicalSku(productId: string) {
  const p = findProduct(productId)
  if (!p) {
    return {
      id: `gift-sku-${productId}`,
      productId,
      productName: `商品${productId}`,
      specsText: '标准',
      specsShort: '标准',
      originalPrice: 0,
    }
  }
  return {
    id: `gift-sku-${p.id}`,
    productId: p.id,
    productName: p.name,
    specsText: p.spec || '标准',
    specsShort: p.spec || '标准',
    originalPrice: p.price,
  }
}

/** 商家端买A送B → 消费者端活动结构 */
export function mapMerchantBogoToConsumer(activity: ActivityForm): ConsumerBogoBridgeActivity {
  const group1 = activity.giftGroups[0]
  const group2 = activity.giftGroups[1]

  const giftGroups: ConsumerBogoBridgeActivity['giftGroups'] = []

  if (group1) {
    giftGroups.push({
      id: 'gift-physical',
      type: 'physical',
      title: group1.physicalDisplayTitle || '当单立享',
      subtitle: '多款商品任选 1 件',
      icon: '🎁',
      physicalSkus: toConsumerMenuIds(group1.physicalProductIds || [], DEFAULT_GIFT_IDS).map(toPhysicalSku),
    })

    if (group1.couponGift?.storageEnabled && group1.couponGift.couponTemplate) {
      const tpl = group1.couponGift.couponTemplate
      const redeemIds = toConsumerMenuIds(group1.physicalProductIds || [], DEFAULT_GIFT_IDS)
      giftGroups.push({
        id: 'gift-coupon',
        type: 'coupon',
        title: group1.couponGift.displayTitle || '我要寄存，下次用',
        subtitle: '赠送商品优惠券',
        icon: '🎫',
        coupon: {
          id: tpl.id,
          title: tpl.name,
          // 开启限额时展示/发券以主品SKU售价为准；此处写入赠品最高标价作兜底参考
          faceValue: Math.max(
            0,
            ...redeemIds.map((id) => findProduct(id)?.price ?? 0),
          ),
          minSpend: 0,
          desc: activity.giftDiscountCapByMainSku
            ? '发券后，下次使用最高可优惠本单饮品售价'
            : '订单完成后发放至优惠券助手',
          expireDays: tpl.validityDaysMax || 14,
          kind: 'exchange',
          redeemProductIds: redeemIds,
          redeemLabel: '指定赠品饮品',
        },
      })
    }
  }

  let extraGiftGroup: ConsumerBogoBridgeActivity['extraGiftGroup']
  if (group2) {
    const items: NonNullable<ConsumerBogoBridgeActivity['extraGiftGroup']>['items'] = []
    toConsumerMenuIds(group2.physicalProductIds || [], ['p6', 'p7']).forEach((pid) => {
      const sku = toPhysicalSku(pid)
      items.push({
        id: `extra-${pid}`,
        type: 'physical',
        productName: sku.productName,
        specsText: sku.specsText,
        originalPrice: sku.originalPrice,
        giftKind: 'snack',
      })
    })
    if (group2.couponGift?.storageEnabled && group2.couponGift.couponTemplate) {
      const tpl = group2.couponGift.couponTemplate
      items.push({
        id: `extra-coupon-${tpl.id}`,
        type: 'coupon',
        coupon: {
          id: tpl.id,
          title: tpl.name,
          faceValue: 12,
          minSpend: 0,
          desc: tpl.type || '商品券',
          expireDays: tpl.validityDaysMax || 30,
        },
      })
    }
    if (items.length) {
      extraGiftGroup = {
        id: group2.id || 'extra-gift-001',
        title: '加赠好礼',
        subtitle: '额外赠送，任选 1 件',
        items,
      }
    }
  }

  const eligibleRaw =
    activity.productScope === 'all'
      ? [...DEFAULT_ELIGIBLE, 'p1', 'p2']
      : (activity.productIds || []).filter(Boolean)
  const eligible = toConsumerMenuIds(eligibleRaw, DEFAULT_ELIGIBLE)

  const defaultSpecsByProduct: ConsumerBogoBridgeActivity['defaultSpecsByProduct'] = {}
  eligible.forEach((id) => {
    defaultSpecsByProduct[id] = [
      { groupId: 'size', optionId: 's' },
      { groupId: 'temp', optionId: 'warm' },
      { groupId: 'sugar', optionId: 's70' },
    ]
  })

  return {
    id: CONSUMER_BOGO_ACTIVITY_ID,
    type: 'buy_one_get_one',
    title: activity.title || activity.name || '买一送一',
    shortTag: activity.tag || '买A送B',
    subtitle: activity.description?.slice(0, 40) || '指定饮品买1件，赠实物或优惠券',
    rules: [],
    ruleFields: [
      { label: '活动时间', value: `${activity.startTime} ~ ${activity.endTime}` },
      {
        label: '赠品优惠',
        value: activity.giftDiscountCapByMainSku
          ? '不超过本单饮品售价'
          : '赠品整件免费',
      },
      {
        label: '加料是否优惠',
        value: activity.toppingsDiscount ? '可优惠' : '需另付',
      },
      {
        label: '做法加价是否优惠',
        value: activity.preparationSurchargeDiscount ? '可优惠' : '需另付',
      },
      { label: '同享规则', value: '赠品不参与其他优惠' },
    ],
    description: activity.description || activity.name,
    eligibleProductIds: eligible.length ? eligible : ['p3', 'p9'],
    defaultSpecsByProduct,
    giftGroups,
    extraGiftGroup,
    memberOnly: activity.participantUser === 'registered_member',
    giftRule: 'choose_from_list',
    giftGroup1Subtitle: group1?.displaySubtitle?.trim() || undefined,
    giftDiscountCapByMainSku: !!activity.giftDiscountCapByMainSku,
    toppingsDiscount: activity.toppingsDiscount !== false,
    preparationSurchargeDiscount: activity.preparationSurchargeDiscount !== false,
  }
}

export function getDemoBridgeSourceId(): string | null {
  try {
    return localStorage.getItem(DEMO_BRIDGE_SOURCE_KEY)
  } catch {
    return null
  }
}

export function setDemoBridgeSourceId(activityId: string | null) {
  try {
    if (!activityId) localStorage.removeItem(DEMO_BRIDGE_SOURCE_KEY)
    else localStorage.setItem(DEMO_BRIDGE_SOURCE_KEY, activityId)
  } catch {
    /* ignore */
  }
}

export async function pushDemoBogoBridge(activity: ActivityForm): Promise<void> {
  if (activity.ruleType !== 'buyA_getB') {
    throw new Error('仅买A送B活动可同步到消费者端 Demo')
  }
  const payload: DemoBogoBridgePayload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    merchantActivityId: activity.id,
    consumerActivityId: CONSUMER_BOGO_ACTIVITY_ID,
    activity: mapMerchantBogoToConsumer(activity),
  }
  const res = await fetch(DEMO_BRIDGE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`同步失败 HTTP ${res.status}`)
}

/** 保存活动列表后：若存在已关联的买A送B，自动推送到消费者端 */
export async function syncLinkedBogoIfNeeded(activities: ActivityForm[]): Promise<string | null> {
  const sourceId = getDemoBridgeSourceId()
  if (!sourceId) return null
  const activity = activities.find((a) => a.id === sourceId && a.ruleType === 'buyA_getB')
  if (!activity) return null
  await pushDemoBogoBridge(activity)
  return activity.id
}
