import type { ActivityOperationLog, ActivityPerspective, LimitDiscountActivityForm, LimitDiscountProductItem, LimitDiscountTimeRange } from './types'
import { getLegacyLimitDiscountPerspective } from './mockActivityPerspectives'
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

/** 限时折扣参与渠道，与正式后台一致 */
export const LIMIT_DISCOUNT_CHANNELS = [
  { id: 'wechat', label: '微信小程序', icon: '微' },
  { id: 'alipay', label: '支付宝小程序', icon: '支' },
  { id: 'douyin', label: '抖音小程序', icon: '抖' },
  { id: 'pos', label: '企迈数店POS', icon: '企' },
  { id: 'screen', label: '点餐屏', icon: '屏' },
] as const

/** 限时折扣参与业务/场景 */
export const LIMIT_DISCOUNT_SCENES = [
  { id: 'dine_in', label: '堂食' },
  { id: 'pack', label: '外带' },
  { id: 'delivery', label: '外卖（配送）' },
  { id: 'delivery_pickup', label: '外卖（自取）' },
  { id: 'store_express', label: '门店快递' },
  { id: 'cake_pickup', label: '蛋糕自取' },
  { id: 'cake_delivery', label: '蛋糕外卖' },
  { id: 'group_delivery', label: '拼单（外卖）' },
  { id: 'group_dine_in', label: '拼单（堂食）' },
  { id: 'group_pack', label: '拼单（外带）' },
] as const

export const LIMIT_DISCOUNT_STORE_TAGS = [
  { id: 'flagship', label: '旗舰店' },
  { id: 'mall', label: '商圈店' },
  { id: 'campus', label: '学校店' },
] as const

export const LIMIT_DISCOUNT_PARTICIPANTS = [
  { value: 'all_users' as const, label: '全部用户', hint: '包含已授权和未授权的用户' },
  { value: 'registered_member' as const, label: '已注册会员', hint: '所有已授权手机号码的用户。若可通过活动页面参与，可授权后参与' },
  { value: 'unconsumed' as const, label: '未消费用户', hint: '未产生过消费的用户，也未存在待支付的订单，含未授权手机号的用户（可授权后参与）' },
  { value: 'paid_member' as const, label: '付费会员', hint: '存在未过期的付费权益卡会员' },
]

export const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
]

export const PERIOD_OPTIONS = [
  { value: 'daily' as const, label: '每天' },
  { value: 'weekly' as const, label: '每周' },
  { value: 'monthly' as const, label: '每月' },
]

export function createTimeRange(start = '', end = ''): LimitDiscountTimeRange {
  return { id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, start, end }
}

export function createEmptyLimitDiscountActivity(perspective?: ActivityPerspective): LimitDiscountActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
  const creatorOrg = perspective?.name ?? profile.org
  const createdAt = formatDateTime(now)
  return {
    id: `XSZK${Date.now()}`,
    name: '',
    title: '',
    goodsLabel: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    weekDays: [],
    monthDays: [],
    timeSlotType: 'all_day',
    timeSlots: [createTimeRange('00:00:00', '23:59:59')],
    holidayInactive: false,
    inactiveRanges: [],
    thresholdType: 'unlimited',
    thresholdAmount: 0.01,
    thresholdGoodsScope: 'all',
    thresholdProductIds: [],
    thresholdIncludeTopping: true,
    thresholdIncludeCombo: true,
    thresholdIncludePractice: true,
    toppingDiscount: 'no',
    comboSurchargeDiscount: 'no',
    practiceSurchargeDiscount: 'no',
    totalTimesType: 'unlimited',
    totalTimes: 1,
    frequencyType: 'unlimited',
    frequencyPeriod: 'daily',
    frequencyTimes: 1,
    limitTotalPieces: false,
    totalPieces: 1,
    limitPeriodPieces: false,
    periodPiecesPeriod: 'daily',
    periodPieces: 1,
    limitOrderPieces: false,
    orderPieces: 1,
    hitRule: 'highest_price',
    activityCode: '',
    shareMutexRelation: 'mutex_all',
    participantUser: 'registered_member',
    titleDisplay: 'show',
    goodsLabelDisplay: 'show',
    memberTagIds: [],
    searchKeyword: '',
    description: '',
    channels: ['wechat', 'alipay'],
    orderTypes: [],
    storeMode: 'all',
    storeIds: [],
    storeTagIds: [],
    areaMode: 'all',
    areaIdsByStore: {},
    discountMethod: 'discount',
    goodsScope: 'all',
    valueMode: 'unified',
    discountValue: 9.9,
    sceneDiscountValues: {},
    activityStock: null,
    productItems: [],
    status: 'draft',
    creator: '10086',
    creatorPhone: profile.phone,
    creatorOrg,
    creatorPerspectiveId: perspective?.id,
    createdAt,
    updatedAt: createdAt,
    operationLogs: [buildLog('创建活动', { ...profile, org: creatorOrg }, '创建活动草稿', createdAt)],
  }
}

