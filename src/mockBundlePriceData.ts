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
    orderTypes: ['dine_in', 'takeaway', 'pickup'],
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
    description: '任意活动商品凑满 3 件，合计 9.9 元。',
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
