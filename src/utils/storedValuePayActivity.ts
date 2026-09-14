import type {
  ActivityOperationLog,
  ActivityStatus,
  StoredValuePayActivityForm,
  StoredValuePayListFilters,
  StoredValuePayRule,
} from '../types'
import {
  STORED_VALUE_PAY_RULE_SHORT_LABELS,
  createEmptyStoredValuePayActivity,
} from '../mockStoredValuePayData'
import { getCreatorProfile, products } from '../mockData'
import { createOperationLog, formatActivityDateTime } from './activity'
import {
  appendActivityLog,
  formatPriceMethodValue,
  formatRuleSummary as formatProductRuleSummary,
  getActivityProducts,
  formatCreatorDisplay,
  getActivityRemainingLabel as getMemberPriceRemainingLabel,
  getActivityStores,
  getChannelSummary,
  getProductCount,
  getProductScopeLabel,
  getProductSummary,
  getStoreScopeLabel,
  getStoreSummary,
  isUniformPricing,
  validateProductItemValue,
} from './memberPriceActivity'

export {
  appendActivityLog,
  formatCreatorDisplay,
  formatPriceMethodValue,
  getActivityProducts,
  getActivityStores,
  getChannelSummary,
  getProductCount,
  getProductScopeLabel,
  getProductSummary,
  getStoreScopeLabel,
  getStoreSummary,
  isUniformPricing,
}

export function getPayRuleLabel(rule: StoredValuePayRule, short = false): string {
  if (short) return STORED_VALUE_PAY_RULE_SHORT_LABELS[rule]
  return rule === 'min_balance_pay'
    ? '储值余额支付 ≥ 0.01 即可参与'
    : '整单仅限储值余额支付才可参与'
}

/** 列表/预览用：支付规则 + 商品优惠摘要 */
export function formatRuleSummary(activity: StoredValuePayActivityForm): string {
  return `${getPayRuleLabel(activity.payRule, true)} · ${formatProductRuleSummary(activity)}`
}

export function formatProductOnlyRuleSummary(activity: StoredValuePayActivityForm): string {
  return formatProductRuleSummary(activity)
}