function seed(
  overrides: Partial<LimitDiscountActivityForm> & Pick<LimitDiscountActivityForm, 'id' | 'name' | 'status'>,
): LimitDiscountActivityForm {
  const base = createEmptyLimitDiscountActivity()
  const perspective = getLegacyLimitDiscountPerspective(overrides.id)
  const profile = {
    phone: overrides.creatorPhone ?? base.creatorPhone,
    org: overrides.creatorOrg ?? (perspective.type === 'store_group' ? perspective.name : base.creatorOrg),
  }
  const createdAt = overrides.createdAt ?? '2026-10-01 10:00:00'
  const updatedAt = overrides.updatedAt ?? createdAt
  const logs = overrides.operationLogs ?? [
    buildLog('创建活动', profile, `创建活动「${overrides.name}」`, createdAt),
    ...(overrides.status !== 'draft'
      ? [buildLog('发布活动', profile, `发布活动「${overrides.name}」`, updatedAt)]
      : []),
  ]
  return { ...base, creatorPerspectiveId: perspective.id, ...overrides, creatorOrg: profile.org, createdAt, updatedAt, operationLogs: logs }
}

const AFTERNOON_TEA_DEMO_ID = 'XSZK20261001001'
const afternoonTeaDescription = '指定饮品限时折扣，示例覆盖整场、日、周、月及分业务限量。各规格独立计数。'
const afternoonTeaQuotaItems: LimitDiscountProductItem[] = [
  {
    productId: 'p1', discountValue: 8.8, stock: null, sceneDiscountValues: {},
    quota: { periodic: { period: 'daily', limit: 100 }, byScene: {} },
  },
  { productId: 'p2', discountValue: 7.5, stock: 200, sceneDiscountValues: {} },
  {
    productId: 'p3', discountValue: 8, stock: null, sceneDiscountValues: { delivery: 7.5 },
    quota: { periodic: null, byScene: { delivery: { total: 300, periodic: { period: 'weekly', limit: 80 } } } },
  },
  {
    productId: 'gen-001', discountValue: 8.8, stock: null, sceneDiscountValues: {},
    quota: { periodic: { period: 'weekly', limit: 350 }, byScene: {} },
  },
  {
    productId: 'gen-008', discountValue: 8.8, stock: null, sceneDiscountValues: {},
    quota: { periodic: { period: 'monthly', limit: 1000 }, byScene: {} },
  },
  {
    productId: 'gen-009', discountValue: 8.8, stock: 1000, sceneDiscountValues: {},
    quota: {
      periodic: { period: 'daily', limit: 100 },
      byScene: {
        dine_in: { total: 600, periodic: { period: 'daily', limit: 80 } },
        pack: { total: null, periodic: { period: 'daily', limit: 60 } },
      },
    },
  },
  { productId: 'gen-007', discountValue: 8.8, stock: null, sceneDiscountValues: {} },
]

const quotaDemoStart = new Date()
const quotaDemoEnd = new Date(quotaDemoStart)
quotaDemoStart.setDate(quotaDemoStart.getDate() - 7)
quotaDemoEnd.setDate(quotaDemoEnd.getDate() + 30)
const quotaDemoWindow = {
  startTime: formatDateTime(quotaDemoStart),
  endTime: formatDateTime(quotaDemoEnd),
  createdAt: formatDateTime(quotaDemoStart),
}

const specifiedQuotaDemo = seed({
  ...quotaDemoWindow,
  id: 'XSZK20261126010',
  name: '指定商品限量调整示例',
  status: 'in_progress',
  goodsScope: 'include',
  channels: ['wechat'],
  orderTypes: ['dine_in', 'pack', 'delivery'],
  storeMode: 'include',
  storeIds: ['s6'],
  productItems: structuredClone(afternoonTeaQuotaItems),
})

const sharedQuotaDemos: LimitDiscountActivityForm[] = [
  seed({
    ...quotaDemoWindow,
    id: 'XSZK20261126011',
    name: '全部商品限量调整示例',
    status: 'in_progress',
    goodsScope: 'all',
    channels: ['pos'],
    storeMode: 'include',
    storeIds: ['s3'],
    orderTypes: ['dine_in', 'pack'],
    discountValue: 8.8,
    activityStock: 500,
    activityQuota: {
      periodic: { period: 'daily', limit: 100 },
      byScene: { dine_in: { total: 300, periodic: { period: 'daily', limit: 60 } } },
    },
  }),
  seed({
    ...quotaDemoWindow,
    id: 'XSZK20261126012',
    name: '排除商品限量调整示例',
    status: 'in_progress',
    goodsScope: 'exclude',
    channels: ['douyin'],
    storeMode: 'include',
    storeIds: ['s4'],
    orderTypes: ['delivery', 'delivery_pickup'],
    discountValue: 8.8,
    productItems: [{ productId: 'p2', discountValue: null, stock: null, sceneDiscountValues: {} }],
    activityQuota: {
      periodic: { period: 'monthly', limit: 600 },
      byScene: {
        delivery: { total: null, periodic: { period: 'weekly', limit: 120 } },
        delivery_pickup: { total: 250, periodic: { period: 'monthly', limit: 100 } },
      },
    },
  }),
]

