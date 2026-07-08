import type {
  ActivityOperationLog,
  ActivityStatus,
  DiscountMethod,
  MultiItemActivityForm,
  MultiItemDiscountHitRule,
  MultiItemListFilters,
  MultiItemRuleType,
} from '../types'
import {
  DISCOUNT_METHOD_LABELS,
  MULTI_ITEM_RULE_LABELS,
  SKU_THRESHOLD_LABELS,
  createEmptyMultiItemActivity,
} from '../mockMultiItemData'
import { PARTICIPANT_USER_OPTIONS, getCreatorProfile, products, stores } from '../mockData'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'

export { MULTI_ITEM_RULE_LABELS, DISCOUNT_METHOD_LABELS, SKU_THRESHOLD_LABELS }

export function isCycleHitRuleRuleType(ruleType: MultiItemRuleType): boolean {
  return ruleType === 'every_n_items' || ruleType === 'every_reach_m_discount_n'
}

export function getHitRuleM(activity: MultiItemActivityForm): number {
  if (activity.ruleType === 'every_n_items') return activity.everyN
  if (activity.ruleType === 'every_reach_m_discount_n') return activity.thresholdM
  return activity.everyN
}

export function normalizeDiscountHitRule(
  ruleType: MultiItemRuleType,
  current: MultiItemDiscountHitRule,
): MultiItemDiscountHitRule {
  if (isCycleHitRuleRuleType(ruleType)) {
    if (current === 'every_m_highest' || current === 'every_m_lowest') return current
    return current === 'high_to_low' ? 'every_m_highest' : 'every_m_lowest'
  }
  if (current === 'high_to_low' || current === 'low_to_high') return current
  return current === 'every_m_highest' ? 'high_to_low' : 'low_to_high'
}

export function getDiscountHitRuleLabel(activity: MultiItemActivityForm): string {
  const m = getHitRuleM(activity)
  switch (activity.discountHitRule) {
    case 'high_to_low':
      return '优惠售价高到低的商品'
    case 'low_to_high':
      return '优惠售价低到高的商品'
    case 'every_m_highest':
      return `每${m}件(价格降序)优惠其中最高`
    case 'every_m_lowest':
      return `每${m}件(价格降序)优惠其中最低`
  }
}

export function getMultiItemRuleTypeLabel(ruleType: MultiItemRuleType): string {
  return MULTI_ITEM_RULE_LABELS[ruleType]
}

export function formatDiscountValue(method: DiscountMethod, value: number): string {
  if (method === 'discount') return `${value}折`
  if (method === 'fixed_reduction') return `立减${value}元`
  return `特价${value}元`
}

export function formatRuleSummary(activity: MultiItemActivityForm): string {
  const discount = formatDiscountValue(activity.discountMethod, activity.discountValue)
  let core = ''
  switch (activity.ruleType) {
    case 'nth_item':
      core = `第${activity.targetNth}件${discount}`
      break
    case 'every_n_items':
      core = `每${activity.everyN}件1件${discount}`
      break
    case 'reach_m_discount_n':
      core = `满${activity.thresholdM}件${activity.discountCountN}件${discount}`
      break
    case 'every_reach_m_discount_n':
      core = `每满${activity.thresholdM}件${activity.discountCountN}件${discount}`
      break
  }
  const sku = activity.skuThresholdMode === 'same_sku' ? '同一活动商品' : '任意活动商品'
  return `${core}（${sku}）`
}

export function getRuleHint(activity: MultiItemActivityForm): string {
  const hit = getDiscountHitRuleLabel(activity)
  const skuNote = activity.skuThresholdMode === 'same_sku'
    ? '各参与商品独立计算门槛与优惠件数。'
    : '活动内参与商品合并计算门槛与优惠件数。'

  switch (activity.ruleType) {
    case 'nth_item':
      return `购买指定商品，第 ${activity.targetNth}、${activity.targetNth * 2}… 件享受优惠；按「${hit}」结算。${skuNote}`
    case 'every_n_items':
      return `每买 ${activity.everyN} 件，其中 1 件享受优惠（循环计算）；买 ${activity.everyN * 2} 件优惠 2 件。按「${hit}」结算。${skuNote}`
    case 'reach_m_discount_n':
      return `单笔订单满 ${activity.thresholdM} 件门槛后，${activity.discountCountN} 件享受优惠（仅触发一次，不循环）。按「${hit}」结算。${skuNote}`
    case 'every_reach_m_discount_n':
      return `每满 ${activity.thresholdM} 件，${activity.discountCountN} 件享受优惠（循环计算）；买 ${activity.thresholdM * 2} 件优惠 ${activity.discountCountN * 2} 件。按「${hit}」结算。${skuNote}`
  }
}

