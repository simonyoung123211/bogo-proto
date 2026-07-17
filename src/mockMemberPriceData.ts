import type {
  ActivityOperationLog,
  MemberLevelId,
  MemberPriceActivityForm,
  MemberPriceMethod,
} from './types'
import { getCreatorProfile, MEMBER_LEVELS, products } from './mockData'

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

export const MEMBER_PRICE_METHOD_LABELS: Record<MemberPriceMethod, string> = {
  discount: '折扣',
  fixed_reduction: '减价',
  special_price: '固定价格',
}

export const MEMBER_LEVEL_LABELS: Record<MemberLevelId, string> = Object.fromEntries(
  MEMBER_LEVELS.map((l) => [l.id, l.label]),
) as Record<MemberLevelId, string>

export function createEmptyMemberPriceActivity(): MemberPriceActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
  const createdAt = formatDateTime(now)
  return {
    id: `MP${Date.now()}`,
    name: '',
    title: '',
    tag: '',
    description: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    timeSlotType: 'all_day',
    priority: 1,
    channels: ['wechat', 'alipay'],
    orderTypes: ['dine_in', 'takeaway', 'pickup'],
    memberLevels: ['normal', 'silver', 'gold', 'platinum', 'diamond'],
    priceMethod: 'discount',
    productItems: [],
    allProductsValue: 8,
    toppingsDiscount: false,
    comboSurchargeDiscount: false,
    preparationSurchargeDiscount: false,
    totalParticipationLimitType: 'unlimited',
    totalParticipationLimit: 1,
    participationFrequencyType: 'unlimited',
    participationFrequencyPeriod: 'daily',
    participationFrequencyLimit: 1,
    maxDiscountItemsTotalType: 'unlimited',
    maxDiscountItemsTotal: 1,
    maxDiscountItemsDailyType: 'unlimited',
    maxDiscountItemsDaily: 1,
    maxDiscountItemsPerOrderType: 'unlimited',
    maxDiscountItemsPerOrder: 1,
    productScope: 'partial',
    productIds: [],
    productSelectionMode: 'include',
    storeScope: 'all',
    storeIds: [],
    shareMutexRelation: 'share_all',
    participantUser: 'registered_member',
    memberTagId: '',
    activityCode: '',
    titleDisplay: 'show',
    tagDisplay: 'show',
    memberPriceTagDisplay: 'show',
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
  overrides: Partial<MemberPriceActivityForm> & Pick<MemberPriceActivityForm, 'id' | 'name' | 'status'>,
): MemberPriceActivityForm {
  const base = createEmptyMemberPriceActivity()
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
  const productIds = overrides.productIds ?? overrides.productItems?.map((i) => i.productId) ?? base.productIds
  return {
    ...base,
    ...overrides,
    productIds,
    createdAt,
    updatedAt,
    operationLogs: logs,
  }
}

