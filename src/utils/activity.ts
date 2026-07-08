import type { ActivityForm, ActivityOperationLog, ActivityStatus, CouponGiftConfig, GiftGroup, ListFilters } from '../types'
import { PARTICIPANT_USER_OPTIONS, createEmptyActivity, createEmptyCouponGift, createEmptyGiftGroup, DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE, DEFAULT_STORAGE_COUPON_DISPLAY_TITLE, getCreatorProfile, products, stores } from '../mockData'

export function getParticipantUserLabel(activity: ActivityForm): string {
  return PARTICIPANT_USER_OPTIONS.find((o) => o.value === activity.participantUser)?.label ?? '-'
}

export function computePublishStatus(activity: ActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function getProductSummary(activity: ActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  const count = activity.productIds.length
  return count > 0 ? `${count}个商品` : '未选择'
}

export function getStoreSummary(activity: ActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  const count = activity.storeIds.length
  if (count === 0) return '未选择门店'
  if (activity.storeScope === 'partial_exclude') return `${count}个门店不参与`
  return `${count}个门店参与`
}

export function getStoreScopeLabel(activity: ActivityForm): string {
  if (activity.storeScope === 'all') return '全部门店'
  if (activity.storeScope === 'partial_exclude') return `指定门店不参与（${activity.storeIds.length}家）`
  return `指定门店参与（${activity.storeIds.length}家）`
}

export function getProductScopeLabel(activity: ActivityForm): string {
  if (activity.productScope === 'all') return '全部商品'
  return `指定商品（${activity.productIds.length}个）`
}

export function getChannelSummary(activity: ActivityForm): string {
  const map: Record<string, string> = {
    wechat: '微信',
    alipay: '支付宝',
    douyin: '抖音',
    other: '其他',
  }
  return activity.channels.map((c) => map[c] || c).join('、') || '-'
}

export function getActivityProducts(activity: ActivityForm) {
  return products.filter((p) => activity.productIds.includes(p.id))
}

function getActivityProductCandidates(activity: ActivityForm) {
  return activity.productScope === 'all' ? products : getActivityProducts(activity)
}

function matchesProductName(activity: ActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProductCandidates(activity).some((p) => p.name.toLowerCase().includes(kw))
}

function matchesProductId(activity: ActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProductCandidates(activity).some((p) =>
    p.id.toLowerCase().includes(kw) || p.skuId.toLowerCase().includes(kw),
  )
}

export function getActivityGiftProducts(activity: ActivityForm) {
  const ids = activity.giftGroups.flatMap((g) => g.physicalProductIds)
  return products.filter((p) => ids.includes(p.id))
}

export function getGiftGroupsSummary(activity: ActivityForm): string {
  if (activity.giftGroups.length === 0) return '未配置'
  return `${activity.giftGroups.length}组赠品`
}

/** 买A送B：每单可优惠件数下限与赠品组数量一致；买A送A：下限为 1 */
export function getMinMaxDiscountItemsPerOrder(activity: ActivityForm): number {
  if (activity.ruleType === 'buyA_getB') {
    return Math.max(1, activity.giftGroups.length)
  }
  return 1
}

export function withClampedMaxDiscountItemsPerOrder(activity: ActivityForm): ActivityForm {
  if (activity.maxDiscountItemsPerOrderType !== 'limited') return activity
  const min = getMinMaxDiscountItemsPerOrder(activity)
  if (activity.maxDiscountItemsPerOrder >= min) return activity
  return { ...activity, maxDiscountItemsPerOrder: min }
}

/** 预览页顶部摘要标签 */
export function buildActivityPreviewTags(activity: ActivityForm): string[] {
  const tags: string[] = []
  tags.push(activity.ruleType === 'buyA_getA' ? '买A送A' : `买A送B · ${getGiftGroupsSummary(activity)}`)

  const storageOn = activity.ruleType === 'buyA_getA'
    ? activity.buyAStorageGift.storageEnabled
    : activity.giftGroups.some((g) => g.couponGift.storageEnabled)
  tags.push(storageOn ? '已开启赠品寄存' : '未开启赠品寄存')

  tags.push(getProductSummary(activity))
  tags.push(getStoreSummary(activity))
  tags.push(getChannelSummary(activity))

  return tags
}

function validateGiftGroups(groups: GiftGroup[]): string | null {
  if (groups.length === 0) return '买A送B模式下请至少添加一个赠品组'
  if (groups.length > 2) return '赠品组最多可配置2组'

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    const hasPhysical = g.physicalProductIds.length > 0
    const hasCoupon = g.couponGift.storageEnabled && g.couponGift.couponTemplate

    if (!hasPhysical && !hasCoupon) {
      return `赠品组${i + 1}请配置实物赠品或寄存券赠品`
    }
    if (g.physicalProductIds.length > 50) {
      return `赠品组${i + 1}实物赠品最多可添加50个SKU`
    }
    if (g.couponGift.storageEnabled) {
      if (!g.couponGift.couponTemplate) {
        return `赠品组${i + 1}开启寄存后请选择优惠券模版`
      }
    }
  }
  return null
}

