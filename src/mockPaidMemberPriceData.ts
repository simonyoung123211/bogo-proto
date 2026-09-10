import type {
  ActivityOperationLog,
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
} from './types'
import { getCreatorProfile, products } from './mockData'

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 相对当前时间的时间戳，用于让暂停时长在每次打开 Demo 时都处于预期档位 */
function minutesAgo(minutes: number): string {
  return formatDateTime(new Date(Date.now() - minutes * 60_000))
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

export const PAID_MEMBER_CARD_STATUS_LABELS: Record<string, string> = {
  all: '全部',
  on_sale: '在售',
  off_shelf: '已下架',
  stopped: '已停售',
}

export const PAID_MEMBER_PRICE_STATUS_LABELS: Record<string, string> = {
  all: '所有活动',
  draft: '草稿',
  pending: '待发布',
  in_progress: '进行中',
  paused: '已暂停',
  voided: '已作废',
}

/** 暂停超时分级阈值（分钟）。全部活动类型共用一套口径，定义在 mockData */
export { PAUSE_WARN_MINUTES, PAUSE_OVERDUE_MINUTES } from './mockData'

export const PAID_BENEFIT_NAME_MAX = 8
export const PAID_BENEFIT_DESC_MAX = 500

export const initialPaidMemberCards: PaidMemberCardTemplate[] = [
  {
    id: 'CARD20260601001',
    name: '大神卡',
    status: 'on_sale',
    holderCount: 1286,
    updatedAt: '2026-08-20 10:12:00',
    specs: [
      { id: 'SPEC-3D', label: '3天体验', days: 3, isExperience: true },
      { id: 'SPEC-7D', label: '7天', days: 7 },
      { id: 'SPEC-15D', label: '15天', days: 15 },
      { id: 'SPEC-30D', label: '30天', days: 30 },
    ],
    benefits: [
      {
        id: 'BF20260601001',
        name: '咖啡专享价',
        description: '持卡期间指定咖啡可享专属价，优惠次数与件数按卡规格计算。',
        icon: '',
        totalCountLimitType: 'limited',
        totalItemsLimitType: 'limited',
        specLimits: [
          { specId: 'SPEC-3D', count: 3, items: 3 },
          { specId: 'SPEC-7D', count: 7, items: 8 },
          { specId: 'SPEC-15D', count: 15, items: 18 },
          { specId: 'SPEC-30D', count: 30, items: 40 },
        ],
        experienceCardEnabled: false,
        createdAt: '2026-06-01 09:20:00',
      },
      {
        id: 'BF20260601002',
        name: '全场9折',
        description: '持卡期间全场商品 9 折，不限次数。',
        icon: '',
        totalCountLimitType: 'unlimited',
        totalItemsLimitType: 'unlimited',
        specLimits: [],
        experienceCardEnabled: true,
        createdAt: '2026-06-01 09:35:00',
      },
      {
        id: 'BF20260601003',
        name: '早餐专享价',
        description: '每日早餐时段指定商品专享价。',
        icon: '',
        totalCountLimitType: 'limited',
        totalItemsLimitType: 'unlimited',
        specLimits: [
          { specId: 'SPEC-3D', count: 2, items: 0 },
          { specId: 'SPEC-7D', count: 5, items: 0 },
          { specId: 'SPEC-15D', count: 10, items: 0 },
          { specId: 'SPEC-30D', count: 20, items: 0 },
        ],
        experienceCardEnabled: false,
        createdAt: '2026-06-02 14:10:00',
      },
      {
        id: 'BF20260601004',
        name: '下午茶特惠',
        description: '每日 14:00-17:00 指定商品特惠。',
        icon: '',
        totalCountLimitType: 'limited',
        totalItemsLimitType: 'limited',
        specLimits: [
          { specId: 'SPEC-3D', count: 1, items: 2 },
          { specId: 'SPEC-7D', count: 4, items: 6 },
          { specId: 'SPEC-15D', count: 8, items: 12 },
          { specId: 'SPEC-30D', count: 16, items: 24 },
        ],
        experienceCardEnabled: false,
        createdAt: '2026-06-02 14:30:00',
      },
    ],
  },
  {
    id: 'CARD20260615002',
    name: '宅神卡',
    status: 'off_shelf',
    holderCount: 842,
    updatedAt: '2026-08-28 16:40:00',
    specs: [
      { id: 'SPEC-30D', label: '30天', days: 30 },
      { id: 'SPEC-90D', label: '90天', days: 90 },
    ],
    benefits: [
      {
        id: 'BF20260615001',
        name: '外卖专享价',
        description: '外卖场景指定商品可享专属价。',
        icon: '',
        totalCountLimitType: 'limited',
        totalItemsLimitType: 'unlimited',
        specLimits: [
          { specId: 'SPEC-30D', count: 20, items: 0 },
          { specId: 'SPEC-90D', count: 60, items: 0 },
        ],
        experienceCardEnabled: false,
        createdAt: '2026-06-15 11:00:00',
      },
    ],
  },
  {
    id: 'CARD20260820003',
    name: '轻享卡',
    status: 'off_shelf',
    holderCount: 0,
    updatedAt: '2026-09-01 09:05:00',
    specs: [
      { id: 'SPEC-7D', label: '7天', days: 7 },
      { id: 'SPEC-30D', label: '30天', days: 30 },
    ],
    benefits: [
      {
        id: 'BF20260820001',
        name: '小食特惠价',
        description: '指定小食享专属价，适合轻度用户。',
        icon: '',
        totalCountLimitType: 'limited',
        totalItemsLimitType: 'limited',
        specLimits: [
          { specId: 'SPEC-7D', count: 5, items: 5 },
          { specId: 'SPEC-30D', count: 20, items: 20 },
        ],
        experienceCardEnabled: false,
        createdAt: '2026-08-20 15:20:00',
      },
    ],
  },
]

export function createEmptyPaidMemberPriceActivity(): PaidMemberPriceActivityForm {
  const profile = getCreatorProfile('10086')
  const createdAt = formatDateTime(new Date())
  return {
    id: `PMP${Date.now()}`,
    name: '',
    title: '',
    tag: '',
    description: '',
    cardTemplateId: '',
    benefitId: '',
    cycleType: 'daily',
    timeSlotType: 'all_day',
    priority: 1,
    channels: ['wechat', 'alipay'],
    orderTypes: ['dine_in', 'takeaway', 'pickup'],
    priceMethod: 'discount',
    productItems: [],
    allProductsValue: 8,
    toppingsDiscount: false,
    comboSurchargeDiscount: false,
    preparationSurchargeDiscount: false,
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
    operationLogs: [buildLog('创建活动', profile, '创建付费会员价活动草稿', createdAt)],
  }
}

function seed(
  overrides: Partial<PaidMemberPriceActivityForm> &
    Pick<PaidMemberPriceActivityForm, 'id' | 'name' | 'status' | 'cardTemplateId' | 'benefitId'>,
): PaidMemberPriceActivityForm {
  const base = createEmptyPaidMemberPriceActivity()
  const profile = {
    phone: overrides.creatorPhone ?? base.creatorPhone,
    org: overrides.creatorOrg ?? base.creatorOrg,
  }
  const createdAt = overrides.createdAt ?? base.createdAt
  const updatedAt = overrides.updatedAt ?? createdAt
  const logs = overrides.operationLogs ?? [
    buildLog('创建活动', profile, `创建活动「${overrides.name}」`, createdAt),
    ...(overrides.status === 'draft'
      ? []
      : overrides.status === 'pending'
        ? []
        : [buildLog('卡上架生效', profile, `关联付费会员卡上架，活动生效`, updatedAt)]),
    ...(overrides.status === 'paused'
      ? [buildLog('暂停活动', profile, `暂停活动「${overrides.name}」以调整规则`, overrides.pausedAt ?? updatedAt)]
      : []),
    ...(overrides.status === 'voided'
      ? [buildLog('作废活动', profile, `作废活动「${overrides.name}」`, updatedAt)]
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

const coffeeProducts = products.slice(3, 33)
const snackProducts = products.slice(40, 70)
const breakfastProducts = products.slice(70, 90)
const teaProducts = products.slice(90, 115)

export const initialPaidMemberPriceActivities: PaidMemberPriceActivityForm[] = [
  // 同一权益下的两个活动：商品相同但门店不重叠，属于合法并存
  seed({
    id: 'PMP20260801001',
    name: '大神卡咖啡专享价（华南）',
    title: '大神卡专享',
    tag: '大神卡价',
    cardTemplateId: 'CARD20260601001',
    benefitId: 'BF20260601001',
    status: 'in_progress',
    priceMethod: 'special_price',
    productScope: 'partial',
    productIds: coffeeProducts.map((p) => p.id),
    productItems: coffeeProducts.map((p) => ({ productId: p.id, value: 9.9 })),
    storeScope: 'partial_include',
    storeIds: ['s1', 's2', 's3'],
    maxDiscountItemsPerOrderType: 'limited',
    maxDiscountItemsPerOrder: 2,
    activityCode: 'PAID-COFFEE-SOUTH',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-07-28 10:00:00',
    updatedAt: '2026-08-01 09:00:00',
  }),
  seed({
    id: 'PMP20260801002',
    name: '大神卡咖啡专享价（华东）',
    title: '大神卡专享',
    tag: '大神卡价',
    cardTemplateId: 'CARD20260601001',
    benefitId: 'BF20260601001',
    status: 'in_progress',
    priceMethod: 'special_price',
    productScope: 'partial',
    productIds: coffeeProducts.map((p) => p.id),
    productItems: coffeeProducts.map((p) => ({ productId: p.id, value: 10.9 })),
    storeScope: 'partial_include',
    storeIds: ['s5', 's6'],
    maxDiscountItemsPerOrderType: 'limited',
    maxDiscountItemsPerOrder: 2,
    activityCode: 'PAID-COFFEE-EAST',
    creator: '10001',
    creatorPhone: getCreatorProfile('10001').phone,
    creatorOrg: getCreatorProfile('10001').org,
    createdAt: '2026-07-28 10:30:00',
    updatedAt: '2026-08-01 09:00:00',
  }),
  // 已暂停 · 绿色档（刚暂停）
  seed({
    id: 'PMP20260802003',
    name: '大神卡早餐专享价',
    title: '大神卡早餐',
    tag: '早餐专享',
    cardTemplateId: 'CARD20260601001',
    benefitId: 'BF20260601003',
    status: 'paused',
    pausedAt: minutesAgo(4),
    priceMethod: 'discount',
    productScope: 'partial',
    productIds: breakfastProducts.map((p) => p.id),
    productItems: breakfastProducts.map((p) => ({ productId: p.id, value: 7.5 })),
    storeScope: 'all',
    cycleType: 'daily',
    timeSlotType: 'specific',
    creator: '10086',
    createdAt: '2026-08-02 08:00:00',
    updatedAt: '2026-08-02 08:30:00',
  }),
  // 已暂停 · 黄色档
  seed({
    id: 'PMP20260802004',
    name: '大神卡下午茶特惠',
    title: '下午茶特惠',
    tag: '下午茶',
    cardTemplateId: 'CARD20260601001',
    benefitId: 'BF20260601004',
    status: 'paused',
    pausedAt: minutesAgo(13),
    priceMethod: 'fixed_reduction',
    productScope: 'partial',
    productIds: teaProducts.map((p) => p.id),
    productItems: teaProducts.map((p) => ({ productId: p.id, value: 4 })),
    storeScope: 'all',
    cycleType: 'daily',
    timeSlotType: 'specific',
    creator: '10086',
    createdAt: '2026-08-02 14:00:00',
    updatedAt: '2026-08-02 14:20:00',
  }),
  // 已暂停 · 红色档（超时未恢复）
  seed({
    id: 'PMP20260805005',
    name: '大神卡全场9折',
    title: '大神卡9折',
    tag: '大神卡9折',
    cardTemplateId: 'CARD20260601001',
    benefitId: 'BF20260601002',
    status: 'paused',
    pausedAt: minutesAgo(26),
    priceMethod: 'discount',
    productScope: 'all',
    productIds: [],
    productItems: [],
    allProductsValue: 9,
    storeScope: 'all',
    toppingsDiscount: true,
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-08-05 11:00:00',
    updatedAt: '2026-08-05 11:20:00',
  }),
  // 卡已下架但活动仍进行中（已购卡用户继续享用），演示列表标黄提示
  seed({
    id: 'PMP20260810006',
    name: '宅神卡外卖专享价',
    title: '宅神卡外卖价',
    tag: '宅神卡价',
    cardTemplateId: 'CARD20260615002',
    benefitId: 'BF20260615001',
    status: 'in_progress',
    priceMethod: 'discount',
    productScope: 'partial',
    productSelectionMode: 'exclude',
    productIds: products.slice(0, 20).map((p) => p.id),
    productItems: [],
    allProductsValue: 8.5,
    storeScope: 'all',
    orderTypes: ['takeaway'],
    maxDiscountItemsDailyType: 'limited',
    maxDiscountItemsDaily: 3,
    creator: '10001',
    creatorPhone: getCreatorProfile('10001').phone,
    creatorOrg: getCreatorProfile('10001').org,
    createdAt: '2026-08-10 09:00:00',
    updatedAt: '2026-08-10 10:00:00',
  }),
  // 待发布：关联卡从未上架，可现场点卡上架演示联动
  seed({
    id: 'PMP20260901007',
    name: '轻享卡小食特惠价',
    title: '轻享卡小食价',
    tag: '小食特惠',
    cardTemplateId: 'CARD20260820003',
    benefitId: 'BF20260820001',
    status: 'pending',
    priceMethod: 'fixed_reduction',
    productScope: 'partial',
    productIds: snackProducts.map((p) => p.id),
    productItems: snackProducts.map((p) => ({ productId: p.id, value: 3 })),
    storeScope: 'partial_include',
    storeIds: ['s1', 's2', 's3', 's4', 's5'],
    creator: '10086',
    createdAt: '2026-09-01 09:00:00',
    updatedAt: '2026-09-01 09:30:00',
  }),
  // 已作废：不参与冲突判定，可与进行中的外卖专享价范围重叠
  seed({
    id: 'PMP20260720008',
    name: '宅神卡外卖专享价（旧版）',
    cardTemplateId: 'CARD20260615002',
    benefitId: 'BF20260615001',
    status: 'voided',
    priceMethod: 'discount',
    productScope: 'all',
    productIds: [],
    productItems: [],
    allProductsValue: 9.5,
    storeScope: 'all',
    creator: '10001',
    creatorPhone: getCreatorProfile('10001').phone,
    creatorOrg: getCreatorProfile('10001').org,
    createdAt: '2026-07-20 09:00:00',
    updatedAt: '2026-08-09 18:00:00',
  }),
  // 草稿：与进行中的「大神卡咖啡专享价（华南）」门店×商品重叠，演示草稿不参与冲突、可先配好再作废旧活动后发布
  seed({
    id: 'PMP20260908009',
    name: '大神卡咖啡专享价（华南·新版）',
    title: '大神卡专享',
    tag: '大神卡价',
    description: '调整华南门店咖啡专享价，配齐后将作废旧活动并发布本草稿。',
    cardTemplateId: 'CARD20260601001',
    benefitId: 'BF20260601001',
    status: 'draft',
    priceMethod: 'special_price',
    productScope: 'partial',
    productIds: coffeeProducts.map((p) => p.id),
    productItems: coffeeProducts.map((p) => ({ productId: p.id, value: 8.9 })),
    storeScope: 'partial_include',
    storeIds: ['s1', 's2', 's3'],
    maxDiscountItemsPerOrderType: 'limited',
    maxDiscountItemsPerOrder: 2,
    activityCode: 'PAID-COFFEE-SOUTH-V2',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-09-08 16:00:00',
    updatedAt: '2026-09-08 16:40:00',
  }),
]
