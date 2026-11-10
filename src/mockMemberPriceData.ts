import type {
  ActivityOperationLog,
  MemberLevelId,
  MemberPriceActivityForm,
  MemberPriceMethod,
  MemberPriceOfferGroup,
  MemberPriceProductItem,
} from './types'
import { getCreatorProfile, MEMBER_LEVELS, products } from './mockData'

/** 会员价参与业务场景，与正式产品一致 */
export const MEMBER_PRICE_ORDER_TYPES = [
  { id: 'dine_in', label: '堂食' },
  { id: 'pack', label: '外带' },
  { id: 'delivery', label: '外卖（配送）' },
  { id: 'delivery_pickup', label: '外卖（自取）' },
  { id: 'store_express', label: '门店快递' },
  { id: 'cake_pickup', label: '蛋糕自提' },
  { id: 'cake_delivery', label: '蛋糕外送' },
  { id: 'group_delivery', label: '拼单（外卖）' },
  { id: 'group_dine_in', label: '拼单（堂食）' },
  { id: 'group_pack', label: '拼单（外带）' },
] as const

const MEMBER_PRICE_ORDER_TYPE_IDS = new Set<string>(MEMBER_PRICE_ORDER_TYPES.map((item) => item.id))

/** 旧 Demo 枚举迁到现行业务场景 */
const LEGACY_MEMBER_PRICE_ORDER_TYPE_MAP: Record<string, string> = {
  takeaway: 'delivery',
  takeaway_platform: 'delivery',
  takeaway_self: 'delivery',
  pickup: 'delivery_pickup',
}

export function normalizeMemberPriceOrderTypes(ids: string[]): string[] {
  const next: string[] = []
  for (const id of ids) {
    const mapped = LEGACY_MEMBER_PRICE_ORDER_TYPE_MAP[id] ?? id
    if (MEMBER_PRICE_ORDER_TYPE_IDS.has(mapped) && !next.includes(mapped)) next.push(mapped)
  }
  return next
}

export function remapMemberPriceSceneValues(
  values: Record<string, number | null> | undefined,
): Record<string, number | null> | undefined {
  if (!values) return values
  const next: Record<string, number | null> = {}
  for (const [key, value] of Object.entries(values)) {
    const mapped = LEGACY_MEMBER_PRICE_ORDER_TYPE_MAP[key] ?? key
    if (!MEMBER_PRICE_ORDER_TYPE_IDS.has(mapped)) continue
    if (!(mapped in next) || next[mapped] == null) next[mapped] = value
  }
  return next
}

export function normalizeMemberPriceProductItem(item: MemberPriceProductItem): MemberPriceProductItem {
  if (!item.sceneValues) return item
  return { ...item, sceneValues: remapMemberPriceSceneValues(item.sceneValues) }
}

