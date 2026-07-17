import type {
  ActivityOperationLog,
  ActivityStatus,
  FullReductionActivityForm,
  FullReductionDiscountType,
  FullReductionListFilters,
  FullReductionThresholdType,
  FullReductionTier,
  WizardMode,
} from '../types'
import {
  DISCOUNT_TYPE_LABELS,
  DINER_ORDER_TYPE_IDS,
  FULL_REDUCTION_DINER_ORDER_TYPES,
  THRESHOLD_TYPE_LABELS,
  createDefaultTier,
  createEmptyFullReductionActivity,
} from '../mockFullReductionData'
import { PARTICIPANT_USER_OPTIONS, getCreatorProfile, products, stores } from '../mockData'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'

export { THRESHOLD_TYPE_LABELS, DISCOUNT_TYPE_LABELS, FULL_REDUCTION_DINER_ORDER_TYPES, DINER_ORDER_TYPE_IDS }

/** 选中满点餐人数时：渠道仅微信，业务场景仅堂食/外卖/外带（拼单） */
export function applyDinerCountScope(
  activity: FullReductionActivityForm,
): Pick<FullReductionActivityForm, 'channels' | 'orderTypes'> {
  const kept = activity.orderTypes.filter((id) => DINER_ORDER_TYPE_IDS.includes(id as typeof DINER_ORDER_TYPE_IDS[number]))
  return {
    channels: ['wechat'],
    orderTypes: kept.length > 0 ? kept : [...DINER_ORDER_TYPE_IDS],
  }
}

export function getThresholdUnit(type: FullReductionThresholdType): string {
  if (type === 'order_amount') return '元'
  if (type === 'item_count') return '件'
  return '人'
}

export function getDiscountUnit(type: FullReductionDiscountType): string {
  return type === 'amount_off' ? '元' : '折'
}

export function formatDiscountLabel(type: FullReductionDiscountType, value: number): string {
  if (type === 'amount_off') return `立减${value}元`
  return `${value}折`
}

export function formatTierSummary(
  thresholdType: FullReductionThresholdType,
  tier: FullReductionTier,
): string {
  const unit = getThresholdUnit(thresholdType)
  return `满${tier.threshold}${unit}${formatDiscountLabel(tier.discountType, tier.discountValue)}`
}

export function formatRuleSummary(activity: FullReductionActivityForm): string {
  const mode = activity.promoMode === 'tiered' ? '阶梯' : '循环'
  if (activity.promoMode === 'cyclic') {
    const unit = getThresholdUnit(activity.thresholdType)
    return `${mode}：每满${activity.cyclicThreshold}${unit}${formatDiscountLabel(activity.cyclicDiscountType, activity.cyclicDiscountValue)}`
  }
  const parts = activity.tiers.map((t) => formatTierSummary(activity.thresholdType, t))
  return `${mode}：${parts.join('；')}`
}

export function getThresholdTypeLabel(type: FullReductionThresholdType): string {
  return THRESHOLD_TYPE_LABELS[type]
}

/** 已发布未开始、进行中不可改门槛类型 */
export function canChangeThresholdType(
  status: ActivityStatus,
  mode: WizardMode,
): boolean {
  if (mode === 'view') return false
  if (mode === 'create' || mode === 'copy') return true
  return status === 'draft' || status === 'pending'
}

export function isDinerCountAllowed(activity: FullReductionActivityForm): boolean {
  if (!activity.channels.includes('wechat')) return false
  if (activity.channels.some((c) => c !== 'wechat')) return false
  if (activity.orderTypes.length === 0) return false
  return activity.orderTypes.every((id) => DINER_ORDER_TYPE_IDS.includes(id as typeof DINER_ORDER_TYPE_IDS[number]))
}