export function getActivityStores(activity: ActivityForm) {
  return stores.filter((s) => activity.storeIds.includes(s.id))
}

export function formatActivityDateTime(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function createOperationLog(
  action: string,
  operator: { phone: string; org: string },
  detail?: string,
  operatedAt?: string,
): ActivityOperationLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    operatorPhone: operator.phone,
    operatorOrg: operator.org,
    operatedAt: operatedAt ?? formatActivityDateTime(),
    detail,
  }
}

export function appendActivityLog(
  activity: ActivityForm,
  action: string,
  detail?: string,
  operator?: { phone: string; org: string },
): ActivityForm {
  const op = operator ?? { phone: activity.creatorPhone, org: activity.creatorOrg }
  const now = formatActivityDateTime()
  const log = createOperationLog(action, op, detail, now)
  return {
    ...activity,
    updatedAt: now,
    operationLogs: [log, ...(activity.operationLogs ?? [])],
  }
}

export function buildDefaultOperationLogs(activity: ActivityForm): ActivityOperationLog[] {
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  const name = activity.name || '未命名活动'
  const logs: ActivityOperationLog[] = [
    createOperationLog('创建活动', operator, `创建活动「${name}」`, activity.createdAt),
  ]

  if (['pending', 'not_started', 'in_progress', 'ended', 'voided'].includes(activity.status)) {
    logs.unshift(createOperationLog('发布活动', operator, `发布活动「${name}」`, activity.updatedAt ?? activity.createdAt))
  }
  if (activity.status === 'voided') {
    logs.unshift(createOperationLog('作废活动', operator, `作废活动「${name}」`, activity.updatedAt ?? activity.createdAt))
  }
  if (activity.status === 'draft' && (activity.updatedAt ?? activity.createdAt) !== activity.createdAt) {
    logs.unshift(createOperationLog('编辑活动', operator, `编辑活动「${name}」`, activity.updatedAt))
  }

  return logs
}

export function cloneActivity(activity: ActivityForm): ActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `ACT${Date.now()}`,
    name: `${activity.name}(副本)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`),
    ],
  }
}

function validateLimitFields(activity: ActivityForm): string | null {
  if (activity.totalParticipationLimitType === 'limited' && activity.totalParticipationLimit < 1) {
    return '用户参与活动总次数须大于0'
  }
  if (activity.participationFrequencyType === 'limited' && activity.participationFrequencyLimit < 1) {
    return '用户参与活动频次须大于0'
  }
  if (activity.maxDiscountItemsPerOrderType === 'limited') {
    const min = getMinMaxDiscountItemsPerOrder(activity)
    if (activity.maxDiscountItemsPerOrder < min) {
      return `每单可优惠商品件数不少于${min}件`
    }
  }
  return null
}