export const initialMemberPriceActivities: MemberPriceActivityForm[] = [
  seed({
    id: 'MP20250628001',
    name: '全等级会员8折',
    title: '会员专享价',
    tag: '会员价',
    priceMethod: 'discount',
    memberLevels: ['normal', 'silver', 'gold', 'platinum', 'diamond'],
    productScope: 'partial',
    productIds: products.slice(0, 120).map((p) => p.id),
    productItems: products.slice(0, 120).map((p) => ({ productId: p.id, value: 8 })),
    storeScope: 'all',
    status: 'in_progress',
    startTime: '2026-06-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-05-20 10:00:00',
    updatedAt: '2026-06-01 00:00:00',
  }),
  seed({
    id: 'MP20250701002',
    name: '金卡及以上特价9.9',
    title: '金卡特价',
    tag: '金卡价',
    priceMethod: 'special_price',
    memberLevels: ['gold', 'platinum', 'diamond'],
    productScope: 'partial',
    productIds: products.slice(0, 80).map((p) => p.id),
    productItems: products.slice(0, 80).map((p) => ({ productId: p.id, value: 9.9 })),
    storeScope: 'partial_include',
    storeIds: ['s1', 's2'],
    status: 'in_progress',
    startTime: '2026-07-01 00:00:00',
    endTime: '2026-08-31 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-06-28 09:00:00',
    updatedAt: '2026-07-01 08:00:00',
  }),
  seed({
    id: 'MP20250705003',
    name: '银卡会员立减5元',
    priceMethod: 'fixed_reduction',
    memberLevels: ['silver', 'gold'],
    productScope: 'partial',
    productIds: products.slice(10, 55).map((p) => p.id),
    productItems: products.slice(10, 55).map((p) => ({ productId: p.id, value: 5 })),
    status: 'not_started',
    startTime: '2026-08-01 00:00:00',
    endTime: '2026-09-30 23:59:59',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-07-05 11:00:00',
    updatedAt: '2026-07-08 15:00:00',
  }),
  seed({
    id: 'MP20250708004',
    name: '钻石卡会员7折',
    priceMethod: 'discount',
    memberLevels: ['diamond'],
    productScope: 'all',
    productIds: [],
    productItems: [],
    allProductsValue: 7,
    status: 'draft',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-07-08 09:30:00',
    updatedAt: '2026-07-08 15:00:00',
  }),
  seed({
    id: 'MP20250709005',
    name: '会员日全场85折',
    priceMethod: 'discount',
    memberLevels: ['normal', 'silver', 'gold', 'platinum', 'diamond'],
    productScope: 'partial',
    productSelectionMode: 'exclude',
    productIds: products.slice(50, 110).map((p) => p.id),
    productItems: [],
    allProductsValue: 8.5,
    status: 'pending',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-07-09 14:00:00',
    updatedAt: '2026-07-09 16:00:00',
  }),
  seed({
    id: 'MP20250601006',
    name: '六月会员特惠',
    priceMethod: 'special_price',
    memberLevels: ['gold', 'platinum'],
    productScope: 'partial',
    productIds: ['p3'],
    productItems: [{ productId: 'p3', value: 12 }],
    status: 'ended',
    startTime: '2026-06-01 00:00:00',
    endTime: '2026-06-30 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-05-25 10:00:00',
    updatedAt: '2026-07-01 00:00:00',
  }),
  seed({
    id: 'MP20250710007',
    name: '铂金卡立减10元（已作废）',
    priceMethod: 'fixed_reduction',
    memberLevels: ['platinum', 'diamond'],
    productScope: 'partial',
    productIds: ['p1', 'p5'],
    productItems: [
      { productId: 'p1', value: 10 },
      { productId: 'p5', value: 10 },
    ],
    status: 'voided',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-07-01 08:00:00',
    updatedAt: '2026-07-10 12:00:00',
  }),
  seed({
    id: 'MP20250711008',
    name: '银卡及金卡9折',
    priceMethod: 'discount',
    memberLevels: ['silver', 'gold'],
    productScope: 'partial',
    productIds: ['p4', 'p5', 'p6'],
    productItems: [
      { productId: 'p4', value: 9 },
      { productId: 'p5', value: 9 },
      { productId: 'p6', value: 9 },
    ],
    storeScope: 'partial_exclude',
    storeIds: ['s3'],
    status: 'in_progress',
    startTime: '2026-07-01 00:00:00',
    endTime: '2026-10-31 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-06-20 14:00:00',
    updatedAt: '2026-07-01 00:00:00',
  }),
  seed({
    id: 'MP20250712009',
    name: '普卡入会特价',
    priceMethod: 'special_price',
    memberLevels: ['normal'],
    productScope: 'partial',
    productIds: ['p2'],
    productItems: [{ productId: 'p2', value: 6.6 }],
    status: 'draft',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-07-12 10:00:00',
    updatedAt: '2026-07-12 10:30:00',
  }),
  seed({
    id: 'MP20250715010',
    name: '会员价1',
    priceMethod: 'discount',
    memberLevels: ['normal', 'silver', 'gold', 'platinum', 'diamond'],
    productScope: 'partial',
    productIds: ['p1', 'p2', 'p3', 'p4'],
    productItems: [
      { productId: 'p1', value: 8.8 },
      { productId: 'p2', value: 8.8 },
      { productId: 'p3', value: 9 },
      { productId: 'p4', value: 9 },
    ],
    status: 'not_started',
    startTime: '2026-08-15 00:00:00',
    endTime: '2026-09-15 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-07-15 09:00:00',
    updatedAt: '2026-07-15 09:00:00',
  }),
]