export function computePublishStatus(activity: StoredValuePayActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function getActivityRemainingLabel(activity: StoredValuePayActivityForm): string | null {
  return getMemberPriceRemainingLabel(activity as never)
}

export function cloneActivity(activity: StoredValuePayActivityForm): StoredValuePayActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `SV${Date.now()}`,
    name: `${activity.name}(副本)`,
    status: 'draft',
    pausedAt: undefined,
    createdAt: now,
    updatedAt: now,
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`),
    ],
  }
}

function validateLimitFields(activity: StoredValuePayActivityForm): string | null {
  if (activity.totalParticipationLimitType === 'limited' && activity.totalParticipationLimit < 1) {
    return '用户参与活动总次数须大于0'
  }
  if (activity.participationFrequencyType === 'limited' && activity.participationFrequencyLimit < 1) {
    return '用户参与活动频次须大于0'
  }
  if (activity.maxDiscountItemsTotalType === 'limited' && activity.maxDiscountItemsTotal < 1) {
    return '活动期间优惠件数限制须大于0'
  }
  if (activity.maxDiscountItemsDailyType === 'limited' && activity.maxDiscountItemsDaily < 1) {
    return '每天优惠件数限制须大于0'
  }
  if (activity.maxDiscountItemsPerOrderType === 'limited' && activity.maxDiscountItemsPerOrder < 1) {
    return '每单优惠件数限制须大于0'
  }
  return null
}

export function validateStep(activity: StoredValuePayActivityForm, step: number): string | null {
  if (step === 0) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (activity.name.length > 30) return '活动名称不超过30字'
    if (activity.title.length > 20) return '活动标题不超过20字'
    if (activity.tag.length > 20) return '商品促销标签不超过20字'
    if (activity.remark.length > 200) return '活动备注不超过200字'
    if (activity.description.length > 500) return '活动说明不超过500字'
    if (activity.activityCode.length > 30) return '活动编码不超过30字'
    if (!activity.startTime || !activity.endTime) return '请填写活动时间'
    if (new Date(activity.endTime) <= new Date(activity.startTime)) return '结束时间须晚于开始时间'
    if (activity.channels.length === 0) return '请至少选择一个参与渠道'
    if (activity.orderTypes.length === 0) return '请至少选择一个业务类型'
    if (!activity.payRule) return '请选择支付参与规则'
    const limitErr = validateLimitFields(activity)
    if (limitErr) return limitErr
  }
  if (step === 1) {
    if (activity.storeScope !== 'all' && activity.storeIds.length === 0) {
      return '请至少选择一个门店'
    }
  }
  if (step === 2) {
    const isExclude = activity.productSelectionMode === 'exclude'
    if (activity.productScope === 'partial' && activity.productIds.length === 0) {
      return isExclude ? '请至少选择一个不参与商品' : '请至少选择一个参与商品'
    }
    if (isUniformPricing(activity)) {
      const err = validateProductItemValue(activity.priceMethod, activity.allProductsValue)
      if (err) return `优惠设置：${err}`
      if (isExclude && activity.productScope === 'partial' && getActivityProducts(activity).length === 0) {
        return '不参与商品已覆盖全部商品，请调整选择'
      }
    } else if (activity.productScope === 'partial') {
      for (const item of activity.productItems) {
        const product = products.find((p) => p.id === item.productId)
        const err = validateProductItemValue(activity.priceMethod, item.value, product?.price)
        if (err) return `「${product?.name ?? item.productId}」${err}`
      }
    }
  }
  return null
}

function matchesProductName(activity: StoredValuePayActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProducts(activity).some((p) => p.name.toLowerCase().includes(kw))
}

function matchesProductId(activity: StoredValuePayActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProducts(activity).some((p) =>
    p.id.toLowerCase().includes(kw) || p.skuId.toLowerCase().includes(kw),
  )
}

export function matchesFilters(activity: StoredValuePayActivityForm, filters: StoredValuePayListFilters): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (filters.priceMethod !== 'all' && activity.priceMethod !== filters.priceMethod) return false
  if (filters.payRule !== 'all' && activity.payRule !== filters.payRule) return false
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    if (!activity.name.toLowerCase().includes(kw) && !activity.id.toLowerCase().includes(kw)) return false
  }
  if (filters.productName && !matchesProductName(activity, filters.productName)) return false
  if (filters.productId && !matchesProductId(activity, filters.productId)) return false
  if (filters.activityCode) {
    const code = filters.activityCode.toLowerCase()
    if (!activity.activityCode.toLowerCase().includes(code)) return false
  }
  if (filters.startDate) {
    const actEnd = new Date(activity.endTime.replace(/-/g, '/'))
    if (actEnd < new Date(filters.startDate)) return false
  }
  if (filters.endDate) {
    const actStart = new Date(activity.startTime.replace(/-/g, '/'))
    if (actStart > new Date(filters.endDate + ' 23:59:59')) return false
  }
  if (filters.storeId && filters.storeId !== 'all') {
    if (activity.storeScope === 'all') return true
    if (!activity.storeIds.includes(filters.storeId)) return false
  }
  return true
}

export function countActivitiesByStatus(
  activities: StoredValuePayActivityForm[],
  filters: StoredValuePayListFilters,
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

export function migrateStoredValuePayActivity(raw: Record<string, unknown>): StoredValuePayActivityForm {
  const defaults = createEmptyStoredValuePayActivity()
  const legacy = raw as Partial<StoredValuePayActivityForm>
  const productIds = legacy.productIds ?? legacy.productItems?.map((i) => i.productId) ?? defaults.productIds
  const productItems = legacy.productItems?.length
    ? legacy.productItems
    : productIds.map((productId) => ({
        productId,
        value: legacy.allProductsValue ?? defaults.allProductsValue,
      }))
  return {
    ...defaults,
    ...legacy,
    payRule: legacy.payRule ?? defaults.payRule,
    remark: legacy.remark ?? '',
    priceMethod: legacy.priceMethod ?? defaults.priceMethod,
    productIds,
    productItems,
    allProductsValue: legacy.allProductsValue ?? defaults.allProductsValue,
    productScope:
      legacy.productSelectionMode === 'exclude' && legacy.productScope === 'all'
        ? 'partial'
        : legacy.productScope ?? defaults.productScope,
    memberPriceTagDisplay: legacy.memberPriceTagDisplay ?? defaults.memberPriceTagDisplay,
    creatorPhone: legacy.creatorPhone ?? getCreatorProfile(legacy.creator ?? defaults.creator).phone,
    creatorOrg: legacy.creatorOrg ?? getCreatorProfile(legacy.creator ?? defaults.creator).org,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
    operationLogs: (legacy.operationLogs as ActivityOperationLog[] | undefined)?.length
      ? legacy.operationLogs as ActivityOperationLog[]
      : defaults.operationLogs,
  }
}
