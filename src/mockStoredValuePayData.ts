import type {
  ActivityOperationLog,
  MemberPriceMethod,
  StoredValuePayActivityForm,
  StoredValuePayRule,
} from './types'
import { getCreatorProfile, products } from './mockData'
import { MEMBER_PRICE_METHOD_LABELS } from './mockMemberPriceData'

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

export { MEMBER_PRICE_METHOD_LABELS as STORED_VALUE_PAY_METHOD_LABELS }

export const STORED_VALUE_PAY_RULE_LABELS: Record<StoredValuePayRule, string> = {
  min_balance_pay: '储值余额支付 ≥ 0.01 即可参与',
  full_order_balance: '整单仅限储值余额支付才可参与',
}

export const STORED_VALUE_PAY_RULE_SHORT_LABELS: Record<StoredValuePayRule, string> = {
  min_balance_pay: '余额支付≥0.01',
  full_order_balance: '整单仅余额',
}

export function createEmptyStoredValuePayActivity(): StoredValuePayActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
  const createdAt = formatDateTime(now)
  return {
    id: `SV${Date.now()}`,
    name: '',
    title: '',
    tag: '',
    remark: '',
    description: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    timeSlotType: 'all_day',
    priority: 1,
    channels: ['wechat', 'alipay', 'h5', 'app'],
    orderTypes: ['dine_in', 'takeaway_platform', 'takeaway_self', 'pickup'],
    payRule: 'min_balance_pay',
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
  overrides: Partial<StoredValuePayActivityForm> & Pick<StoredValuePayActivityForm, 'id' | 'name' | 'status'>,
): StoredValuePayActivityForm {
  const base = createEmptyStoredValuePayActivity()
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

export const initialStoredValuePayActivities: StoredValuePayActivityForm[] = [
  seed({
    id: 'SV20260914001',
    name: '储值余额满0.01享8折',
    title: '储值专享价',
    tag: '储值价',
    payRule: 'min_balance_pay',
    priceMethod: 'discount' as MemberPriceMethod,
    productScope: 'partial',
    productIds: products.slice(0, 40).map((p) => p.id),
    productItems: products.slice(0, 40).map((p) => ({ productId: p.id, value: 8 })),
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
    id: 'SV20260914002',
    name: '整单储值支付特价9.9',
    title: '整单储值特价',
    tag: '储值整单',
    payRule: 'full_order_balance',
    priceMethod: 'special_price',
    productScope: 'partial',
    productIds: products.slice(0, 20).map((p) => p.id),
    productItems: products.slice(0, 20).map((p) => ({ productId: p.id, value: 9.9 })),
    storeScope: 'partial_include',
    storeIds: ['s1', 's2'],
    status: 'in_progress',
    startTime: '2026-07-01 00:00:00',
    endTime: '2026-10-31 23:59:59',
    creator: '205110',
    creatorPhone: getCreatorProfile('205110').phone,
    creatorOrg: getCreatorProfile('205110').org,
    createdAt: '2026-06-28 09:00:00',
    updatedAt: '2026-07-01 08:00:00',
  }),
  seed({
    id: 'SV20260914003',
    name: '储值支付立减5元（草稿）',
    payRule: 'min_balance_pay',
    priceMethod: 'fixed_reduction',
    productScope: 'partial',
    productIds: ['p1', 'p2', 'p3'],
    productItems: [
      { productId: 'p1', value: 5 },
      { productId: 'p2', value: 5 },
      { productId: 'p3', value: 5 },
    ],
    status: 'draft',
    creator: '10086',
    creatorPhone: getCreatorProfile('10086').phone,
    creatorOrg: getCreatorProfile('10086').org,
    createdAt: '2026-09-10 11:00:00',
    updatedAt: '2026-09-12 15:00:00',
  }),
]
