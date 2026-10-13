import type {
  ActivityOperationLog,
  DeliveryFeeActivityForm,
  DeliveryFeeDiscountMethod,
  DeliveryFeeThresholdType,
  DeliveryFeeTier,
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

/** 与现网「减配送费」参与场景对齐；门店快递对应收货城市差异化能力 */
export const DELIVERY_FEE_ORDER_TYPES = [
  { id: 'takeaway', label: '外卖（配送）', kind: 'takeaway' as const },
  { id: 'express', label: '门店快递', kind: 'express' as const },
  { id: 'cake_takeaway', label: '蛋糕外卖', kind: 'takeaway' as const },
  { id: 'group_meal_takeaway', label: '团餐外卖', kind: 'takeaway' as const },
  { id: 'group_buy_takeaway', label: '拼单（外卖）', kind: 'takeaway' as const },
] as const

export type DeliveryFeeOrderTypeId = (typeof DELIVERY_FEE_ORDER_TYPES)[number]['id']

/** 外卖类场景：按收货城市模式下不可勾选 */
export const DELIVERY_FEE_TAKEAWAY_TYPE_IDS: DeliveryFeeOrderTypeId[] = DELIVERY_FEE_ORDER_TYPES
  .filter((o) => o.kind === 'takeaway')
  .map((o) => o.id)

export const DELIVERY_FEE_EXPRESS_TYPE_ID: DeliveryFeeOrderTypeId = 'express'

export const DISCOUNT_METHOD_LABELS: Record<DeliveryFeeDiscountMethod, string> = {
  amount_off: '立减',
  waive: '免除',
  percent_off: '折扣',
}

export const THRESHOLD_TYPE_LABELS: Record<DeliveryFeeThresholdType, string> = {
  amount: '按金额',
  item_count: '按件数',
  none: '无门槛',
}

export const THRESHOLD_TYPE_OPTIONS: { value: DeliveryFeeThresholdType; label: string }[] = [
  { value: 'amount', label: '按金额' },
  { value: 'item_count', label: '按件数' },
  { value: 'none', label: '无门槛' },
]

export const MAX_TIERS = 5

/** 演示用省-市树（省仅作批选父级，活动只存城市） */
export const REGION_TREE: { id: string; name: string; cities: { id: string; name: string }[] }[] = [
  {
    id: 'p-sh',
    name: '上海市',
    cities: [{ id: 'c-sh', name: '上海市' }],
  },
  {
    id: 'p-js',
    name: '江苏省',
    cities: [
      { id: 'c-nj', name: '南京市' },
      { id: 'c-sz', name: '苏州市' },
      { id: 'c-wx', name: '无锡市' },
      { id: 'c-cz', name: '常州市' },
    ],
  },
  {
    id: 'p-zj',
    name: '浙江省',
    cities: [
      { id: 'c-hz', name: '杭州市' },
      { id: 'c-nb', name: '宁波市' },
      { id: 'c-wz', name: '温州市' },
    ],
  },
  {
    id: 'p-gd',
    name: '广东省',
    cities: [
      { id: 'c-gz', name: '广州市' },
      { id: 'c-sz2', name: '深圳市' },
      { id: 'c-dg', name: '东莞市' },
      { id: 'c-fs', name: '佛山市' },
    ],
  },
  {
    id: 'p-sc',
    name: '四川省',
    cities: [
      { id: 'c-cd', name: '成都市' },
      { id: 'c-my', name: '绵阳市' },
    ],
  },
  {
    id: 'p-xj',
    name: '新疆维吾尔自治区',
    cities: [
      { id: 'c-wlmq', name: '乌鲁木齐市' },
      { id: 'c-klmy', name: '克拉玛依市' },
    ],
  },
]

export const CITY_NAME_MAP: Record<string, string> = Object.fromEntries(
  REGION_TREE.flatMap((p) => p.cities.map((c) => [c.id, c.name])),
)

export function createDefaultTiers(): DeliveryFeeTier[] {
  return [{
    id: `tier-${Date.now()}`,
    threshold: 0.01,
    discountMethod: 'amount_off',
    discountValue: 0.1,
  }]
}

export function createEmptyDeliveryFeeActivity(): DeliveryFeeActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
  const createdAt = formatDateTime(now)
  return {
    id: `DF${Date.now()}`,
    name: '',
    title: '',
    tag: '减配送费',
    description: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    timeSlotType: 'all_day',
    channels: ['wechat'],
    orderTypes: ['express'],
    ruleMode: 'national',
    thresholdType: 'amount',
    tiers: createDefaultTiers(),
    cityIds: [],
    thresholdBase: 'sale_price',
    includeToppings: false,
    includePackagingFee: false,
    includePreparationSurcharge: false,
    totalParticipationLimitType: 'unlimited',
    totalParticipationLimit: 1,
    participationFrequencyType: 'unlimited',
    participationFrequencyPeriod: 'daily',
    participationFrequencyLimit: 1,
    productScope: 'all',
    productIds: [],
    storeScope: 'all',
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
  overrides: Partial<DeliveryFeeActivityForm> & Pick<DeliveryFeeActivityForm, 'id' | 'name' | 'status'>,
): DeliveryFeeActivityForm {
  return { ...createEmptyDeliveryFeeActivity(), ...overrides }
}

export const initialDeliveryFeeActivities: DeliveryFeeActivityForm[] = [
  seed({
    id: 'DF1001',
    name: '华东快递减运费',
    title: '华东快递满减运费',
    status: 'in_progress',
    orderTypes: ['express'],
    ruleMode: 'by_city',
    cityIds: ['c-sh', 'c-nj', 'c-sz', 'c-wx'],
    tiers: [
      { id: 't1', threshold: 39, discountMethod: 'amount_off', discountValue: 3 },
      { id: 't2', threshold: 69, discountMethod: 'waive', discountValue: 0 },
    ],
  }),
  seed({
    id: 'DF1002',
    name: '全国统一减配送费（含外卖）',
    title: '满39减3元配送费',
    status: 'draft',
    orderTypes: ['takeaway', 'express'],
    ruleMode: 'national',
    tiers: [{ id: 't-n', threshold: 39, discountMethod: 'amount_off', discountValue: 3 }],
  }),
]
