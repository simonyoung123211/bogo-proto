import type { ActivityOperationLog, LimitDiscountActivityForm, LimitDiscountTimeRange } from './types'
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

export function createEmptyLimitDiscountActivity(): LimitDiscountActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
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
    creatorOrg: profile.org,
    createdAt,
    updatedAt: createdAt,
    operationLogs: [buildLog('创建活动', profile, '创建活动草稿', createdAt)],
  }
}

function seed(
  overrides: Partial<LimitDiscountActivityForm> & Pick<LimitDiscountActivityForm, 'id' | 'name' | 'status'>,
): LimitDiscountActivityForm {
  const base = createEmptyLimitDiscountActivity()
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

export const initialLimitDiscountActivities: LimitDiscountActivityForm[] = [
  seed({
    id: 'XSZK20261001001',
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
    productItems: [
      { productId: 'p1', discountValue: 8.8, stock: null, sceneDiscountValues: {} },
      { productId: 'p2', discountValue: 7.5, stock: 200, sceneDiscountValues: {} },
      { productId: 'p3', discountValue: 8, stock: null, sceneDiscountValues: { delivery: 7.5 } },
    ],
    status: 'in_progress',
    activityCode: 'XSZK-TEA',
    description: '指定饮品限时折扣。多数商品统一折扣，个别商品按业务类型分开设置。活动库存留空表示不限量。',
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
]