export function addLimitDiscountQuotaDemos(activities: LimitDiscountActivityForm[]): LimitDiscountActivityForm[] {
  const tea = activities.find(({ id }) => id === AFTERNOON_TEA_DEMO_ID)
  const now = formatDateTime(new Date())
  const teaRunning = tea?.status === 'in_progress' && tea.startTime <= now && tea.endTime > now
  const oldTeaExample = teaRunning && tea.goodsScope === 'include'
    && tea.updatedAt === '2026-10-01 10:00:00'
    && tea.productItems.length === 3
    && tea.productItems.every(({ productId, stock, quota, discountValue, sceneDiscountValues }, index) => {
      const expected = afternoonTeaQuotaItems[index]
      return productId === expected.productId && stock === expected.stock && !quota
        && discountValue === expected.discountValue && JSON.stringify(sceneDiscountValues) === JSON.stringify(expected.sceneDiscountValues)
    })
  const hasQuotaExamples = teaRunning && tea.goodsScope === 'include' && afternoonTeaQuotaItems.every((sample) =>
    tea.productItems.some((item) => item.productId === sample.productId && item.stock === sample.stock
      && JSON.stringify(item.quota) === JSON.stringify(sample.quota)))
  const seen = new Set(activities.map(({ id }) => id))
  const demos = oldTeaExample || hasQuotaExamples ? sharedQuotaDemos : [specifiedQuotaDemo, ...sharedQuotaDemos]
  return [
    ...activities.map((activity) => oldTeaExample && activity === tea
      ? { ...activity, productItems: structuredClone(afternoonTeaQuotaItems), description: afternoonTeaDescription }
      : activity),
    ...demos.filter(({ id }) => !seen.has(id)),
  ]
}

export const initialLimitDiscountActivities: LimitDiscountActivityForm[] = [
  seed({
    id: 'XSZK20261111001',
    name: '合作点区域八折（示例草稿）',
    orderTypes: ['pack'],
    participantUser: 'all_users',
    storeMode: 'include',
    storeIds: ['s2', 's3'],
    areaMode: 'specified',
    areaIdsByStore: { s2: ['library', 'cafe'], s3: ['spa'] },
    discountValue: 8,
    status: 'draft',
  }),
  seed({
    id: AFTERNOON_TEA_DEMO_ID,
    name: '下午茶限时折扣',
    title: '限时优惠',
    goodsLabel: '限时优惠',
    startTime: '2026-10-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
    orderTypes: ['dine_in', 'pack', 'delivery'],
    storeMode: 'include',
    storeIds: ['s1', 's2', 's5'],
    discountMethod: 'discount',
    goodsScope: 'include',
    valueMode: 'unified',
    discountValue: 8.8,
    sceneDiscountValues: {},
    productItems: structuredClone(afternoonTeaQuotaItems),
    status: 'in_progress',
    activityCode: 'XSZK-TEA',
    description: afternoonTeaDescription,
  }),
  seed({
    id: 'XSZK20261012002',
    name: '小食减价',
    title: '立减特惠',
    goodsLabel: '立减',
    startTime: '2026-11-01 00:00:00',
    endTime: '2026-11-30 23:59:59',
    orderTypes: ['dine_in', 'delivery_pickup'],
    storeMode: 'all',
    discountMethod: 'reduce',
    goodsScope: 'include',
    valueMode: 'unified',
    discountValue: 2,
    sceneDiscountValues: {},
    productItems: [
      { productId: 'p6', discountValue: 2, stock: 100, sceneDiscountValues: {} },
      { productId: 'p7', discountValue: 1, stock: null, sceneDiscountValues: {} },
    ],
    status: 'not_started',
  }),
  seed({
    id: 'XSZK20261018003',
    name: '全场特价草稿',
    title: '',
    goodsLabel: '',
    orderTypes: [],
    discountMethod: 'special_price',
    goodsScope: 'all',
    valueMode: 'unified',
    discountValue: 9.9,
    sceneDiscountValues: {},
    status: 'draft',
  }),
  ...sharedQuotaDemos,
]
