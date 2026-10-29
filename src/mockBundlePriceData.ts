import type { ActivityOperationLog, BundlePriceActivityForm, BundlePriceTier } from './types'
import { getCreatorProfile } from './mockData'

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function buildLog(
  action: string,
  profile: { phone: string; org: string },
  detail: string,
  operatedAt: string,
): ActivityOperationLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    operatorPhone: profile.phone,
    operatorOrg: profile.org,
    operatedAt,
    detail,
  }
}

/** 一口价阶梯上限 */
export const MAX_BUNDLE_PRICE_TIERS = 10

/** 一口价参与渠道，与正式产品一致 */
export const BUNDLE_PRICE_CHANNELS = [
  { id: 'wechat', label: '微信小程序', icon: '微' },
  { id: 'alipay', label: '支付宝小程序', icon: '支' },
  { id: 'pos', label: '企迈数店POS', icon: '企' },
  { id: 'douyin', label: '抖音小程序', icon: '抖' },
] as const

/** 一口价参与业务场景，与正式产品一致 */
export const BUNDLE_PRICE_ORDER_TYPES = [
  { id: 'dine_in', label: '堂食' },
  { id: 'pack', label: '外带' },
  { id: 'delivery', label: '外卖（配送）' },
  { id: 'delivery_pickup', label: '外卖（自取）' },
  { id: 'store_express', label: '门店快递' },
  { id: 'cake_pickup', label: '蛋糕自取' },
  { id: 'cake_delivery', label: '蛋糕外卖' },
] as const

const BUNDLE_CHANNEL_IDS = new Set<string>(BUNDLE_PRICE_CHANNELS.map((item) => item.id))
const BUNDLE_ORDER_TYPE_IDS = new Set<string>(BUNDLE_PRICE_ORDER_TYPES.map((item) => item.id))

/** 旧枚举迁到一口价现行业务场景 */
const LEGACY_ORDER_TYPE_MAP: Record<string, string> = {
  takeaway: 'delivery',
  takeaway_platform: 'delivery',
  takeaway_self: 'delivery',
  pickup: 'delivery_pickup',
}

export function normalizeBundleChannels(ids: string[]): string[] {
  return ids.filter((id) => BUNDLE_CHANNEL_IDS.has(id))
}

export function normalizeBundleOrderTypes(ids: string[]): string[] {
  const next: string[] = []
  for (const id of ids) {
    const mapped = LEGACY_ORDER_TYPE_MAP[id] ?? id
    if (BUNDLE_ORDER_TYPE_IDS.has(mapped) && !next.includes(mapped)) next.push(mapped)
  }
  return next
}

export function createDefaultBundlePriceTier(): BundlePriceTier {
  return {
    id: `tier-${Date.now()}`,
    quantity: 3,
    price: 9.9,
  }
}

export function createEmptyBundlePriceActivity(): BundlePriceActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
  const createdAt = formatDateTime(now)
  return {
    id: `YKJ${Date.now()}`,
    name: '',
    title: '',
    description: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    timeSlotType: 'all_day',
    priority: 1,
    channels: ['wechat'],
    orderTypes: ['dine_in', 'pack', 'delivery'],
    conditionMode: 'tiered',
    cyclicQuantity: 3,
    cyclicPrice: 9.9,
    priceHitRule: 'high_to_low',
    tiers: [createDefaultBundlePriceTier()],
    maxBundleGroupsPerOrderType: 'unlimited',
    maxBundleGroupsPerOrder: 1,
    totalParticipationLimitType: 'unlimited',
    totalParticipationLimit: 1,
    participationFrequencyType: 'unlimited',
    participationFrequencyPeriod: 'daily',
    participationFrequencyLimit: 1,
    productScope: 'partial',
    productIds: [],
    productSelectionMode: 'include',
    storeScope: 'partial_include',
    storeIds: [],
    shareMutexRelation: 'mutex_all',
    participantUser: 'all_users',
    memberTagId: '',
    activityCode: '',
    titleDisplay: 'show',
    tagDisplay: 'show',
    status: 'draft',
    creator: '10086',
    creatorPhone: profile.phone,
    creatorOrg: profile.org,
    createdAt,
    updatedAt: createdAt,
    operationLogs: [buildLog('创建活动', profile, '创建活动草稿', createdAt)],
  }
}

function seed(
  overrides: Partial<BundlePriceActivityForm> & Pick<BundlePriceActivityForm, 'id' | 'name' | 'status'>,
): BundlePriceActivityForm {
  const base = createEmptyBundlePriceActivity()
  const profile = {
    phone: overrides.creatorPhone ?? base.creatorPhone,
    org: overrides.creatorOrg ?? base.creatorOrg,
  }
  const createdAt = overrides.createdAt ?? '2026-10-01 10:00:00'
  const updatedAt = overrides.updatedAt ?? createdAt
  const logs = overrides.operationLogs ?? [
    buildLog('创建活动', profile, `创建活动「${overrides.name}」`, createdAt),
    ...(overrides.status !== 'draft'
      ? [buildLog('发布活动', profile, `发布活动「${overrides.name}」`, updatedAt)]
      : []),
  ]
  return { ...base, ...overrides, createdAt, updatedAt, operationLogs: logs }
}

export const initialBundlePriceActivities: BundlePriceActivityForm[] = [
  seed({
    id: 'YKJ20261001001',
    name: '卤鸭腿一口价',
    title: '3件9.9',
    description: '任意活动商品每满 3 件，合计 9.9 元，可循环。',
    conditionMode: 'cyclic',
    cyclicQuantity: 3,
    cyclicPrice: 9.9,
    tiers: [{ id: 'bp-t1', quantity: 3, price: 9.9 }],
    startTime: '2026-10-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
    productScope: 'partial',
    productIds: ['p4', 'p5', 'p6'],
    storeScope: 'partial_include',
    storeIds: ['s1', 's2', 's5'],
    status: 'in_progress',
    activityCode: 'YKJ-DUCK',
  }),
  seed({
    id: 'YKJ20261008002',
    name: '小食阶梯一口价',
    title: '凑件更省',
    description: '满 3 件合计 9.9 元，满 5 件合计 15 元，按已达到的最高一级结算。',
    conditionMode: 'tiered',
    tiers: [
      { id: 'bp-t2a', quantity: 3, price: 9.9 },
      { id: 'bp-t2b', quantity: 5, price: 15 },
    ],
    startTime: '2026-11-01 00:00:00',
    endTime: '2026-12-15 23:59:59',
    productScope: 'partial',
    productIds: ['p6', 'p7'],
    storeScope: 'all',
    storeIds: [],
    status: 'not_started',
  }),
  seed({
    id: 'YKJ20261015003',
    name: '周末一口价草稿',
    title: '',
    tiers: [{ id: 'bp-t3', quantity: 2, price: 12 }],
    status: 'draft',
    productIds: [],
    storeIds: [],
  }),
]