export function computePublishStatus(activity: FullReductionActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function getProductSummary(activity: FullReductionActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  const count = activity.productIds.length
  return count > 0 ? `${count}个商品` : '未选择'
}

export function getStoreSummary(activity: FullReductionActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  const count = activity.storeIds.length
  if (count === 0) return '未选择门店'
  if (activity.storeScope === 'partial_exclude') return `${count}个门店不参与`
  return `${count}个门店参与`
}

export function getStoreScopeLabel(activity: FullReductionActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  if (activity.storeScope === 'partial_exclude') return `指定门店不参与（${activity.storeIds.length}家）`
  return `指定门店参与（${activity.storeIds.length}家）`
}

export function getProductScopeLabel(activity: FullReductionActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  return `指定商品（${activity.productIds.length}个）`
}

export function getChannelSummary(activity: FullReductionActivityForm): string {
  const map: Record<string, string> = {
    wechat: '微信',
    alipay: '支付宝',
    douyin: '抖音',
    other: '其他',
  }
  return activity.channels.map((c) => map[c] || c).join('、') || '-'
}

export function getActivityProducts(activity: FullReductionActivityForm) {
  return products.filter((p) => activity.productIds.includes(p.id))
}

export function getActivityStores(activity: FullReductionActivityForm) {
  return stores.filter((s) => activity.storeIds.includes(s.id))
}

export function getParticipantUserLabel(activity: FullReductionActivityForm): string {
  return PARTICIPANT_USER_OPTIONS.find((o) => o.value === activity.participantUser)?.label ?? '-'
}

export function formatCreatorDisplay(activity: FullReductionActivityForm) {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

export function getActivityRemainingLabel(activity: FullReductionActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function appendActivityLog(
  activity: FullReductionActivityForm,
  action: string,
  detail?: string,
  operator?: { phone: string; org: string },
): FullReductionActivityForm {
  const op = operator ?? { phone: activity.creatorPhone, org: activity.creatorOrg }
  const now = formatActivityDateTime()
  const log = createOperationLog(action, op, detail, now)
  return {
    ...activity,
    updatedAt: now,
    operationLogs: [log, ...(activity.operationLogs ?? [])],
  }
}

export function cloneActivity(activity: FullReductionActivityForm): FullReductionActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `FR${Date.now()}`,
    name: `${activity.name}(副本)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`),
    ],
  }
}

function validateDiscountValue(type: FullReductionDiscountType, value: number): string | null {
  if (type === 'percent_off') {
    if (value < 0 || value > 9.9) return '折扣须在0-9.9之间'
  } else if (value <= 0) {
    return '立减金额须大于0'
  }
  return null
}

function validateTiers(activity: FullReductionActivityForm): string | null {
  if (activity.promoMode === 'cyclic') {
    if (activity.cyclicThreshold <= 0) return '循环门槛须大于0'
    return validateDiscountValue(activity.cyclicDiscountType, activity.cyclicDiscountValue)
  }
  if (!activity.tiers.length) return '请至少配置一档优惠'
  if (activity.tiers.length > 5) return '最多设置5个阶梯'
  for (let i = 0; i < activity.tiers.length; i++) {
    const tier = activity.tiers[i]
    if (tier.threshold <= 0) return `第${i + 1}档门槛须大于0`
    const err = validateDiscountValue(tier.discountType, tier.discountValue)
    if (err) return `第${i + 1}档：${err}`
    if (i > 0 && tier.threshold <= activity.tiers[i - 1].threshold) {
      return `第${i + 1}档门槛须大于上一档`
    }
  }
  return null
}

function validateLimitFields(activity: FullReductionActivityForm): string | null {
  if (activity.totalParticipationLimitType === 'limited' && activity.totalParticipationLimit < 1) {
    return '用户参与活动总次数须大于0'
  }
  if (activity.participationFrequencyType === 'limited' && activity.participationFrequencyLimit < 1) {
    return '用户参与活动频次须大于0'
  }
  return null
}

export function validateStep(activity: FullReductionActivityForm, step: number): string | null {
  if (step === 0) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (activity.name.length > 30) return '活动名称不超过30字'
    if (activity.title.length > 20) return '活动标题不超过20字'
    if (activity.description.length > 500) return '活动说明不超过500字'
    if (activity.activityCode.length > 30) return '活动编码不超过30字'
    if (!activity.startTime || !activity.endTime) return '请填写活动时间'
    if (new Date(activity.endTime) <= new Date(activity.startTime)) return '结束时间须晚于开始时间'
    if (activity.channels.length === 0) return '请至少选择一个参与渠道'
    if (activity.orderTypes.length === 0) return '请至少选择一个业务场景'
    if (activity.thresholdType === 'diner_count' && !isDinerCountAllowed(activity)) {
      return '满点餐人数仅支持微信渠道，且业务场景须为堂食/外卖/外带（拼单）'
    }
    const tierErr = validateTiers(activity)
    if (tierErr) return tierErr
    const limitErr = validateLimitFields(activity)
    if (limitErr) return limitErr
  }
  if (step === 1) {
    if (activity.storeScope !== 'all' && activity.storeIds.length === 0) {
      return '请至少选择一个门店'
    }
  }
  if (step === 2) {
    if (activity.productScope === 'partial' && activity.productIds.length === 0) {
      return '请至少选择一个参与商品'
    }
  }
  return null
}

