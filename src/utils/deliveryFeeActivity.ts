import type {
  ActivityOperationLog,
  ActivityStatus,
  DeliveryFeeActivityForm,
  DeliveryFeeDiscountMethod,
  DeliveryFeeListFilters,
  DeliveryFeeThresholdType,
  DeliveryFeeTier,
} from '../types'
import {
  CITY_NAME_MAP,
  DELIVERY_FEE_EXPRESS_TYPE_ID,
  DELIVERY_FEE_TAKEAWAY_TYPE_IDS,
  DISCOUNT_METHOD_LABELS,
  THRESHOLD_TYPE_LABELS,
  createDefaultTiers,
  createEmptyDeliveryFeeActivity,
} from '../mockDeliveryFeeData'
import { PARTICIPANT_USER_OPTIONS, getCreatorProfile, stores } from '../mockData'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'

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
  const thrLabel = getThresholdTypeLabel(activity.thresholdType)
  const tierText = activity.tiers.map((t) => formatTierLine(t, activity.thresholdType)).join('；')
  if (activity.ruleMode === 'national') {
    return `全国·${thrLabel}：${tierText}`
  }
  const cityCount = activity.cityIds.length
  return `指定城市·${thrLabel}：${cityCount} 个城市；${tierText || '未配阶梯'}；未命中不减免`
}

export function getCityNames(cityIds: string[]): string {
  return cityIds.map((id) => CITY_NAME_MAP[id] ?? id).join('、')
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

/** 兼容旧版多规则组 / 默认兜底 / nationalTiers 字段 */
export function migrateDeliveryFeeActivity(raw: Record<string, unknown>): DeliveryFeeActivityForm {
  const base = createEmptyDeliveryFeeActivity()
  const merged = { ...base, ...raw } as DeliveryFeeActivityForm & {
    nationalTiers?: DeliveryFeeTier[]
    defaultTiers?: DeliveryFeeTier[]
    defaultRuleEnabled?: boolean
    cityRuleGroups?: { id: string; name: string; cityIds: string[]; tiers: DeliveryFeeTier[] }[]
  }

  if (!merged.thresholdType) merged.thresholdType = 'amount'
  if (typeof merged.includeToppings !== 'boolean') merged.includeToppings = false
  if (typeof merged.includePackagingFee !== 'boolean') merged.includePackagingFee = false
  if (typeof merged.includePreparationSurcharge !== 'boolean') merged.includePreparationSurcharge = false

  const legacyGroups = Array.isArray(merged.cityRuleGroups) ? merged.cityRuleGroups : []
  const hasLegacyGroups = legacyGroups.length > 0
  const hasLegacyNational = Array.isArray(merged.nationalTiers) && merged.nationalTiers.length > 0

  if (!Array.isArray(merged.tiers) || merged.tiers.length === 0) {
    if (merged.ruleMode === 'by_city' && hasLegacyGroups) {
      merged.tiers = legacyGroups[0]?.tiers?.length ? legacyGroups[0].tiers : createDefaultTiers()
    } else if (hasLegacyNational) {
      merged.tiers = merged.nationalTiers!
    } else {
      merged.tiers = createDefaultTiers()
    }
  }

  if (!Array.isArray(merged.cityIds) || merged.cityIds.length === 0) {
    if (hasLegacyGroups) {
      const seen = new Set<string>()
      const ids: string[] = []
      for (const g of legacyGroups) {
        for (const id of g.cityIds ?? []) {
          if (!seen.has(id)) {
            seen.add(id)
            ids.push(id)
          }
        }
      }
      merged.cityIds = ids
    } else {
      merged.cityIds = []
    }
  }

  delete (merged as { nationalTiers?: unknown }).nationalTiers
  delete (merged as { defaultTiers?: unknown }).defaultTiers
  delete (merged as { defaultRuleEnabled?: unknown }).defaultRuleEnabled
  delete (merged as { cityRuleGroups?: unknown }).cityRuleGroups

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
      if (activity.cityIds.length === 0) return '请选择适用城市'
      const err = validateTiers(activity.tiers, '城市规则组', activity.thresholdType)
      if (err) return err
    } else {
      const err = validateTiers(activity.tiers, '优惠阶梯', activity.thresholdType)
      if (err) return err
    }
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

/**
 * 快递命中方式上的地区是否冲突：
 * - 双方均为不限城市 → 冲突（业务重叠时）
 * - 一方不限城市 + 一方指定城市 → 冲突（不限城市覆盖全部城市）
 * - 双方均为指定收货城市 → 仅当适用城市有交集时冲突
 */
function regionScopeConflicts(a: DeliveryFeeActivityForm, b: DeliveryFeeActivityForm): {
  conflict: boolean
  cityOverlap: string[]
} {
  if (a.ruleMode === 'national' && b.ruleMode === 'national') {
    return { conflict: true, cityOverlap: [] }
  }
  if (a.ruleMode === 'national' || b.ruleMode === 'national') {
    return { conflict: true, cityOverlap: [] }
  }
  const setB = new Set(b.cityIds)
  const cityOverlap = a.cityIds.filter((id) => setB.has(id))
  return { conflict: cityOverlap.length > 0, cityOverlap }
}

export interface DeliveryFeeConflict {
  activity: DeliveryFeeActivityForm
  storeCount: number
  orderTypeIds: string[]
  cityOverlap: string[]
  regionReason: 'both_national' | 'national_vs_city' | 'city_overlap'
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

    const orderTypeIds = target.orderTypes.filter((id) => other.orderTypes.includes(id))
    if (orderTypeIds.length === 0) continue

    const storeHits = resolveStoreIds(other).filter((id) => targetStores.has(id))
    if (storeHits.length === 0) continue

    const region = regionScopeConflicts(target, other)
    if (!region.conflict) continue

    let regionReason: DeliveryFeeConflict['regionReason'] = 'city_overlap'
    if (target.ruleMode === 'national' && other.ruleMode === 'national') regionReason = 'both_national'
    else if (target.ruleMode === 'national' || other.ruleMode === 'national') regionReason = 'national_vs_city'

    conflicts.push({
      activity: other,
      storeCount: storeHits.length,
      orderTypeIds,
      cityOverlap: region.cityOverlap,
      regionReason,
    })
  }
  return conflicts
}

