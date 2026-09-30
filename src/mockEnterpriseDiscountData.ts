import type {
  ActivityOperationLog,
  EnterpriseCustomer,
  EnterpriseDiscountActivityForm,
  EnterpriseDiscountItem,
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

export const ENTERPRISE_CUSTOMERS: EnterpriseCustomer[] = [
  { id: 'ent-qmai', name: '企迈', parentName: '-' },
  { id: 'ent-zanqi', name: '赞企', parentName: '-' },
  { id: 'ent-industry', name: '工业客户', parentName: '-' },
  { id: 'ent-south', name: '华南餐饮集团', parentName: '企迈' },
  { id: 'ent-xingmai', name: '星迈科技', parentName: '企迈' },
]

export function createEnterpriseDiscountItem(enterpriseId: string): EnterpriseDiscountItem {
  return { enterpriseId, discount: 9.9, displayTag: '企业购' }
}

export function createEmptyEnterpriseDiscountActivity(): EnterpriseDiscountActivityForm {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 14)
  const profile = getCreatorProfile('10086')
  const createdAt = formatDateTime(now)
  return {
    id: `ED${Date.now()}`,
    name: '',
    description: '',
    startTime: formatDateTime(now),
    endTime: formatDateTime(end),
    cycleType: 'daily',
    timeSlotType: 'all_day',
    priority: 1,
    channels: ['wechat', 'alipay', 'douyin', 'pos'],
    orderTypes: ['dine_in', 'pickup'],
    totalParticipationLimitType: 'unlimited',
    totalParticipationLimit: 1,
    participationFrequencyType: 'unlimited',
    participationFrequencyPeriod: 'daily',
    participationFrequencyLimit: 1,
    maxDiscountItemsTotalType: 'unlimited',
    maxDiscountItemsTotal: 1,
    maxDiscountItemsPeriodType: 'unlimited',
    maxDiscountItemsPeriod: 'daily',
    maxDiscountItemsPeriodLimit: 1,
    maxDiscountItemsPerOrderType: 'unlimited',
    maxDiscountItemsPerOrder: 1,
    discountHitRule: 'high_to_low',
    enterprises: [],
    toppingsDiscount: false,
    packagingFeeDiscount: false,
    comboSurchargeDiscount: false,
    preparationSurchargeDiscount: false,
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
  overrides: Partial<EnterpriseDiscountActivityForm> & Pick<EnterpriseDiscountActivityForm, 'id' | 'name' | 'status'>,
): EnterpriseDiscountActivityForm {
  const base = createEmptyEnterpriseDiscountActivity()
  const profile = {
    phone: overrides.creatorPhone ?? base.creatorPhone,
    org: overrides.creatorOrg ?? base.creatorOrg,
  }
  const createdAt = overrides.createdAt ?? '2026-09-01 10:00:00'
  const updatedAt = overrides.updatedAt ?? createdAt
  return {
    ...base,
    ...overrides,
    createdAt,
    updatedAt,
    operationLogs: overrides.operationLogs ?? [
      buildLog('创建活动', profile, `创建活动「${overrides.name}」`, createdAt),
      ...(overrides.status !== 'draft'
        ? [buildLog('发布活动', profile, `发布活动「${overrides.name}」`, updatedAt)]
        : []),
    ],
  }
}

export const initialEnterpriseDiscountActivities: EnterpriseDiscountActivityForm[] = [
  seed({
    id: 'ED20260921001',
    name: '企迈员工专享折扣',
    description: '认证企业员工下单享专属折扣',
    status: 'in_progress',
    startTime: '2026-09-01 00:00:00',
    endTime: '2026-12-31 23:59:59',
    enterprises: [
      { enterpriseId: 'ent-qmai', discount: 9.9, displayTag: '企业购' },
      { enterpriseId: 'ent-zanqi', discount: 8.8, displayTag: '企业购' },
    ],
    productScope: 'all',
    productIds: [],
    storeScope: 'all',
  }),
  seed({
    id: 'ED20260921002',
    name: '工业客户员工8.5折',
    status: 'in_progress',
    startTime: '2026-08-01 00:00:00',
    endTime: '2026-10-31 23:59:59',
    enterprises: [
      { enterpriseId: 'ent-industry', discount: 8.5, displayTag: '企业购' },
    ],
    productScope: 'partial',
    productIds: ['p1', 'p2'],
    storeScope: 'partial_include',
    storeIds: ['s1', 's2'],
  }),
  seed({
    id: 'ED20260921003',
    name: '华南集团员工折扣（草稿）',
    status: 'draft',
    enterprises: [
      { enterpriseId: 'ent-south', discount: 9.0, displayTag: '企业购' },
    ],
    creator: '13800008086',
    creatorPhone: '13800008086',
    creatorOrg: '总部营销中心',
  }),
]
