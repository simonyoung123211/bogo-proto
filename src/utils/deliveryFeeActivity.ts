import type {
  ActivityOperationLog,
  ActivityStatus,
  DeliveryFeeActivityForm,
  DeliveryFeeCityRuleGroup,
  DeliveryFeeDiscountMethod,
  DeliveryFeeListFilters,
  DeliveryFeeOfferRule,
  DeliveryFeeThresholdType,
  DeliveryFeeTier,
} from '../types'
import {
  CITY_NAME_MAP,
  DELIVERY_FEE_EXPRESS_TYPE_ID,
  DELIVERY_FEE_TAKEAWAY_TYPE_IDS,
  DISCOUNT_METHOD_LABELS,
  MAX_CITY_GROUPS,
  MAX_TIERS,
  THRESHOLD_TYPE_LABELS,
  createDefaultTiers,
  createEmptyDeliveryFeeActivity,
} from '../mockDeliveryFeeData'
import { MEMBER_LEVELS, PARTICIPANT_USER_OPTIONS, getCreatorProfile, stores } from '../mockData'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'
import { matchesActivityProductFilters, resolveActivityProducts } from './activityProductSearch'

export function getThresholdTypeLabel(type: DeliveryFeeThresholdType): string {
  return THRESHOLD_TYPE_LABELS[type]
}

export function formatTierLine(
  tier: DeliveryFeeTier,
  thresholdType: DeliveryFeeThresholdType = 'amount',
): string {
  const discount =
    tier.discountMethod === 'waive'
      ? '免除配送费'
      : tier.discountMethod === 'percent_off'
        ? `配送费${tier.discountValue}折`
        : `减${tier.discountValue}元配送费`
  if (thresholdType === 'none') return `无门槛${discount}`
  if (thresholdType === 'item_count') return `满${tier.threshold}件${discount}`
  return `满${tier.threshold}元${discount}`
}

export function formatRuleSummary(activity: DeliveryFeeActivityForm): string {
  if (activity.ruleMode === 'by_city') {
    if (activity.offerMode === 'by_member_level') return '指定城市与会员等级配置冲突'
    return `指定城市 · ${activity.cityRuleGroups.length} 组 · ${getActivityCityIds(activity).length} 个城市`
  }
  if (activity.offerMode === 'by_member_level') {
    const count = getMemberLevelOffers(activity).length
    return count ? `按会员等级配置 · ${count} 个等级` : '按会员等级配置 · 尚未选择等级'
  }
  const thrLabel = getThresholdTypeLabel(activity.thresholdType)
  const tierText = activity.tiers.map((t) => formatTierLine(t, activity.thresholdType)).join('；')
  return `全国·${thrLabel}：${tierText}`
}

export function getMemberLevelOffers(activity: DeliveryFeeActivityForm) {
  return MEMBER_LEVELS.flatMap((level) => {
    const rule = activity.memberLevelRules[level.id]
    return rule ? [{ ...level, rule }] : []
  })
}

export function hasAmountThreshold(activity: DeliveryFeeActivityForm): boolean {
  if (activity.ruleMode === 'by_city') {
    return activity.cityRuleGroups.some((group) => group.thresholdType === 'amount')
  }
  return activity.offerMode === 'by_member_level'
    ? getMemberLevelOffers(activity).some(({ rule }) => rule.thresholdType === 'amount')
    : activity.thresholdType === 'amount'
}

export function getCityNames(cityIds: string[]): string {
  return cityIds.map((id) => CITY_NAME_MAP[id] ?? id).join('、')
}

export function getCityRuleGroupLabel(group: DeliveryFeeCityRuleGroup, index: number): string {
  return group.name.trim() || `城市组 ${index + 1}`
}

function getActivityCityIds(activity: DeliveryFeeActivityForm): string[] {
  return [...new Set(activity.cityRuleGroups.flatMap((group) => group.cityIds))]
}