export function matchesFilters(
  activity: FullReductionActivityForm,
  filters: FullReductionListFilters,
): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (filters.thresholdType !== 'all' && activity.thresholdType !== filters.thresholdType) return false
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

function getActivityProductCandidates(activity: FullReductionActivityForm) {
  return activity.productScope === 'all' ? products : getActivityProducts(activity)
}

function matchesProductName(activity: FullReductionActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProductCandidates(activity).some((p) => p.name.toLowerCase().includes(kw))
}

function matchesProductId(activity: FullReductionActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProductCandidates(activity).some((p) =>
    p.id.toLowerCase().includes(kw) || p.skuId.toLowerCase().includes(kw),
  )
}

export function countActivitiesByStatus(
  activities: FullReductionActivityForm[],
  filters: FullReductionListFilters,
): Record<ActivityStatus | 'all', number> {
  const base = activities.filter((a) => matchesFilters(a, { ...filters, status: 'all' }))
  const counts = {
    all: base.length,
    draft: 0,
    pending: 0,
    not_started: 0,
    in_progress: 0,
    ended: 0,
    voided: 0,
  } satisfies Record<ActivityStatus | 'all', number>
  for (const a of base) {
    counts[a.status] += 1
  }
  return counts
}

export function migrateFullReductionActivity(raw: Record<string, unknown>): FullReductionActivityForm {
  const defaults = createEmptyFullReductionActivity()
  const legacy = raw as Partial<FullReductionActivityForm>
  let orderTypes = legacy.orderTypes ?? defaults.orderTypes
  // 旧数据可能含独立 group_order，迁移为拼单场景下的堂食/外卖/外带
  if (orderTypes.includes('group_order')) {
    orderTypes = orderTypes.filter((id) => id !== 'group_order')
    if (legacy.thresholdType === 'diner_count' || orderTypes.length === 0) {
      orderTypes = [...DINER_ORDER_TYPE_IDS]
    }
  }
  const thresholdType = legacy.thresholdType ?? defaults.thresholdType
  const channels = thresholdType === 'diner_count'
    ? ['wechat']
    : (legacy.channels ?? defaults.channels)
  if (thresholdType === 'diner_count') {
    orderTypes = orderTypes.filter((id) => DINER_ORDER_TYPE_IDS.includes(id as typeof DINER_ORDER_TYPE_IDS[number]))
    if (orderTypes.length === 0) orderTypes = [...DINER_ORDER_TYPE_IDS]
  }
  const {
    seckillDiscount: _seckill,
    memberPriceStack: _memberStack,
    ...legacyRest
  } = legacy as Partial<FullReductionActivityForm> & {
    seckillDiscount?: boolean
    memberPriceStack?: boolean
  }

  return {
    ...defaults,
    ...legacyRest,
    thresholdType,
    channels,
    orderTypes,
    promoMode: legacy.promoMode ?? defaults.promoMode,
    tiers: legacy.tiers?.length ? legacy.tiers : createDefaultTier(),
    cyclicThreshold: legacy.cyclicThreshold ?? defaults.cyclicThreshold,
    cyclicDiscountType: legacy.cyclicDiscountType ?? defaults.cyclicDiscountType,
    cyclicDiscountValue: legacy.cyclicDiscountValue ?? defaults.cyclicDiscountValue,
    toppingsDiscount: legacy.toppingsDiscount ?? defaults.toppingsDiscount,
    packagingFeeDiscount: legacy.packagingFeeDiscount ?? defaults.packagingFeeDiscount,
    comboSurchargeDiscount: legacy.comboSurchargeDiscount ?? defaults.comboSurchargeDiscount,
    preparationSurchargeDiscount: legacy.preparationSurchargeDiscount ?? defaults.preparationSurchargeDiscount,
    productSelectionMode: legacy.productSelectionMode ?? defaults.productSelectionMode,
    creatorPhone: legacy.creatorPhone ?? getCreatorProfile(legacy.creator ?? defaults.creator).phone,
    creatorOrg: legacy.creatorOrg ?? getCreatorProfile(legacy.creator ?? defaults.creator).org,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
    operationLogs: (legacy.operationLogs as ActivityOperationLog[] | undefined)?.length
      ? legacy.operationLogs as ActivityOperationLog[]
      : defaults.operationLogs,
  }
}
