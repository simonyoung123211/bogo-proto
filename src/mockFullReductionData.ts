import type {
  ActivityOperationLog,
  FullReductionActivityForm,
  FullReductionDiscountType,
  FullReductionThresholdType,
  FullReductionTier,
} from './types'
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

export const THRESHOLD_TYPE_LABELS: Record<FullReductionThresholdType, string> = {
  order_amount: '满订单金额',
  item_count: '满商品件数',
  diner_count: '满点餐人数',
}

export const DISCOUNT_TYPE_LABELS: Record<FullReductionDiscountType, string> = {
  amount_off: '立减',
  percent_off: '打折',
}

/** 满点餐人数可选业务场景：堂食/外卖/外带，均标识为拼单 */
export const FULL_REDUCTION_DINER_ORDER_TYPES = [
  { id: 'dine_in', label: '堂食（拼单）' },
  { id: 'takeaway', label: '外卖（拼单）' },
  { id: 'pickup', label: '外带（拼单）' },
] as const

export const DINER_ORDER_TYPE_IDS = FULL_REDUCTION_DINER_ORDER_TYPES.map((o) => o.id)

export const MAX_TIERS = 5

export function createDefaultTier(): FullReductionTier[] {
  return [{
    id: `tier-${Date.now()}`,
    threshold: 1,
    discountType: 'amount_off',
    discountValue: 0.01,
  }]
}

export function createEmptyFullReductionActivity(): FullReductionActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
  const createdAt = formatDateTime(now)
  const tiers = createDefaultTier()
  return {
    id: `FR${Date.now()}`,
    name: '',
    title: '',
    tag: '',
    description: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    timeSlotType: 'all_day',
    priority: 1,
    channels: ['wechat'],
    orderTypes: ['dine_in', 'takeaway', 'pickup'],
    thresholdType: 'order_amount',
    promoMode: 'tiered',
    tiers,
    cyclicThreshold: 1,
    cyclicDiscountType: 'amount_off',
    cyclicDiscountValue: 0.01,
    toppingsDiscount: false,
    packagingFeeDiscount: false,
    comboSurchargeDiscount: false,
    preparationSurchargeDiscount: false,
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
  overrides: Partial<FullReductionActivityForm> & Pick<FullReductionActivityForm, 'id' | 'name' | 'status'>,
): FullReductionActivityForm {
  const base = createEmptyFullReductionActivity()
  const profile = {
    phone: overrides.creatorPhone ?? base.creatorPhone,
    org: overrides.creatorOrg ?? base.creatorOrg,
  }
  const createdAt = overrides.createdAt ?? base.createdAt
  const updatedAt = overrides.updatedAt ?? createdAt
  const logs = overrides.operationLogs ?? [
    buildLog('创建活动', profile, `创建活动「${overrides.name}」`, createdAt),
    ...(overrides.status !== 'draft'
      ? [buildLog('发布活动', profile, `发布活动「${overrides.name}」`, updatedAt)]
      : []),
  ]
  return { ...base, ...overrides, createdAt, updatedAt, operationLogs: logs }
}

export const initialFullReductionActivities: FullReductionActivityForm[] = [
  seed({
    id: 'FR20250701001',
    name: '满20减2满30减5',
    title: '满减优惠',
    tag: '满减',
    thresholdType: 'order_amount',
    promoMode: 'tiered',
    tiers: [
      { id: 't1', threshold: 20, discountType: 'amount_off', discountValue: 2 },
      { id: 't2', threshold: 30, discountType: 'amount_off', discountValue: 5 },
    ],
    startTime: '2026-07-01 00:00:00',
    endTime: '2026-08-31 23:59:59',
    productScope: 'all',
    storeScope: 'all',
    status: 'in_progress',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-06-25 10:00:00',
    updatedAt: '2026-07-01 08:00:00',
  }),
  seed({
    id: 'FR20250705002',
    name: '满3件立减5元',
    thresholdType: 'item_count',
    promoMode: 'cyclic',
    cyclicThreshold: 3,
    cyclicDiscountType: 'amount_off',
    cyclicDiscountValue: 5,
    tiers: [{ id: 't1', threshold: 3, discountType: 'amount_off', discountValue: 5 }],
    startTime: '2026-07-05 00:00:00',
    endTime: '2026-09-30 23:59:59',
    productScope: 'partial',
    productIds: ['p1', 'p2', 'p3'],
    storeScope: 'all',
    status: 'in_progress',
    creator: '10001',
    creatorPhone: getCreatorProfile('10001').phone,
    creatorOrg: getCreatorProfile('10001').org,
    createdAt: '2026-07-01 11:00:00',
    updatedAt: '2026-07-05 10:00:00',
  }),
  seed({
    id: 'FR20250710003',
    name: '拼单满2人9折',
    thresholdType: 'diner_count',
    promoMode: 'tiered',
    channels: ['wechat'],
    orderTypes: ['dine_in', 'takeaway', 'pickup'],
    tiers: [{ id: 't1', threshold: 2, discountType: 'percent_off', discountValue: 9.9 }],
    startTime: '2026-07-20 00:00:00',
    endTime: '2026-08-20 23:59:59',
    productScope: 'all',
    storeScope: 'all',
    status: 'not_started',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-07-10 09:00:00',
    updatedAt: '2026-07-12 14:00:00',
  }),
  seed({
    id: 'FR20250615004',
    name: '满50减10草稿',
    thresholdType: 'order_amount',
    promoMode: 'tiered',
    tiers: [{ id: 't1', threshold: 50, discountType: 'amount_off', discountValue: 10 }],
    status: 'draft',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-06-15 16:00:00',
    updatedAt: '2026-06-15 16:00:00',
  }),
]