export function getRuleExample(activity: MultiItemActivityForm): string {
  const discount = formatDiscountValue(activity.discountMethod, activity.discountValue)
  switch (activity.ruleType) {
    case 'nth_item':
      return activity.skuThresholdMode === 'same_sku'
        ? `商品A买4件 → 第2、4件享受${discount}`
        : `商品A买2件+商品B买2件=共4件 → 2件享受${discount}`
    case 'every_n_items':
      return activity.skuThresholdMode === 'same_sku'
        ? `商品A买${activity.everyN * 2}件 → 2件享受${discount}`
        : `共买${activity.everyN * 2}件 → 2件享受${discount}`
    case 'reach_m_discount_n':
      return activity.skuThresholdMode === 'same_sku'
        ? `商品A买${activity.thresholdM}件 → ${activity.discountCountN}件享受${discount}；买${activity.thresholdM * 2}件仍只优惠${activity.discountCountN}件`
        : `共买${activity.thresholdM}件 → ${activity.discountCountN}件享受${discount}`
    case 'every_reach_m_discount_n':
      return activity.skuThresholdMode === 'same_sku'
        ? `商品A买${activity.thresholdM * 2}件 → ${activity.discountCountN * 2}件享受${discount}`
        : `共买${activity.thresholdM * 2}件 → ${activity.discountCountN * 2}件享受${discount}`
  }
}

export function computePublishStatus(activity: MultiItemActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function getProductSummary(activity: MultiItemActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  const count = activity.productIds.length
  return count > 0 ? `${count}个商品` : '未选择'
}

export function getStoreSummary(activity: MultiItemActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  const count = activity.storeIds.length
  if (count === 0) return '未选择门店'
  if (activity.storeScope === 'partial_exclude') return `${count}个门店不参与`
  return `${count}个门店参与`
}

export function getStoreScopeLabel(activity: MultiItemActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  if (activity.storeScope === 'partial_exclude') return `指定门店不参与（${activity.storeIds.length}家）`
  return `指定门店参与（${activity.storeIds.length}家）`
}

export function getProductScopeLabel(activity: MultiItemActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  return `指定商品（${activity.productIds.length}个）`
}

export function getChannelSummary(activity: MultiItemActivityForm): string {
  const map: Record<string, string> = {
    wechat: '微信',
    alipay: '支付宝',
    douyin: '抖音',
    other: '其他',
  }
  return activity.channels.map((c) => map[c] || c).join('、') || '-'
}

export function getActivityProducts(activity: MultiItemActivityForm) {
  return products.filter((p) => activity.productIds.includes(p.id))
}

export function getActivityStores(activity: MultiItemActivityForm) {
  return stores.filter((s) => activity.storeIds.includes(s.id))
}

export function getParticipantUserLabel(activity: MultiItemActivityForm): string {
  return PARTICIPANT_USER_OPTIONS.find((o) => o.value === activity.participantUser)?.label ?? '-'
}

export function formatCreatorDisplay(activity: MultiItemActivityForm) {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

export function getActivityRemainingLabel(activity: MultiItemActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function buildActivityPreviewTags(activity: MultiItemActivityForm): string[] {
  return [
    getMultiItemRuleTypeLabel(activity.ruleType),
    formatRuleSummary(activity),
    getProductSummary(activity),
    getStoreSummary(activity),
    getChannelSummary(activity),
  ]
}

export function appendActivityLog(
  activity: MultiItemActivityForm,
  action: string,
  detail?: string,
  operator?: { phone: string; org: string },
): MultiItemActivityForm {
  const op = operator ?? { phone: activity.creatorPhone, org: activity.creatorOrg }
  const now = formatActivityDateTime()
  const log = createOperationLog(action, op, detail, now)
  return {
    ...activity,
    updatedAt: now,
    operationLogs: [log, ...(activity.operationLogs ?? [])],
  }
}

export function cloneActivity(activity: MultiItemActivityForm): MultiItemActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `MI${Date.now()}`,
    name: `${activity.name}(副本)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`),
    ],
  }
}

function validateDiscountValue(activity: MultiItemActivityForm): string | null {
  if (activity.discountMethod === 'discount') {
    if (activity.discountValue < 0.1 || activity.discountValue > 9.9) {
      return '折扣须在0.1-9.9之间'
    }
  } else if (activity.discountValue <= 0) {
    return '优惠力度须大于0'
  }
  return null
}

function validateRuleParams(activity: MultiItemActivityForm): string | null {
  switch (activity.ruleType) {
    case 'nth_item':
      if (activity.targetNth < 2) return '第几件须不小于2'
      break
    case 'every_n_items':
      if (activity.everyN < 2) return '每几件须不小于2'
      break
    case 'reach_m_discount_n':
    case 'every_reach_m_discount_n':
      if (activity.thresholdM < 2) return '门槛件数须不小于2'
      if (activity.discountCountN < 1) return '优惠件数须不小于1'
      if (activity.discountCountN > activity.thresholdM) {
        return '优惠件数不能大于门槛件数'
      }
      break
  }
  return validateDiscountValue(activity)
}

