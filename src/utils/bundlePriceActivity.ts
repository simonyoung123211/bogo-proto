import type {
  ActivityOperationLog,
  ActivityStatus,
  BundlePriceActivityForm,
  BundlePriceListFilters,
  BundlePriceTier,
} from '../types'
import { MAX_BUNDLE_PRICE_TIERS, createEmptyBundlePriceActivity } from '../mockBundlePriceData'
import { PARTICIPANT_USER_OPTIONS, getCreatorProfile, products, stores } from '../mockData'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'

export { MAX_BUNDLE_PRICE_TIERS }

export function formatBundlePriceAmount(value: number): string {
  if (!Number.isFinite(value)) return '-'
  const cents = Math.round(value * 100) / 100
  return cents.toFixed(2).replace(/\.?0+$/, '')
}

export function formatTierLabel(tier: BundlePriceTier): string {
  return `满${tier.quantity}件一口价${formatBundlePriceAmount(tier.price)}元`
}

/**
 * 列表与预览用的规则摘要。
 * 单档直接展示「满3件一口价9.9元」；多档不超过 3 级时逐级列出，更多时展示级数与最高阶。
 */
export function formatRuleSummary(activity: BundlePriceActivityForm): string {
  const tiers = activity.tiers ?? []
  if (tiers.length === 0) return '未配置规则'
  if (tiers.length === 1) return formatTierLabel(tiers[0])
  if (tiers.length <= 3) return tiers.map(formatTierLabel).join('；')
  const highest = tiers[tiers.length - 1]
  return `${tiers.length}级阶梯，最高${formatTierLabel(highest)}`
}

export function formatHitRuleLabel(): string {
  return '阶梯就高'
}

export function formatCountScopeLabel(): string {
  return '任意活动商品合计'
}

