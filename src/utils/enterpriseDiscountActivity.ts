import { products, stores } from '../mockData'
import {
  ENTERPRISE_CUSTOMERS,
  createEmptyEnterpriseDiscountActivity,
} from '../mockEnterpriseDiscountData'
import type {
  ActivityStatus,
  EnterpriseDiscountActivityForm,
  EnterpriseDiscountHitRule,
  EnterpriseDiscountListFilters,
} from '../types'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'
import { getCreatorProfile } from '../mockData'

export function getEnterprise(id: string) {
  return ENTERPRISE_CUSTOMERS.find((item) => item.id === id)
}

export function formatEnterpriseSummary(activity: EnterpriseDiscountActivityForm): string {
  if (activity.enterprises.length === 0) return '未选择企业'
  const names = activity.enterprises
    .map((item) => getEnterprise(item.enterpriseId)?.name ?? item.enterpriseId)
    .slice(0, 2)
  const extra = activity.enterprises.length > 2 ? `等${activity.enterprises.length}家` : ''
  const first = activity.enterprises[0]
  return `${names.join('、')}${extra} · ${first.discount}折起`
}

export function formatRuleSummary(activity: EnterpriseDiscountActivityForm): string {
  return formatEnterpriseSummary(activity)
}

export function formatParticipationLimits(activity: EnterpriseDiscountActivityForm) {
  const periodLabel = { daily: '每天', weekly: '每周', monthly: '每月' } as const
  return {
    totalOrders: activity.totalParticipationLimitType === 'limited'
      ? `活动期间每个用户最多优惠 ${activity.totalParticipationLimit} 单`
      : '不限制',
    frequency: activity.participationFrequencyType === 'limited'
      ? `${periodLabel[activity.participationFrequencyPeriod]}最多优惠 ${activity.participationFrequencyLimit} 单`
      : '不限制',
    itemsTotal: activity.maxDiscountItemsTotalType === 'limited'
      ? `活动期间每个用户最多优惠 ${activity.maxDiscountItemsTotal} 件`
      : '不限制',
    itemsPeriod: activity.maxDiscountItemsPeriodType === 'limited'
      ? `每个用户${periodLabel[activity.maxDiscountItemsPeriod]}最多优惠 ${activity.maxDiscountItemsPeriodLimit} 件`
      : '不限制',
    itemsPerOrder: activity.maxDiscountItemsPerOrderType === 'limited'
      ? `每单最多优惠 ${activity.maxDiscountItemsPerOrder} 件`
      : '不限制',
    hitRule: activity.discountHitRule === 'high_to_low' ? '优惠售价高到低的商品' : '优惠售价低到高的商品',
  }
}