function validateLimitFields(activity: MultiItemActivityForm): string | null {
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

export function validateStep(activity: MultiItemActivityForm, step: number): string | null {
  if (step === 0) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (activity.name.length > 30) return '活动名称不超过30字'
    if (activity.title.length > 20) return '活动标题不超过20字'
    if (activity.tag.length > 20) return '商品促销标签不超过20字'
    if (activity.description.length > 500) return '活动说明不超过500字'
    if (activity.activityCode.length > 30) return '活动编码不超过30字'
    if (!activity.startTime || !activity.endTime) return '请填写活动时间'
    if (new Date(activity.endTime) <= new Date(activity.startTime)) return '结束时间须晚于开始时间'
    if (activity.channels.length === 0) return '请至少选择一个参与渠道'
    const ruleErr = validateRuleParams(activity)
    if (ruleErr) return ruleErr
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

function matchesProductName(activity: MultiItemActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  const candidates = activity.productScope === 'all'
    ? products
    : getActivityProducts(activity)
  return candidates.some((p) => p.name.toLowerCase().includes(kw))
}

function matchesProductId(activity: MultiItemActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  const candidates = activity.productScope === 'all'
    ? products
    : getActivityProducts(activity)
  return candidates.some((p) =>
    p.id.toLowerCase().includes(kw) || p.skuId.toLowerCase().includes(kw),
  )
}

export function matchesFilters(activity: MultiItemActivityForm, filters: MultiItemListFilters): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (filters.ruleType !== 'all' && activity.ruleType !== filters.ruleType) return false
  if (filters.discountMethod !== 'all' && activity.discountMethod !== filters.discountMethod) return false
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
  if (filters.participantUser !== 'all' && activity.participantUser !== filters.participantUser) return false
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
  activities: MultiItemActivityForm[],
  filters: MultiItemListFilters,
): Record<ActivityStatus | 'all', number> {
  const base = activities.filter((a) =>
    matchesFilters(a, { ...filters, status: 'all' }),
  )
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

function migrateDiscountHitRule(raw: unknown): MultiItemDiscountHitRule {
  if (raw === 'high_to_low' || raw === 'low_to_high' || raw === 'every_m_highest' || raw === 'every_m_lowest') {
    return raw
  }
  if (raw === 'highest_price') return 'high_to_low'
  if (raw === 'lowest_price') return 'low_to_high'
  return 'high_to_low'
}

export function migrateMultiItemActivity(raw: Record<string, unknown>): MultiItemActivityForm {
  const defaults = createEmptyMultiItemActivity()
  const legacy = raw as Partial<MultiItemActivityForm>
  return {
    ...defaults,
    ...legacy,
    ruleType: legacy.ruleType ?? defaults.ruleType,
    skuThresholdMode: legacy.skuThresholdMode ?? defaults.skuThresholdMode,
    discountMethod: legacy.discountMethod ?? defaults.discountMethod,
    discountValue: legacy.discountValue ?? defaults.discountValue,
    targetNth: legacy.targetNth ?? defaults.targetNth,
    everyN: legacy.everyN ?? defaults.everyN,
    thresholdM: legacy.thresholdM ?? defaults.thresholdM,
    discountCountN: legacy.discountCountN ?? defaults.discountCountN,
    discountHitRule: migrateDiscountHitRule(legacy.discountHitRule),
    comboSurchargeDiscount: legacy.comboSurchargeDiscount ?? defaults.comboSurchargeDiscount,
    maxDiscountItemsTotalType: legacy.maxDiscountItemsTotalType ?? defaults.maxDiscountItemsTotalType,
    maxDiscountItemsTotal: legacy.maxDiscountItemsTotal ?? defaults.maxDiscountItemsTotal,
    maxDiscountItemsDailyType: legacy.maxDiscountItemsDailyType ?? defaults.maxDiscountItemsDailyType,
    maxDiscountItemsDaily: legacy.maxDiscountItemsDaily ?? defaults.maxDiscountItemsDaily,
    productSelectionMode: legacy.productSelectionMode ?? defaults.productSelectionMode,
    creatorPhone: legacy.creatorPhone ?? getCreatorProfile(legacy.creator ?? defaults.creator).phone,
    creatorOrg: legacy.creatorOrg ?? getCreatorProfile(legacy.creator ?? defaults.creator).org,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
    operationLogs: (legacy.operationLogs as ActivityOperationLog[] | undefined)?.length
      ? legacy.operationLogs as ActivityOperationLog[]
      : defaults.operationLogs,
  }
}