export function computePublishStatus(activity: BundlePriceActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function getProductSummary(activity: BundlePriceActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  const count = activity.productIds.length
  return count > 0 ? `${count}个商品` : '未选择'
}

export function getStoreSummary(activity: BundlePriceActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  const count = activity.storeIds.length
  if (count === 0) return '未选择门店'
  if (activity.storeScope === 'partial_exclude') return `${count}个门店不参与`
  return `${count}个门店参与`
}

export function getStoreScopeLabel(activity: BundlePriceActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  if (activity.storeScope === 'partial_exclude') return `指定门店不参与（${activity.storeIds.length}家）`
  return `指定门店参与（${activity.storeIds.length}家）`
}

export function getProductScopeLabel(activity: BundlePriceActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  const mode = activity.productSelectionMode === 'exclude' ? '反选' : '正选'
  return `指定商品 · ${mode}（${activity.productIds.length}个）`
}

export function getChannelSummary(activity: BundlePriceActivityForm): string {
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

export function getActivityProducts(activity: BundlePriceActivityForm) {
  return products.filter((p) => activity.productIds.includes(p.id))
}

export function getActivityStores(activity: BundlePriceActivityForm) {
  return stores.filter((s) => activity.storeIds.includes(s.id))
}

export function getParticipantUserLabel(activity: BundlePriceActivityForm): string {
  return PARTICIPANT_USER_OPTIONS.find((o) => o.value === activity.participantUser)?.label ?? '-'
}

export function formatCreatorDisplay(activity: BundlePriceActivityForm) {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

export function getActivityRemainingLabel(activity: BundlePriceActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function appendActivityLog(
  activity: BundlePriceActivityForm,
  action: string,
  detail?: string,
  operator?: { phone: string; org: string },
): BundlePriceActivityForm {
  const op = operator ?? { phone: activity.creatorPhone, org: activity.creatorOrg }
  const now = formatActivityDateTime()
  const log = createOperationLog(action, op, detail, now)
  return {
    ...activity,
    updatedAt: now,
    operationLogs: [log, ...(activity.operationLogs ?? [])],
  }
}

export function cloneActivity(activity: BundlePriceActivityForm): BundlePriceActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `YKJ${Date.now()}`,
    name: `${activity.name}(副本)`,
    status: 'draft',
    pausedAt: undefined,
    createdAt: now,
    updatedAt: now,
    tiers: activity.tiers.map((tier, index) => ({ ...tier, id: `tier-${Date.now()}-${index}` })),
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`),
    ],
  }
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1
}

export function validateTiers(tiers: BundlePriceTier[]): string | null {
  if (!tiers.length) return '请至少配置一级打包价'
  if (tiers.length > MAX_BUNDLE_PRICE_TIERS) return `最多设置${MAX_BUNDLE_PRICE_TIERS}级阶梯`
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]
    const label = `第${i + 1}级`
    if (!isPositiveInteger(tier.quantity)) return `${label}件数须为大于 0 的整数`
    if (!Number.isFinite(tier.price) || tier.price <= 0) return `${label}一口价金额须大于 0`
    if (i > 0) {
      const prev = tiers[i - 1]
      if (tier.quantity <= prev.quantity) return `${label}件数须大于上一级`
      if (Math.round(tier.price * 100) <= Math.round(prev.price * 100)) {
        return `${label}一口价金额须高于上一级`
      }
    }
  }
  return null
}

function validateLimitFields(activity: BundlePriceActivityForm): string | null {
  if (activity.maxBundleGroupsPerOrderType === 'limited' && activity.maxBundleGroupsPerOrder < 1) {
    return '每单最多享受的打包组数须大于 0'
  }
  if (activity.totalParticipationLimitType === 'limited' && activity.totalParticipationLimit < 1) {
    return '每人参与活动总次数须大于 0'
  }
  if (activity.participationFrequencyType === 'limited' && activity.participationFrequencyLimit < 1) {
    return '每人参与活动频次须大于 0'
  }
  if (activity.priority < 1) return '活动权重须大于 0'
  return null
}

export function validateStep(activity: BundlePriceActivityForm, step: number): string | null {
  if (step === 0) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (activity.name.length > 30) return '活动名称不超过 30 字'
    if (activity.title.length > 20) return '活动标题不超过 20 字'
    if (activity.description.length > 500) return '活动说明不超过 500 字'
    if (activity.activityCode.length > 30) return '活动编码不超过 30 字'
    if (!activity.startTime || !activity.endTime) return '请填写活动时间'
    if (new Date(activity.endTime) <= new Date(activity.startTime)) return '结束时间须晚于开始时间'
    if (activity.channels.length === 0) return '请至少选择一个参与渠道'
    if (activity.orderTypes.length === 0) return '请至少选择一个业务场景'
    const tierErr = validateTiers(activity.tiers)
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
  activity: BundlePriceActivityForm,
  filters: BundlePriceListFilters,
): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
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
    if (actStart > new Date(`${filters.endDate} 23:59:59`)) return false
  }
  if (filters.storeId && filters.storeId !== 'all') {
    if (activity.storeScope === 'all') return true
    if (!activity.storeIds.includes(filters.storeId)) return false
  }
  return true
}

function getActivityProductCandidates(activity: BundlePriceActivityForm) {
  return activity.productScope === 'all' ? products : getActivityProducts(activity)
}

function matchesProductName(activity: BundlePriceActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProductCandidates(activity).some((p) => p.name.toLowerCase().includes(kw))
}

function matchesProductId(activity: BundlePriceActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProductCandidates(activity).some((p) =>
    p.id.toLowerCase().includes(kw) || p.skuId.toLowerCase().includes(kw),
  )
}

export function countActivitiesByStatus(
  activities: BundlePriceActivityForm[],
  filters: BundlePriceListFilters,
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
  for (const a of base) {
    counts[a.status] += 1
  }
  return counts
}

export function migrateBundlePriceActivity(raw: Record<string, unknown>): BundlePriceActivityForm {
  const defaults = createEmptyBundlePriceActivity()
  const legacy = raw as Partial<BundlePriceActivityForm>
  const tiers = Array.isArray(legacy.tiers) && legacy.tiers.length > 0
    ? legacy.tiers.map((tier, index) => ({
        id: tier.id || `tier-${index}`,
        quantity: Number(tier.quantity) || 1,
        price: Number(tier.price) || 0,
      }))
    : defaults.tiers
  return {
    ...defaults,
    ...legacy,
    tiers,
    channels: legacy.channels?.length ? legacy.channels : defaults.channels,
    orderTypes: legacy.orderTypes?.length ? legacy.orderTypes : defaults.orderTypes,
    productIds: legacy.productIds ?? defaults.productIds,
    storeIds: legacy.storeIds ?? defaults.storeIds,
    creatorPhone: legacy.creatorPhone ?? getCreatorProfile(legacy.creator ?? defaults.creator).phone,
    creatorOrg: legacy.creatorOrg ?? getCreatorProfile(legacy.creator ?? defaults.creator).org,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
    operationLogs: (legacy.operationLogs as ActivityOperationLog[] | undefined)?.length
      ? legacy.operationLogs as ActivityOperationLog[]
      : defaults.operationLogs,
  }
}