export function formatDeliveryFeeConflictMessage(conflicts: DeliveryFeeConflict[]): string {
  const first = conflicts[0]
  const more = conflicts.length > 1 ? `（另有 ${conflicts.length - 1} 个活动同样冲突）` : ''
  const other = first.activity
  const otherScope = other.ruleMode === 'by_city' ? '指定城市' : '全国'
  const selfHint =
    first.regionReason === 'both_national'
      ? '双方收货城市均为全国'
      : first.regionReason === 'national_vs_city'
        ? '在门店快递上：全国与指定城市覆盖范围重叠'
        : `门店快递适用城市重叠（${getCityNames(first.cityOverlap.slice(0, 5))}${first.cityOverlap.length > 5 ? '等' : ''}）`
  return `与活动「${other.id} · ${other.name}」（收货城市·${otherScope}）冲突：活动时间、门店与参与业务重叠，且${selfHint}。外卖不受该冲突影响。不可同时生效${more}`
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
  if (conflicts.length > 0) return formatDeliveryFeeConflictMessage(conflicts)
  return null
}

export function matchesFilters(activity: DeliveryFeeActivityForm, filters: DeliveryFeeListFilters): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (filters.ruleMode !== 'all' && activity.ruleMode !== filters.ruleMode) return false
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

export function getActivityRemainingLabel(activity: DeliveryFeeActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function discountMethodLabel(m: DeliveryFeeDiscountMethod): string {
  return DISCOUNT_METHOD_LABELS[m]
}