export function computePublishStatus(activity: EnterpriseDiscountActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function getProductSummary(activity: EnterpriseDiscountActivityForm): string {
  if (activity.productScope === 'all') {
    return activity.productSelectionMode === 'exclude' ? '全部商品（有排除）' : '全部商品'
  }
  const count = activity.productIds.length
  const prefix = activity.productSelectionMode === 'exclude' ? '不参与' : ''
  return count > 0 ? `${prefix}${count}个商品` : '未选择商品'
}

export function getStoreSummary(activity: EnterpriseDiscountActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  const count = activity.storeIds.length
  if (count === 0) return '未选择门店'
  if (activity.storeScope === 'partial_exclude') return `${count}个门店不参与`
  return `${count}个门店参与`
}

export function getActivityRemainingLabel(activity: EnterpriseDiscountActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function formatCreatorDisplay(activity: EnterpriseDiscountActivityForm) {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

export function appendActivityLog(
  activity: EnterpriseDiscountActivityForm,
  action: string,
  detail?: string,
  operator?: { phone: string; org: string },
): EnterpriseDiscountActivityForm {
  const op = operator ?? { phone: activity.creatorPhone, org: activity.creatorOrg }
  const now = formatActivityDateTime()
  const log = createOperationLog(action, op, detail, now)
  return {
    ...activity,
    updatedAt: now,
    operationLogs: [log, ...(activity.operationLogs ?? [])],
  }
}

export function cloneActivity(activity: EnterpriseDiscountActivityForm): EnterpriseDiscountActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `ED${Date.now()}`,
    name: `${activity.name}(副本)`.slice(0, 20),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`),
    ],
  }
}

function validateEnterprises(activity: EnterpriseDiscountActivityForm): string | null {
  if (activity.enterprises.length === 0) return '请至少选择一个企业客户'
  const seen = new Set<string>()
  for (const item of activity.enterprises) {
    if (seen.has(item.enterpriseId)) return '同一企业不可重复添加'
    seen.add(item.enterpriseId)
    if (!getEnterprise(item.enterpriseId)) return '存在无效的企业客户'
    if (item.discount < 0.1 || item.discount > 9.9) return '企业折扣须在 0.1–9.9 折之间'
    if (!item.displayTag.trim()) return '请填写展示标签'
    if (item.displayTag.length > 10) return '展示标签不超过 10 个字'
  }
  return null
}

export function validateStep(activity: EnterpriseDiscountActivityForm, step: number): string | null {
  if (step === 0) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (activity.name.length > 20) return '活动名称不超过 20 个字'
    if (activity.description.length > 30) return '活动描述不超过 30 个字'
    if (!activity.startTime || !activity.endTime) return '请填写活动时间'
    if (new Date(activity.endTime) <= new Date(activity.startTime)) return '结束时间须晚于开始时间'
    if (activity.channels.length === 0) return '请至少选择一个参与渠道'
    if (activity.orderTypes.length === 0) return '请至少选择一个业务场景'
    if (activity.totalParticipationLimitType === 'limited' && activity.totalParticipationLimit < 1) {
      return '活动期间优惠单数须大于 0'
    }
    if (activity.participationFrequencyType === 'limited' && activity.participationFrequencyLimit < 1) {
      return '参与频次优惠单数须大于 0'
    }
    if (activity.maxDiscountItemsTotalType === 'limited' && activity.maxDiscountItemsTotal < 1) {
      return '活动期间优惠件数须大于 0'
    }
    if (activity.maxDiscountItemsPeriodType === 'limited' && activity.maxDiscountItemsPeriodLimit < 1) {
      return '周期优惠件数须大于 0'
    }
    if (activity.maxDiscountItemsPerOrderType === 'limited' && activity.maxDiscountItemsPerOrder < 1) {
      return '每单优惠件数须大于 0'
    }
    const enterpriseErr = validateEnterprises(activity)
    if (enterpriseErr) return enterpriseErr
  }
  if (step === 1) {
    if (activity.storeScope !== 'all' && activity.storeIds.length === 0) return '请至少选择一个门店'
  }
  if (step === 2) {
    if (activity.productScope === 'partial' && activity.productIds.length === 0) return '请至少选择一个商品'
  }
  return null
}

export function matchesFilters(
  activity: EnterpriseDiscountActivityForm,
  filters: EnterpriseDiscountListFilters,
): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  const keyword = filters.keyword.trim().toLowerCase()
  if (keyword) {
    const names = activity.enterprises
      .map((item) => getEnterprise(item.enterpriseId)?.name ?? '')
      .join(' ')
    const hit = activity.name.toLowerCase().includes(keyword)
      || activity.id.toLowerCase().includes(keyword)
      || names.toLowerCase().includes(keyword)
    if (!hit) return false
  }
  if (filters.startDate && activity.endTime.slice(0, 10) < filters.startDate) return false
  if (filters.endDate && activity.startTime.slice(0, 10) > filters.endDate) return false
  return true
}

export function countActivitiesByStatus(
  activities: EnterpriseDiscountActivityForm[],
  filters: EnterpriseDiscountListFilters,
): Record<ActivityStatus | 'all', number> {
  const base = activities.filter((a) => matchesFilters(a, { ...filters, status: 'all' }))
  const counts = {
    all: base.length,
    draft: 0,
    pending: 0,
    not_started: 0,
    in_progress: 0,
    paused: 0,
    ended: 0,
    voided: 0,
  } satisfies Record<ActivityStatus | 'all', number>
  for (const a of base) counts[a.status] += 1
  return counts
}

export function migrateEnterpriseDiscountActivity(raw: Record<string, unknown>): EnterpriseDiscountActivityForm {
  const defaults = createEmptyEnterpriseDiscountActivity()
  const legacy = raw as Partial<EnterpriseDiscountActivityForm> & {
    dailyLimitType?: string
    dailyLimit?: number
  }
  const frequencyFromDaily = legacy.participationFrequencyType == null && legacy.dailyLimitType === 'limited'
  return {
    ...defaults,
    ...legacy,
    totalParticipationLimitType: legacy.totalParticipationLimitType ?? defaults.totalParticipationLimitType,
    totalParticipationLimit: numberOr(legacy.totalParticipationLimit, defaults.totalParticipationLimit),
    participationFrequencyType: frequencyFromDaily ? 'limited' : (legacy.participationFrequencyType ?? defaults.participationFrequencyType),
    participationFrequencyPeriod: legacy.participationFrequencyPeriod ?? defaults.participationFrequencyPeriod,
    participationFrequencyLimit: frequencyFromDaily
      ? numberOr(legacy.dailyLimit, 1)
      : numberOr(legacy.participationFrequencyLimit, defaults.participationFrequencyLimit),
    maxDiscountItemsTotalType: legacy.maxDiscountItemsTotalType ?? defaults.maxDiscountItemsTotalType,
    maxDiscountItemsTotal: numberOr(legacy.maxDiscountItemsTotal, defaults.maxDiscountItemsTotal),
    maxDiscountItemsPeriodType: legacy.maxDiscountItemsPeriodType ?? defaults.maxDiscountItemsPeriodType,
    maxDiscountItemsPeriod: legacy.maxDiscountItemsPeriod ?? defaults.maxDiscountItemsPeriod,
    maxDiscountItemsPeriodLimit: numberOr(legacy.maxDiscountItemsPeriodLimit, defaults.maxDiscountItemsPeriodLimit),
    maxDiscountItemsPerOrderType: legacy.maxDiscountItemsPerOrderType ?? defaults.maxDiscountItemsPerOrderType,
    maxDiscountItemsPerOrder: numberOr(legacy.maxDiscountItemsPerOrder, defaults.maxDiscountItemsPerOrder),
    discountHitRule: isHitRule(legacy.discountHitRule) ? legacy.discountHitRule : defaults.discountHitRule,
    enterprises: Array.isArray(legacy.enterprises) ? legacy.enterprises : defaults.enterprises,
    channels: Array.isArray(legacy.channels) ? legacy.channels : defaults.channels,
    orderTypes: Array.isArray(legacy.orderTypes) ? legacy.orderTypes : defaults.orderTypes,
    productIds: Array.isArray(legacy.productIds) ? legacy.productIds : defaults.productIds,
    storeIds: Array.isArray(legacy.storeIds) ? legacy.storeIds : defaults.storeIds,
    operationLogs: Array.isArray(legacy.operationLogs) ? legacy.operationLogs : defaults.operationLogs,
  }
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function isHitRule(value: unknown): value is EnterpriseDiscountHitRule {
  return value === 'high_to_low' || value === 'low_to_high'
}

export function getActivityProducts(activity: EnterpriseDiscountActivityForm) {
  return products.filter((p) => activity.productIds.includes(p.id))
}

export function getActivityStores(activity: EnterpriseDiscountActivityForm) {
  return stores.filter((s) => activity.storeIds.includes(s.id))
}