export function validateStep(activity: ActivityForm, step: number): string | null {
  if (step === 0) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (activity.name.length > 30) return '活动名称不超过30字'
    if (activity.title.length > 20) return '点单页展示标题不超过20字'
    if (activity.tag.length > 20) return '商品卡片展示标签不超过20字'
    if (activity.description.length > 500) return '活动说明不超过500字'
    if (activity.activityCode.length > 30) return '活动编码不超过30字'
    if (!activity.startTime || !activity.endTime) return '请填写活动时间'
    if (new Date(activity.endTime) <= new Date(activity.startTime)) return '结束时间须晚于开始时间'
    const limitErr = validateLimitFields(activity)
    if (limitErr) return limitErr
    if (activity.ruleType === 'buyA_getA') {
      if (activity.buyAStorageGift.storageEnabled) {
        if (!activity.buyAStorageGift.couponTemplate) {
          return '开启寄存后请选择优惠券模版'
        }
        if (activity.maxStorageCouponsPerOrder < 1 || activity.maxStorageCouponsPerOrder > 50) {
          return '每单最多可寄存赠品件数须在1-50之间'
        }
      }
    }
    if (activity.ruleType === 'buyA_getB') {
      const giftErr = validateGiftGroups(activity.giftGroups)
      if (giftErr) return giftErr
      const hasStorage = activity.giftGroups.some((g) => g.couponGift.storageEnabled)
      if (hasStorage) {
        if (activity.maxStorageCouponsPerOrder < 1 || activity.maxStorageCouponsPerOrder > 50) {
          return '每单最多可发放的寄存券数量须在1-50之间'
        }
      }
    }
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

export function matchesFilters(activity: ActivityForm, filters: ListFilters): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (filters.ruleType !== 'all' && activity.ruleType !== filters.ruleType) return false
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

export function getRuleTypeLabel(ruleType: ActivityForm['ruleType']): string {
  return ruleType === 'buyA_getA' ? '买A送A' : '买A送B'
}

/** 手机号脱敏：13812345678 → 138****5678 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return phone
  if (digits.length === 11) return `${digits.slice(0, 3)}****${digits.slice(-4)}`
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`
}

export function formatCreatorDisplay(activity: ActivityForm): { maskedPhone: string; org: string } {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

/** 进行中活动的剩余天数文案，非进行中返回 null */
export function getActivityRemainingLabel(activity: ActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function countActivitiesByStatus(
  activities: ActivityForm[],
  filters: ListFilters,
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

/** 兼容旧版 localStorage 数据结构 */
export function migrateActivity(raw: Record<string, unknown>): ActivityForm {
  const defaults = createEmptyActivity()
  const legacy = raw as Partial<ActivityForm> & {
    buyQuantity?: number
    maxDiscountPerOrder?: number
    giftProductIds?: string[]
    giftGroups?: Array<{ couponGift?: { maxStoragePerOrder?: number } }>
    audience?: string
  }

  let giftGroups = legacy.giftGroups as ActivityForm['giftGroups'] | undefined
  if (!giftGroups?.length && legacy.giftProductIds?.length) {
    giftGroups = [{
      ...createEmptyGiftGroup(),
      physicalProductIds: legacy.giftProductIds,
    }]
  }

  const legacyMaxStorage = giftGroups?.reduce((max, g) => {
    const n = (g.couponGift as { maxStoragePerOrder?: number })?.maxStoragePerOrder
    return n != null ? Math.max(max, n) : max
  }, 0)

  let legacyCouponDesc = ''
  if (giftGroups?.length) {
    giftGroups = giftGroups.map((g) => {
      const cg = g.couponGift as CouponGiftConfig & {
        maxStoragePerOrder?: number
        couponDescription?: string
      }
      if (!legacyCouponDesc && cg.couponDescription) {
        legacyCouponDesc = cg.couponDescription
      }
      const { maxStoragePerOrder: _, couponDescription: __, ...couponGift } = cg
      return {
        ...g,
        physicalDisplayTitle: g.physicalDisplayTitle ?? DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE,
        couponGift: {
          ...createEmptyCouponGift(),
          ...couponGift,
          storageDisplayRule: couponGift.storageDisplayRule ?? 'with_physical',
          displayTitle: couponGift.displayTitle ?? DEFAULT_STORAGE_COUPON_DISPLAY_TITLE,
        },
      }
    })
  }

  return {
    ...defaults,
    ...legacy,
    giftGroups: giftGroups ?? [],
    buyAStorageGift: {
      ...createEmptyCouponGift(),
      ...(legacy.buyAStorageGift as CouponGiftConfig | undefined),
    },
    maxStorageCouponsPerOrder: legacy.maxStorageCouponsPerOrder ?? (legacyMaxStorage || defaults.maxStorageCouponsPerOrder),
    storageCouponDescription: legacy.storageCouponDescription ?? legacyCouponDesc ?? defaults.storageCouponDescription,
    title: legacy.title ?? '',
    shareMutexRelation: legacy.shareMutexRelation ?? defaults.shareMutexRelation,
    participantUser: legacy.participantUser ?? (
      legacy.audience === '所有会员' ? 'registered_member' : defaults.participantUser
    ),
    memberTagId: legacy.memberTagId ?? defaults.memberTagId,
    activityCode: legacy.activityCode ?? defaults.activityCode,
    titleDisplay: legacy.titleDisplay ?? defaults.titleDisplay,
    tagDisplay: legacy.tagDisplay ?? defaults.tagDisplay,
    toppingsDiscount: legacy.toppingsDiscount ?? defaults.toppingsDiscount,
    preparationSurchargeDiscount: legacy.preparationSurchargeDiscount ?? defaults.preparationSurchargeDiscount,
    totalParticipationLimitType: legacy.totalParticipationLimitType ?? 'limited',
    totalParticipationLimit: legacy.totalParticipationLimit ?? legacy.buyQuantity ?? 1,
    participationFrequencyType: legacy.participationFrequencyType ?? 'limited',
    participationFrequencyPeriod: legacy.participationFrequencyPeriod ?? 'daily',
    participationFrequencyLimit: legacy.participationFrequencyLimit ?? 1,
    maxDiscountItemsPerOrderType: legacy.maxDiscountItemsPerOrderType ?? 'limited',
    maxDiscountItemsPerOrder: legacy.maxDiscountItemsPerOrder ?? legacy.maxDiscountPerOrder ?? 1,
    discountHitRule: legacy.discountHitRule ?? 'lowest_price',
    creatorPhone: legacy.creatorPhone ?? getCreatorProfile(legacy.creator ?? defaults.creator).phone,
    creatorOrg: legacy.creatorOrg ?? getCreatorProfile(legacy.creator ?? defaults.creator).org,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
    operationLogs: legacy.operationLogs?.length
      ? legacy.operationLogs
      : buildDefaultOperationLogs({
          ...defaults,
          ...legacy,
          creatorPhone: legacy.creatorPhone ?? getCreatorProfile(legacy.creator ?? defaults.creator).phone,
          creatorOrg: legacy.creatorOrg ?? getCreatorProfile(legacy.creator ?? defaults.creator).org,
          createdAt: legacy.createdAt ?? defaults.createdAt,
          updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
        } as ActivityForm),
  }
}