export function createDeliveryFeeCityRuleGroup(rule: DeliveryFeeOfferRule): DeliveryFeeCityRuleGroup {
  return {
    id: `city-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    cityIds: [],
    thresholdType: rule.thresholdType,
    tiers: rule.tiers.map((tier) => ({ ...tier })),
  }
}

export function computePublishStatus(activity: DeliveryFeeActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function cloneActivity(activity: DeliveryFeeActivityForm): DeliveryFeeActivityForm {
  const profile = getCreatorProfile('10086')
  const now = formatActivityDateTime()
  const copy: DeliveryFeeActivityForm = JSON.parse(JSON.stringify(activity))
  copy.id = `DF${Date.now()}`
  copy.name = `${activity.name}-副本`
  copy.status = 'draft'
  copy.pausedAt = undefined
  copy.createdAt = now
  copy.updatedAt = now
  copy.creator = '10086'
  copy.creatorPhone = profile.phone
  copy.creatorOrg = profile.org
  copy.operationLogs = [createOperationLog('复制活动', profile, `从「${activity.name}」复制`, now)]
  return copy
}

export function appendActivityLog(
  activity: DeliveryFeeActivityForm,
  action: string,
  detail: string,
  operator: { phone: string; org: string },
): DeliveryFeeActivityForm {
  const log: ActivityOperationLog = createOperationLog(action, operator, detail)
  return {
    ...activity,
    updatedAt: formatActivityDateTime(),
    operationLogs: [log, ...activity.operationLogs],
  }
}

/** 旧单组活动沿用原城市名单和优惠，历史多组记录保留各组规则 */
export function migrateDeliveryFeeActivity(raw: Record<string, unknown>): DeliveryFeeActivityForm {
  const base = createEmptyDeliveryFeeActivity()
  const merged = { ...base, ...raw } as DeliveryFeeActivityForm & {
    cityIds?: string[]
    nationalTiers?: DeliveryFeeTier[]
    defaultTiers?: DeliveryFeeTier[]
    defaultRuleEnabled?: boolean
  }

  if (!merged.thresholdType) merged.thresholdType = 'amount'
  if (merged.offerMode !== 'by_member_level') merged.offerMode = 'unified'
  const memberLevelRules: DeliveryFeeActivityForm['memberLevelRules'] = {}
  for (const { id } of MEMBER_LEVELS) {
    const rule = merged.memberLevelRules?.[id]
    if (rule && Object.hasOwn(THRESHOLD_TYPE_LABELS, rule.thresholdType) && Array.isArray(rule.tiers)) {
      memberLevelRules[id] = rule
    }
  }
  merged.memberLevelRules = memberLevelRules
  if (typeof merged.includeToppings !== 'boolean') merged.includeToppings = false
  if (typeof merged.includePackagingFee !== 'boolean') merged.includePackagingFee = false
  if (typeof merged.includePreparationSurcharge !== 'boolean') merged.includePreparationSurcharge = false

  if (!Array.isArray(raw.tiers) || raw.tiers.length === 0) {
    merged.tiers = merged.nationalTiers?.length ? merged.nationalTiers : createDefaultTiers()
  }

  const legacyCityIds = Array.isArray(merged.cityIds) ? merged.cityIds : []
  if (Array.isArray(raw.cityRuleGroups)) {
    merged.cityRuleGroups = merged.cityRuleGroups.filter(Boolean).map((group, index) => ({
      id: group.id || `city-group-${index + 1}`,
      name: typeof group.name === 'string' ? group.name : '',
      cityIds: Array.isArray(group.cityIds) ? [...new Set(group.cityIds)] : [],
      thresholdType: Object.hasOwn(THRESHOLD_TYPE_LABELS, group.thresholdType) ? group.thresholdType : merged.thresholdType,
      tiers: Array.isArray(group.tiers) ? group.tiers : [],
    }))
  } else if (legacyCityIds.length || merged.ruleMode === 'by_city') {
    merged.cityRuleGroups = [{
      id: 'city-group-1',
      name: '',
      cityIds: [...new Set(legacyCityIds)],
      thresholdType: merged.thresholdType,
      tiers: merged.tiers,
    }]
  } else {
    merged.cityRuleGroups = []
  }

  delete merged.cityIds
  delete merged.nationalTiers
  delete merged.defaultTiers
  delete merged.defaultRuleEnabled

  return merged
}

export function hasExpress(activity: DeliveryFeeActivityForm): boolean {
  return activity.orderTypes.includes(DELIVERY_FEE_EXPRESS_TYPE_ID)
}

export function hasTakeaway(activity: DeliveryFeeActivityForm): boolean {
  return activity.orderTypes.some((id) =>
    (DELIVERY_FEE_TAKEAWAY_TYPE_IDS as string[]).includes(id),
  )
}

function stripTakeawayTypes(types: string[]): string[] {
  return types.filter((t) => !(DELIVERY_FEE_TAKEAWAY_TYPE_IDS as string[]).includes(t))
}

/** 取消门店快递时强制回全国统一（城市配置可保留但不生效） */
export function applyOrderTypesChange(
  activity: DeliveryFeeActivityForm,
  nextTypes: string[],
): DeliveryFeeActivityForm {
  let types = [...nextTypes]
  if (activity.ruleMode === 'by_city') {
    types = stripTakeawayTypes(types)
  }
  const next = { ...activity, orderTypes: types }
  if (!types.includes(DELIVERY_FEE_EXPRESS_TYPE_ID)) {
    next.ruleMode = 'national'
  }
  return next
}

export function applyRuleModeChange(
  activity: DeliveryFeeActivityForm,
  mode: DeliveryFeeActivityForm['ruleMode'],
): DeliveryFeeActivityForm {
  const next = { ...activity, ruleMode: mode }
  if (mode === 'by_city') {
    next.orderTypes = stripTakeawayTypes(activity.orderTypes)
    if (!next.orderTypes.includes(DELIVERY_FEE_EXPRESS_TYPE_ID)) {
      next.orderTypes = [...next.orderTypes, DELIVERY_FEE_EXPRESS_TYPE_ID]
    }
    if (next.cityRuleGroups.length === 0) {
      next.cityRuleGroups = [createDeliveryFeeCityRuleGroup(activity)]
    }
  }
  return next
}

export function validateTiers(
  tiers: DeliveryFeeTier[],
  label: string,
  thresholdType: DeliveryFeeThresholdType = 'amount',
): string | null {
  if (tiers.length === 0) return `${label}至少配置 1 条阶梯`
  if (thresholdType === 'none' && tiers.length > 1) {
    return `${label}在无门槛模式下仅支持 1 条优惠规则`
  }
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]
    if (thresholdType === 'amount' && !(t.threshold > 0)) {
      return `${label}第 ${i + 1} 档金额门槛须大于 0`
    }
    if (thresholdType === 'item_count') {
      if (!Number.isInteger(t.threshold) || t.threshold < 1) {
        return `${label}第 ${i + 1} 档件数门槛须为不小于 1 的整数`
      }
    }
    if (t.discountMethod === 'amount_off' && !(t.discountValue > 0)) {
      return `${label}第 ${i + 1} 档立减金额须大于 0`
    }
    if (t.discountMethod === 'amount_off' && t.discountValue > 999) {
      return `${label}第 ${i + 1} 档立减金额最高 999 元`
    }
    if (t.discountMethod === 'percent_off' && (!(t.discountValue > 0) || t.discountValue >= 10)) {
      return `${label}第 ${i + 1} 档折扣须在 0～10 折之间（不含 0 与 10）`
    }
  }
  return null
}

export function normalizeTiersForThresholdType(
  tiers: DeliveryFeeTier[],
  thresholdType: DeliveryFeeThresholdType,
): DeliveryFeeTier[] {
  if (thresholdType === 'none') {
    const first = tiers[0] ?? createDefaultTiers()[0]
    return [{ ...first, threshold: 0 }]
  }
  if (thresholdType === 'item_count') {
    return tiers.map((t) => ({
      ...t,
      threshold: Math.max(1, Math.round(t.threshold || 1)),
    }))
  }
  return tiers.map((t) => ({
    ...t,
    threshold: Math.round((t.threshold > 0 ? t.threshold : 0.01) * 100) / 100,
  }))
}

export function validateStep(activity: DeliveryFeeActivityForm, step: number): string | null {
  if (step === 0) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (!activity.startTime || !activity.endTime) return '请填写活动时间'
    if (activity.channels.length === 0) return '请选择适用渠道'
    if (activity.orderTypes.length === 0) return '请至少选择一个参与场景/业务'
    if (activity.ruleMode === 'by_city') {
      if (!hasExpress(activity)) return '指定城市仅支持门店快递，请勾选门店快递'
      if (hasTakeaway(activity)) return '指定城市不可同时勾选外卖类业务'
    }
    const offerError = validateOfferRules(activity)
    if (offerError) return offerError
    if (activity.totalParticipationLimitType === 'limited' && activity.totalParticipationLimit < 1) {
      return '用户参与活动总次数须大于0'
    }
    if (activity.participationFrequencyType === 'limited' && activity.participationFrequencyLimit < 1) {
      return '用户参与活动频次须大于0'
    }
    return null
  }
  if (step === 1) {
    if (activity.storeScope !== 'all' && activity.storeIds.length === 0) {
      return '请选择参与门店'
    }
    return null
  }
  if (step === 2) {
    if (activity.productScope === 'partial' && activity.productIds.length === 0) {
      return '请选择参与商品'
    }
    return null
  }
  return null
}

function validateOfferRules(activity: DeliveryFeeActivityForm): string | null {
  if (activity.ruleMode === 'by_city') {
    if (activity.offerMode === 'by_member_level') return '指定城市与按会员等级配置不可同时使用'
    return validateCityRuleGroups(activity.cityRuleGroups)
  }
  if (activity.offerMode !== 'by_member_level') {
    return validateTiers(activity.tiers, '优惠阶梯', activity.thresholdType)
  }

  const offers = getMemberLevelOffers(activity)
  if (offers.length === 0) return '请至少选择一个会员等级'
  for (const { label, rule } of offers) {
    const error = validateMemberLevelRule(rule, `${label}优惠规则`)
    if (error) return error
  }
  return null
}

function validateCityRuleGroups(groups: DeliveryFeeCityRuleGroup[]): string | null {
  if (groups.length === 0) return '请至少添加一个城市组'
  if (groups.length > MAX_CITY_GROUPS) return `城市组上限为 ${MAX_CITY_GROUPS} 组，请删除多余城市组`
  const groupByCity = new Map<string, string>()
  for (const [index, group] of groups.entries()) {
    const label = getCityRuleGroupLabel(group, index)
    if (group.cityIds.length === 0) return `请选择「${label}」的适用城市`
    for (const cityId of group.cityIds) {
      const previousGroup = groupByCity.get(cityId)
      if (previousGroup) return `${getCityNames([cityId])}同时在「${previousGroup}」和「${label}」，请选择一个组`
      groupByCity.set(cityId, label)
    }
    const error = validateTiers(group.tiers, `「${label}」`, group.thresholdType)
    if (error) return error
  }
  return null
}

function validateMemberLevelRule(rule: DeliveryFeeOfferRule, label: string): string | null {
  if (rule.tiers.length > MAX_TIERS) return `${label}最多配置 ${MAX_TIERS} 条阶梯`
  const error = validateTiers(rule.tiers, label, rule.thresholdType)
  if (error) return error
  if (rule.thresholdType !== 'none' && rule.tiers.some((tier, index) => index > 0 && tier.threshold <= rule.tiers[index - 1].threshold)) {
    return `${label}的阶梯门槛须逐档递增`
  }
  return null
}

/* ================= 活动间冲突（含快递命中方式 / 收货城市） ================= */

function parseActivityTime(value: string): number {
  return new Date(value.replace(/-/g, '/')).getTime()
}

function timeWindowsOverlap(a: DeliveryFeeActivityForm, b: DeliveryFeeActivityForm): boolean {
  const aStart = parseActivityTime(a.startTime)
  const aEnd = parseActivityTime(a.endTime)
  const bStart = parseActivityTime(b.startTime)
  const bEnd = parseActivityTime(b.endTime)
  if (Number.isNaN(aStart) || Number.isNaN(aEnd) || Number.isNaN(bStart) || Number.isNaN(bEnd)) return false
  return aStart <= bEnd && bStart <= aEnd
}

/** 展开为实际生效的门店集合 */
export function resolveStoreIds(activity: DeliveryFeeActivityForm): string[] {
  if (activity.storeScope === 'all') return stores.map((s) => s.id)
  if (activity.storeScope === 'partial_exclude') {
    return stores.filter((s) => !activity.storeIds.includes(s.id)).map((s) => s.id)
  }
  return activity.storeIds
}

export interface DeliveryFeeConflict {
  activity: DeliveryFeeActivityForm
  storeCount: number
  orderTypeIds: string[]
  cityOverlap: string[]
  regionReason: 'both_national' | 'national_vs_city' | 'city_overlap'
}

function getRegionOverlap(a: DeliveryFeeActivityForm, b: DeliveryFeeActivityForm): Pick<DeliveryFeeConflict, 'cityOverlap' | 'regionReason'> | null {
  if (a.ruleMode === 'national' && b.ruleMode === 'national') {
    return { cityOverlap: [], regionReason: 'both_national' }
  }
  if (a.ruleMode === 'national' || b.ruleMode === 'national') {
    const cityOverlap = getActivityCityIds(a.ruleMode === 'by_city' ? a : b)
    return cityOverlap.length ? { cityOverlap, regionReason: 'national_vs_city' } : null
  }
  const citiesB = new Set(getActivityCityIds(b))
  const cityOverlap = getActivityCityIds(a).filter((id) => citiesB.has(id))
  return cityOverlap.length ? { cityOverlap, regionReason: 'city_overlap' } : null
}

/**
 * 与已生效类活动冲突判定（草稿、已作废不参与）：
 * 时间窗 ∩ 门店 ∩ 参与业务 均有交集，且快递命中方式（含收货城市）冲突。
 */
export function findDeliveryFeeConflicts(
  target: DeliveryFeeActivityForm,
  all: DeliveryFeeActivityForm[],
): DeliveryFeeConflict[] {
  const targetStores = new Set(resolveStoreIds(target))
  const conflicts: DeliveryFeeConflict[] = []

  for (const other of all) {
    if (other.id === target.id) continue
    if (other.status === 'voided' || other.status === 'draft') continue
    if (!timeWindowsOverlap(target, other)) continue

    const onlyExpress = target.ruleMode === 'by_city' || other.ruleMode === 'by_city'
    const orderTypeIds = target.orderTypes.filter((id) => other.orderTypes.includes(id) && (!onlyExpress || id === DELIVERY_FEE_EXPRESS_TYPE_ID))
    if (orderTypeIds.length === 0) continue

    const storeHits = resolveStoreIds(other).filter((id) => targetStores.has(id))
    if (storeHits.length === 0) continue

    const region = getRegionOverlap(target, other)
    if (!region) continue

    conflicts.push({
      activity: other,
      storeCount: storeHits.length,
      orderTypeIds,
      ...region,
    })
  }
  return conflicts
}

function describeCityScope(activity: DeliveryFeeActivityForm, cityId: string): string {
  if (activity.ruleMode === 'national') return '全国'
  const index = activity.cityRuleGroups.findIndex((group) => group.cityIds.includes(cityId))
  return `「${getCityRuleGroupLabel(activity.cityRuleGroups[index], index)}」`
}

function formatDeliveryFeeConflictMessage(target: DeliveryFeeActivityForm, conflicts: DeliveryFeeConflict[]): string {
  const first = conflicts[0]
  const more = conflicts.length > 1 ? `（另有 ${conflicts.length - 1} 个活动同样冲突）` : ''
  const other = first.activity
  const conflictsWith = `与活动「${other.id} · ${other.name}」冲突，活动时间、门店及参与业务重叠。`
  if (first.regionReason === 'both_national') {
    return `${conflictsWith}双方均使用全国范围，不可同时生效${more}`
  }
  const cities = first.cityOverlap.slice(0, 5).map((id) => (
    `${getCityNames([id])}（本活动 ${describeCityScope(target, id)} / 对方活动 ${describeCityScope(other, id)}）`
  ))
  const otherCities = first.cityOverlap.length > cities.length ? `等 ${first.cityOverlap.length} 个城市` : ''
  return `${conflictsWith}门店快递收货城市重叠，涉及 ${cities.join('、')}${otherCities}。不可同时生效${more}`
}

/** 保存/发布前：逐步校验 + 活动间冲突（含快递命中方式） */
export function validateBeforeSave(
  activity: DeliveryFeeActivityForm,
  all: DeliveryFeeActivityForm[],
): string | null {
  for (let i = 0; i <= 2; i++) {
    const err = validateStep(activity, i)
    if (err) return err
  }
  const conflicts = findDeliveryFeeConflicts(activity, all)
  if (conflicts.length > 0) return formatDeliveryFeeConflictMessage(activity, conflicts)
  return null
}

export function matchesFilters(activity: DeliveryFeeActivityForm, filters: DeliveryFeeListFilters): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (filters.ruleMode !== 'all' && activity.ruleMode !== filters.ruleMode) return false
  if (!matchesActivityProductFilters(resolveActivityProducts(activity), filters)) return false
  if (filters.keyword) {
    const kw = filters.keyword.trim().toLowerCase()
    if (!activity.name.toLowerCase().includes(kw) && !activity.id.toLowerCase().includes(kw)) {
      return false
    }
  }
  if (filters.activityCode) {
    const code = filters.activityCode.toLowerCase()
    if (!(activity.activityCode || '').toLowerCase().includes(code)) return false
  }
  if (filters.startDate) {
    const actEnd = new Date(activity.endTime.replace(/-/g, '/'))
    if (actEnd < new Date(filters.startDate)) return false
  }
  if (filters.endDate) {
    const actStart = new Date(activity.startTime.replace(/-/g, '/'))
    if (actStart > new Date(`${filters.endDate} 23:59:59`)) return false
  }
  return true
}

export function countActivitiesByStatus(
  activities: DeliveryFeeActivityForm[],
  filters: DeliveryFeeListFilters,
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

export function formatCreatorDisplay(activity: DeliveryFeeActivityForm) {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

export function getStoreSummary(activity: DeliveryFeeActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  if (activity.storeScope === 'partial_exclude') return `排除 ${activity.storeIds.length} 家`
  return `指定 ${activity.storeIds.length} 家`
}

export function getProductSummary(activity: DeliveryFeeActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  return `指定 ${activity.productIds.length} 个商品`
}

export function getRuleModeLabel(mode: DeliveryFeeActivityForm['ruleMode']): string {
  return mode === 'by_city' ? '指定城市' : '全国'
}

export function getParticipantUserLabel(activity: DeliveryFeeActivityForm): string {
  if (activity.offerMode === 'by_member_level') {
    return getMemberLevelOffers(activity).map(({ label }) => label).join('、') || '尚未选择等级'
  }
  return PARTICIPANT_USER_OPTIONS.find((o) => o.value === activity.participantUser)?.label ?? '-'
}

export function getChannelSummary(activity: DeliveryFeeActivityForm): string {
  const map: Record<string, string> = {
    h5: '手机网页',
    wechat: '微信',
    alipay: '支付宝',
    app: 'App',
    pos: 'POS',
    douyin: '抖音',
    third_party: '第三方外卖',
    other: '其他',
  }
  return activity.channels.map((c) => map[c] || c).join('、') || '-'
}

export function discountMethodLabel(m: DeliveryFeeDiscountMethod): string {
  return DISCOUNT_METHOD_LABELS[m]
}