export function createEmptyMemberPriceOfferGroup(
  overrides: Partial<MemberPriceOfferGroup> = {},
): MemberPriceOfferGroup {
  return {
    id: `mpg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    targetIds: [],
    priceMethod: 'discount',
    productItems: [],
    allProductsValue: 9.9,
    valueMode: 'unified',
    sceneValues: {},
    productScope: 'partial',
    productIds: [],
    productSelectionMode: 'include',
    ...overrides,
  }
}

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
    orderTypes: ['dine_in', 'pack', 'delivery', 'delivery_pickup'],
    audienceType: 'specified_level',
    paymentLimitType: 'unlimited',
    paymentMethodIds: [],
    paymentAmountLimit: 'any',
    groups: [
      createEmptyMemberPriceOfferGroup({
        targetIds: [],
        priceMethod: 'discount',
        allProductsValue: 9.9,
      }),
    ],
    memberLevels: [],
    priceMethod: 'discount',
    productItems: [],
    allProductsValue: 9.9,
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
  const priceMethod = overrides.priceMethod ?? base.priceMethod
  const productItems =
    overrides.productItems ??
    productIds.map((productId) => ({
      productId,
      value: overrides.allProductsValue ?? base.allProductsValue,
    }))
  const memberLevels = overrides.memberLevels ?? base.memberLevels
  const groups =
    overrides.groups ??
    [
      createEmptyMemberPriceOfferGroup({
        targetIds: memberLevels,
        priceMethod,
        productItems,
        allProductsValue: overrides.allProductsValue ?? base.allProductsValue,
        productScope: overrides.productScope ?? base.productScope,
        productIds,
        productSelectionMode: overrides.productSelectionMode ?? base.productSelectionMode,
      }),
    ]
  const audienceType =
    overrides.audienceType ??
    (memberLevels.length >= MEMBER_LEVELS.length ? 'all_level' : 'specified_level')
  return {
    ...base,
    ...overrides,
    audienceType,
    groups,
    memberLevels,
    priceMethod,
    productIds,
    productItems,
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
    audienceType: 'specified_stored_value',
    memberLevels: [],
    priceMethod: 'discount',
    productScope: 'partial',
    productIds: products.slice(0, 120).map((p) => p.id),
    productItems: products.slice(0, 120).map((p) => ({ productId: p.id, value: 8 })),
    groups: [
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-sv-1',
        targetIds: ['sv_test', 'sv_default', 'sv_6'],
        priceMethod: 'discount',
        productScope: 'all',
        productSelectionMode: 'include',
        productIds: [],
        productItems: [],
        allProductsValue: 8,
      }),
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-sv-2',
        targetIds: ['sv_gold', 'sv_platinum'],
        priceMethod: 'discount',
        productScope: 'all',
        productSelectionMode: 'include',
        productIds: [],
        productItems: [],
        allProductsValue: 8,
      }),
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-sv-3',
        targetIds: ['sv_l4'],
        priceMethod: 'discount',
        productScope: 'all',
        productSelectionMode: 'include',
        productIds: [],
        productItems: [],
        allProductsValue: 8,
      }),
    ],
    storeScope: 'partial_include',
    storeIds: ['s2', 's3', 's4'],
    status: 'in_progress',
    startTime: '2026-06-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-05-20 10:00:00',
    updatedAt: '2026-06-01 00:00:00',
  }),
  /** 暂停未过期示意：门店与进行中储值活动错开，保证存量无冲突 */
  seed({
    id: 'MP20251030011',
    name: '储值黄金会员9折（暂停）',
    title: '储值会员价',
    tag: '会员价',
    audienceType: 'specified_stored_value',
    memberLevels: [],
    priceMethod: 'discount',
    productScope: 'partial',
    productIds: products.slice(0, 60).map((p) => p.id),
    productItems: products.slice(0, 60).map((p) => ({ productId: p.id, value: 9 })),
    groups: [
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-sv-paused-1',
        targetIds: ['sv_gold', 'sv_platinum'],
        priceMethod: 'discount',
        productScope: 'partial',
        productSelectionMode: 'include',
        productIds: products.slice(0, 60).map((p) => p.id),
        productItems: products.slice(0, 60).map((p) => ({ productId: p.id, value: 9 })),
        allProductsValue: 9,
      }),
    ],
    storeScope: 'partial_include',
    storeIds: ['s1'],
    status: 'paused',
    pausedAt: '2026-10-20 10:00:00',
    startTime: '2026-09-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-08-28 09:00:00',
    updatedAt: '2026-10-20 10:00:00',
  }),
  /** 待发布示意：门店与进行中储值活动错开，保证存量无冲突 */
  seed({
    id: 'MP20251030012',
    name: '储值测试会员特惠',
    title: '储值特惠',
    tag: '会员价',
    audienceType: 'specified_stored_value',
    memberLevels: [],
    priceMethod: 'discount',
    productScope: 'all',
    productIds: [],
    productItems: [],
    allProductsValue: 8.5,
    groups: [
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-sv-pending-1',
        targetIds: ['sv_test', 'sv_default'],
        priceMethod: 'discount',
        productScope: 'all',
        productSelectionMode: 'include',
        productIds: [],
        productItems: [],
        allProductsValue: 8.5,
      }),
    ],
    storeScope: 'partial_include',
    storeIds: ['s1'],
    status: 'pending',
    startTime: '2026-11-01 00:00:00',
    endTime: '2026-11-30 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-10-28 14:00:00',
    updatedAt: '2026-10-28 16:00:00',
  }),
  seed({
    id: 'MP20250701002',
    name: '分等级多组会员价',
    title: '会员分档价',
    tag: '会员价',
    audienceType: 'specified_level',
    memberLevels: ['gold', 'silver', 'diamond'],
    priceMethod: 'fixed_reduction',
    productScope: 'partial',
    productIds: products.slice(0, 40).map((p) => p.id),
    productItems: products.slice(0, 40).map((p) => ({ productId: p.id, value: 5 })),
    groups: [
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-demo-1',
        targetIds: ['gold', 'silver'],
        priceMethod: 'fixed_reduction',
        productScope: 'partial',
        productSelectionMode: 'include',
        productIds: products.slice(0, 40).map((p) => p.id),
        productItems: products.slice(0, 40).map((p) => ({ productId: p.id, value: 5 })),
        allProductsValue: 5,
      }),
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-demo-2',
        targetIds: ['diamond'],
        priceMethod: 'discount',
        productScope: 'partial',
        productSelectionMode: 'include',
        productIds: products.slice(40, 80).map((p) => p.id),
        productItems: products.slice(40, 80).map((p) => ({ productId: p.id, value: 8 })),
        allProductsValue: 8,
      }),
    ],
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
    id: 'MP20251030008',
    name: '付费会员专享会员价',
    title: '付费会员价',
    tag: '会员价',
    audienceType: 'paid_member_card_user',
    memberLevels: [],
    priceMethod: 'discount',
    productScope: 'all',
    productIds: [],
    productItems: [],
    allProductsValue: 8.5,
    groups: [
      createEmptyMemberPriceOfferGroup({
        id: 'mpg-paid-1',
        targetIds: [],
        priceMethod: 'discount',
        productScope: 'all',
        productSelectionMode: 'include',
        productIds: [],
        productItems: [],
        allProductsValue: 8.5,
      }),
    ],
    status: 'in_progress',
    startTime: '2026-10-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-09-28 10:00:00',
    updatedAt: '2026-10-01 00:00:00',
  }),
  seed({
    id: 'MP20250705003',
    name: '银卡会员立减5元',
    priceMethod: 'fixed_reduction',
    memberLevels: ['platinum'],
    productScope: 'partial',
    productIds: products.slice(10, 55).map((p) => p.id),
    productItems: products.slice(10, 55).map((p) => ({ productId: p.id, value: 5 })),
    storeScope: 'partial_include',
    storeIds: ['s3'],
    status: 'not_started',
    startTime: '2026-09-01 00:00:00',
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
    storeScope: 'partial_include',
    storeIds: ['s1'],
    status: 'pending',
    startTime: '2026-12-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
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
      { productId: 'p4', value: 9, sceneValues: { delivery: 8.5 } },
      { productId: 'p5', value: 9 },
      { productId: 'p6', value: 9 },
    ],
    storeScope: 'partial_include',
    storeIds: ['s3'],
    status: 'in_progress',
    startTime: '2026-09-01 00:00:00',
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
    memberLevels: ['normal'],
    productScope: 'partial',
    productIds: ['p1', 'p2', 'p3', 'p4'],
    productItems: [
      { productId: 'p1', value: 8.8 },
      { productId: 'p2', value: 8.8 },
      { productId: 'p3', value: 9 },
      { productId: 'p4', value: 9 },
    ],
    storeScope: 'partial_include',
    storeIds: ['s4'],
    status: 'not_started',
    startTime: '2026-11-01 00:00:00',
    endTime: '2026-11-30 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-07-15 09:00:00',
    updatedAt: '2026-07-15 09:00:00',
  }),
]
