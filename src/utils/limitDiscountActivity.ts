import type {
  ActivityStatus,
  LimitDiscountActivityForm,
  LimitDiscountListFilters,
  LimitDiscountMethod,
  LimitDiscountProductItem,
  LimitDiscountValueMode,
  Product,
} from '../types'
import {
  LIMIT_DISCOUNT_CHANNELS,
  LIMIT_DISCOUNT_PARTICIPANTS,
  LIMIT_DISCOUNT_SCENES,
  LIMIT_DISCOUNT_STORE_TAGS,
  createEmptyLimitDiscountActivity,
} from '../mockLimitDiscountData'
import { MEMBER_TAG_OPTIONS, getCreatorProfile, products } from '../mockData'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'
import { matchesActivityProductFilters, resolveActivityProducts } from './activityProductSearch'
import { discountAreaRows } from './limitDiscountScope'

const CHANNEL_IDS = new Set<string>(LIMIT_DISCOUNT_CHANNELS.map((item) => item.id))
const SCENE_IDS = new Set<string>(LIMIT_DISCOUNT_SCENES.map((item) => item.id))

export function discountMethodLabel(method: LimitDiscountMethod): string {
  if (method === 'reduce') return '减价'
  if (method === 'special_price') return '指定价格'
  return '折扣'
}

export function discountValueLabel(method: LimitDiscountMethod): string {
  if (method === 'reduce') return '减价金额'
  if (method === 'special_price') return '特价'
  return '折扣'
}

export function discountUnit(method: LimitDiscountMethod): string {
  return method === 'discount' ? '折' : '元'
}

export function defaultDiscountValue(method: LimitDiscountMethod, salePrice?: number): number {
  if (method === 'discount') return 9.9
  if (method === 'special_price') return salePrice && salePrice > 0 ? salePrice : 0.1
  return 0.1
}

export function sceneLabel(sceneId: string): string {
  return LIMIT_DISCOUNT_SCENES.find((item) => item.id === sceneId)?.label ?? sceneId
}

/** 商品在已选业务里单独设置过的力度；没有出现的业务按该商品的默认力度 */
export function sceneOverrides(
  activity: LimitDiscountActivityForm,
  item: LimitDiscountProductItem,
): { sceneId: string; value: number }[] {
  return activity.orderTypes.flatMap((sceneId) => {
    const value = item.sceneDiscountValues[sceneId]
    return value == null || Number.isNaN(value) || value === item.discountValue ? [] : [{ sceneId, value }]
  })
}

/** 单独设置的力度与默认力度相同，等于没有单独设置 */
export function isSameAsDefault(item: LimitDiscountProductItem, sceneId: string): boolean {
  const value = item.sceneDiscountValues[sceneId]
  return value != null && value === item.discountValue
}

export function pruneSameAsDefault(item: LimitDiscountProductItem): LimitDiscountProductItem {
  const entries = Object.entries(item.sceneDiscountValues)
  if (!entries.some(([, value]) => value != null && value === item.discountValue)) return item
  return {
    ...item,
    sceneDiscountValues: Object.fromEntries(entries.filter(([, value]) => value == null || value !== item.discountValue)),
  }
}

export function hasSceneOverride(activity: LimitDiscountActivityForm, item: LimitDiscountProductItem): boolean {
  return sceneOverrides(activity, item).length > 0
}

/** 顾客下单时该商品在某业务下实际生效的力度 */
export function itemSceneValue(item: LimitDiscountProductItem, sceneId: string | undefined): number | null {
  const override = sceneId ? item.sceneDiscountValues[sceneId] : undefined
  return override ?? item.discountValue
}

/** 全部商品、指定商品不参与时，活动级的默认力度和业务例外 */
export function sharedDiscountItem(activity: LimitDiscountActivityForm): LimitDiscountProductItem {
  return {
    productId: '',
    discountValue: activity.discountValue,
    sceneDiscountValues: activity.sceneDiscountValues ?? {},
    stock: null,
  }
}

export function writeSharedDiscount(
  activity: LimitDiscountActivityForm,
  patch: Partial<Pick<LimitDiscountProductItem, 'discountValue' | 'sceneDiscountValues'>>,
  prune = false,
): LimitDiscountActivityForm {
  const merged: LimitDiscountProductItem = {
    ...sharedDiscountItem(activity),
    ...patch,
    sceneDiscountValues: patch.sceneDiscountValues ?? activity.sceneDiscountValues ?? {},
  }
  const next = prune ? pruneSameAsDefault(merged) : merged
  return { ...activity, discountValue: next.discountValue, sceneDiscountValues: next.sceneDiscountValues }
}

export function setSceneOverride(
  item: LimitDiscountProductItem,
  sceneId: string,
  value: number | null,
): LimitDiscountProductItem {
  const sceneDiscountValues = { ...item.sceneDiscountValues }
  if (value == null) delete sceneDiscountValues[sceneId]
  else sceneDiscountValues[sceneId] = value
  return { ...item, sceneDiscountValues }
}

export function applyDiscountMethod(
  activity: LimitDiscountActivityForm,
  method: LimitDiscountMethod,
): LimitDiscountActivityForm {
  const activityValue = method === 'discount' ? 9.9 : 0.1
  return {
    ...activity,
    discountMethod: method,
    discountValue: activityValue,
    sceneDiscountValues: {},
    productItems: activity.productItems.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      const discountValue = method === 'discount'
        ? 9.9
        : method === 'special_price'
          ? product?.price ?? null
          : null
      return { ...item, discountValue, sceneDiscountValues: {} }
    }),
  }
}

export function syncProductItems(
  activity: LimitDiscountActivityForm,
  productIds: string[],
): LimitDiscountActivityForm {
  const prev = new Map(activity.productItems.map((item) => [item.productId, item]))
  const productItems: LimitDiscountProductItem[] = productIds.map((productId) => {
    const existing = prev.get(productId)
    if (existing) return existing
    const product = products.find((p) => p.id === productId)
    const discountValue = activity.discountMethod === 'reduce'
      ? null
      : defaultDiscountValue(activity.discountMethod, product?.price)
    return {
      productId,
      discountValue,
      stock: null,
      sceneDiscountValues: {},
    }
  })
  return { ...activity, productItems }
}

export function formatDiscountValue(method: LimitDiscountMethod, value: number | null): string {
  if (value == null || Number.isNaN(value)) return '未设置'
  if (method === 'discount') return `${trimNumber(value)}折`
  if (method === 'reduce') return `减${trimNumber(value)}元`
  return `特价${trimNumber(value)}元`
}

function trimNumber(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

export function goodsScopeLabel(activity: LimitDiscountActivityForm): string {
  if (activity.goodsScope === 'include') return `指定商品 · ${activity.productItems.length}个`
  if (activity.goodsScope === 'exclude') return `指定商品不参与 · ${activity.productItems.length}个`
  return '全部商品'
}

export function storeModeLabel(activity: LimitDiscountActivityForm): string {
  if (activity.storeMode === 'include') return `指定门店参与 · ${activity.storeIds.length}家`
  if (activity.storeMode === 'exclude') return `指定门店不参与 · ${activity.storeIds.length}家`
  if (activity.storeMode === 'tag_include') return `指定门店标签参与 · ${activity.storeTagIds.length}个`
  if (activity.storeMode === 'tag_exclude') return `指定门店标签不参与 · ${activity.storeTagIds.length}个`
  return '全部门店'
}

export function channelSummary(activity: LimitDiscountActivityForm): string {
  return activity.channels
    .map((id) => LIMIT_DISCOUNT_CHANNELS.find((item) => item.id === id)?.label ?? id)
    .join('、') || '-'
}

export function sceneSummary(activity: LimitDiscountActivityForm): string {
  return activity.orderTypes
    .map((id) => LIMIT_DISCOUNT_SCENES.find((item) => item.id === id)?.label ?? id)
    .join('、') || '-'
}

export function participantLabel(activity: LimitDiscountActivityForm): string {
  return LIMIT_DISCOUNT_PARTICIPANTS.find((item) => item.value === activity.participantUser)?.label ?? '-'
}

export function isProductDiscountSet(_activity: LimitDiscountActivityForm, item: LimitDiscountProductItem): boolean {
  return item.discountValue != null
}

function sceneProductCount(activity: LimitDiscountActivityForm): number {
  return activity.productItems.filter((item) => hasSceneOverride(activity, item)).length
}

export function discountStrengthSummary(activity: LimitDiscountActivityForm): string {
  const method = discountMethodLabel(activity.discountMethod)
  if (activity.goodsScope === 'include') {
    const sceneCount = sceneProductCount(activity)
    if (sceneCount === 0) return `${method} · 按商品默认力度`
    return `${method} · 按商品默认力度，其中 ${sceneCount} 个商品有业务单独设置`
  }
  const base = formatDiscountValue(activity.discountMethod, activity.discountValue)
  const overrides = sceneOverrides(activity, sharedDiscountItem(activity))
  if (overrides.length === 0) return `${method} · ${base}`
  const listed = overrides
    .slice(0, 2)
    .map(({ sceneId, value }) => `${sceneLabel(sceneId)} ${formatDiscountValue(activity.discountMethod, value)}`)
    .join('、')
  const more = overrides.length > 2 ? ` 等 ${overrides.length} 个业务` : ''
  return `${method} · 默认${base}，${listed}${more}单独设置`
}

export function formatRuleSummary(activity: LimitDiscountActivityForm): string {
  if (activity.goodsScope === 'include') {
    const setCount = activity.productItems.filter((item) => isProductDiscountSet(activity, item)).length
    const sceneCount = sceneProductCount(activity)
    const sceneText = sceneCount > 0 ? ` · ${sceneCount}个有分业务` : ''
    return `${discountMethodLabel(activity.discountMethod)} · 已设 ${setCount}/${activity.productItems.length}${sceneText}`
  }
  const base = formatDiscountValue(activity.discountMethod, activity.discountValue)
  const count = sceneOverrides(activity, sharedDiscountItem(activity)).length
  const sceneText = count > 0 ? ` · ${count}个业务单独设置` : ''
  return `${discountMethodLabel(activity.discountMethod)} · ${base}${sceneText}`
}

export function getActivityRemainingLabel(activity: LimitDiscountActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function formatCreatorDisplay(activity: LimitDiscountActivityForm) {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

export function memberTagLabels(ids: string[]): string {
  if (ids.length === 0) return '未设置'
  return ids
    .map((id) => MEMBER_TAG_OPTIONS.find((item) => item.value === id)?.label ?? id)
    .join('、')
}

export function storeTagLabels(ids: string[]): string {
  return ids
    .map((id) => LIMIT_DISCOUNT_STORE_TAGS.find((item) => item.id === id)?.label ?? id)
    .join('、') || '未选择'
}

export function previewSceneHint(activity: LimitDiscountActivityForm): string | null {
  const sceneId = activity.orderTypes[0]
  if (!sceneId) return null
  if (activity.goodsScope === 'include') {
    if (sceneProductCount(activity) === 0) return null
    return `有分业务设置的商品，预览按${sceneLabel(sceneId)}`
  }
  if (sceneOverrides(activity, sharedDiscountItem(activity)).length === 0) return null
  return `有分业务设置时，预览按${sceneLabel(sceneId)}`
}

export function previewPrice(product: Product, activity: LimitDiscountActivityForm, item?: LimitDiscountProductItem): number {
  const sceneId = activity.orderTypes[0]
  const value = activity.goodsScope === 'include'
    ? (item ? itemSceneValue(item, sceneId) : null)
    : itemSceneValue(sharedDiscountItem(activity), sceneId)
  if (value == null) return product.price
  if (activity.discountMethod === 'discount') return Math.round(product.price * value * 10) / 100
  if (activity.discountMethod === 'reduce') return Math.max(0, Math.round((product.price - value) * 100) / 100)
  return value
}

export function computePublishStatus(activity: LimitDiscountActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function appendActivityLog(
  activity: LimitDiscountActivityForm,
  action: string,
  detail?: string,
  operator?: { phone: string; org: string },
): LimitDiscountActivityForm {
  const op = operator ?? { phone: activity.creatorPhone, org: activity.creatorOrg }
  const now = formatActivityDateTime()
  const log = createOperationLog(action, op, detail, now)
  return { ...activity, updatedAt: now, operationLogs: [log, ...(activity.operationLogs ?? [])] }
}

export function cloneActivity(activity: LimitDiscountActivityForm): LimitDiscountActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `XSZK${Date.now()}`,
    name: `${activity.name}(副本)`.slice(0, 30),
    status: 'draft',
    pausedAt: undefined,
    createdAt: now,
    updatedAt: now,
    productItems: activity.productItems.map((item) => ({ ...item })),
    timeSlots: activity.timeSlots.map((slot) => ({ ...slot, id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
    inactiveRanges: activity.inactiveRanges.map((slot) => ({ ...slot, id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
    operationLogs: [createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`)],
    areaIdsByStore: structuredClone(activity.areaIdsByStore ?? {}),
  }
}

function positiveInt(value: number): boolean {
  return Number.isInteger(value) && value >= 1
}

function validateDiscountNumber(method: LimitDiscountMethod, value: number | null, label: string): string | null {
  if (value == null || Number.isNaN(value)) return `请填写${label}`
  if (method === 'discount') {
    if (value < 0.1 || value > 9.9) return `${label}须在 0.1 到 9.9 之间`
    return null
  }
  if (value <= 0) return `${label}须大于 0`
  return null
}

function validateStock(stock: number | null, label: string): string | null {
  if (stock == null) return null
  if (!positiveInt(stock)) return `${label}须为大于 0 的整数，留空表示不限量`
  return null
}

export function validateStep(activity: LimitDiscountActivityForm, step: number): string | null {
  const errors = collectStepErrors(activity, step)
  return errors[0] ?? null
}

export function collectStepErrors(activity: LimitDiscountActivityForm, step: number): string[] {
  const errors: string[] = []
  if (step === 0) {
    if (activity.channels.length === 0) errors.push('请至少选择一个参与渠道')
    if (activity.orderTypes.length === 0) errors.push('请选择参与业务/场景')
    if (!activity.name.trim()) errors.push('请填写活动名称')
    if (activity.name.length > 30) errors.push('活动名称不超过30个文字或字母')
    if (activity.title.length > 20) errors.push('活动标题不超过20个文字或字母')
    if (activity.goodsLabel.length > 20) errors.push('商品促销标签不超过20个文字或字母')
    if (!activity.startTime || !activity.endTime) errors.push('请选择活动时间')
    else if (new Date(activity.endTime.replace(/-/g, '/')) <= new Date(activity.startTime.replace(/-/g, '/'))) {
      errors.push('结束时间须晚于开始时间')
    }
    if (activity.cycleType === 'weekly' && activity.weekDays.length === 0) errors.push('请选择每周活动周期')
    if (activity.cycleType === 'monthly' && activity.monthDays.length === 0) errors.push('请选择每月活动周期')
    if (activity.timeSlotType === 'specific') {
      const filled = activity.timeSlots.filter((slot) => slot.start && slot.end)
      if (filled.length === 0) errors.push('请添加活动时段')
      if (activity.timeSlots.length > 3) errors.push('活动时段最多 3 个')
      if (filled.some((slot) => slot.end <= slot.start)) errors.push('活动时段的结束时间须晚于开始时间')
    }
    if (activity.inactiveRanges.length > 10) errors.push('不生效时间段最多 10 个')
    if (activity.thresholdType === 'limited') {
      if (!(activity.thresholdAmount > 0)) errors.push('请填写消费金额门槛')
      if (activity.thresholdGoodsScope !== 'all' && activity.thresholdProductIds.length === 0) {
        errors.push(activity.thresholdGoodsScope === 'exclude' ? '请选择排除商品' : '请选择门槛商品')
      }
    }
    if (activity.totalTimesType === 'limited' && !positiveInt(activity.totalTimes)) errors.push('用户参与活动总次数须大于 0')
    if (activity.frequencyType === 'limited' && !positiveInt(activity.frequencyTimes)) errors.push('用户参与活动频次须大于 0')
    if (activity.limitTotalPieces && !positiveInt(activity.totalPieces)) errors.push('活动期间优惠件数须大于 0')
    if (activity.limitPeriodPieces && !positiveInt(activity.periodPieces)) errors.push('周期内优惠件数须大于 0')
    if (activity.limitOrderPieces && !positiveInt(activity.orderPieces)) errors.push('每单优惠件数须大于 0')
    if (activity.activityCode.length > 30) errors.push('活动编码不超过30个文字或字母')
    if (activity.description.length > 500) errors.push('活动说明不超过500个文字或字母')
    if (activity.searchKeyword.length > 20) errors.push('快捷检索名称不超过20个文字或字母')
  }
  if (step === 1) {
    if (activity.areaMode === 'specified' && discountAreaRows(activity).length === 0) {
      errors.push('请至少选择一家参与门店的一个点餐区域')
    }
    if ((activity.storeMode === 'include' || activity.storeMode === 'exclude') && activity.storeIds.length === 0) {
      errors.push('请选择门店')
    }
    if ((activity.storeMode === 'tag_include' || activity.storeMode === 'tag_exclude') && activity.storeTagIds.length === 0) {
      errors.push('请选择门店标签')
    }
  }
  if (step === 2) {
    const valueLabel = discountValueLabel(activity.discountMethod)
    const pushShared = (prefix: string) => {
      const err = validateDiscountNumber(activity.discountMethod, activity.discountValue, `${prefix}默认${valueLabel}`)
      if (err) errors.push(err)
      sceneOverrides(activity, sharedDiscountItem(activity)).forEach(({ sceneId, value }) => {
        const sceneErr = validateDiscountNumber(
          activity.discountMethod,
          value,
          `${prefix}在${sceneLabel(sceneId)}的${valueLabel}`,
        )
        if (sceneErr) errors.push(sceneErr)
      })
    }
    if (activity.goodsScope === 'all') {
      pushShared('')
      const stockErr = validateStock(activity.activityStock, '活动库存')
      if (stockErr) errors.push(stockErr)
    } else if (activity.productItems.length === 0) {
      errors.push('请选择商品')
    } else if (activity.goodsScope === 'exclude') {
      pushShared('余下商品')
      const stockErr = validateStock(activity.activityStock, '活动库存')
      if (stockErr) errors.push(stockErr)
    } else {
      activity.productItems.forEach((item) => {
        const product = products.find((p) => p.id === item.productId)
        const name = product?.name ?? '商品'
        const err = validateDiscountNumber(activity.discountMethod, item.discountValue, `${name}的默认${valueLabel}`)
        if (err) errors.push(err)
        sceneOverrides(activity, item).forEach(({ sceneId, value }) => {
          const sceneErr = validateDiscountNumber(activity.discountMethod, value, `${name}在${sceneLabel(sceneId)}的${valueLabel}`)
          if (sceneErr) errors.push(sceneErr)
        })
        const stockErr = validateStock(item.stock, `${name}的活动库存`)
        if (stockErr) errors.push(stockErr)
      })
    }
  }
  return errors
}

export function matchesFilters(activity: LimitDiscountActivityForm, filters: LimitDiscountListFilters): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (!matchesActivityProductFilters(resolveActivityProducts({
    productScope: activity.goodsScope === 'all' ? 'all' : 'partial',
    productSelectionMode: activity.goodsScope === 'exclude' ? 'exclude' : 'include',
    productIds: activity.productItems.map((item) => item.productId),
  }), filters)) return false
  if (filters.keyword) {
    const kw = filters.keyword.trim().toLowerCase()
    if (!activity.name.toLowerCase().includes(kw) && !activity.id.toLowerCase().includes(kw)) return false
  }
  if (filters.startDate && activity.endTime.slice(0, 10) < filters.startDate) return false
  if (filters.endDate && activity.startTime.slice(0, 10) > filters.endDate) return false
  return true
}

export function countActivitiesByStatus(
  activities: LimitDiscountActivityForm[],
  filters: LimitDiscountListFilters,
): Record<string, number> {
  const base = { ...filters, status: 'all' as const }
  const matched = activities.filter((activity) => matchesFilters(activity, base))
  const counts: Record<string, number> = { all: matched.length }
  for (const activity of matched) counts[activity.status] = (counts[activity.status] ?? 0) + 1
  return counts
}

/** 旧数据里按业务类型保存的是整套力度，只保留与默认力度不同的业务作为单独设置 */
function migrateProductItem(
  raw: LimitDiscountProductItem & { valueMode?: LimitDiscountValueMode },
  activityMode: LimitDiscountValueMode | undefined,
): LimitDiscountProductItem {
  const { valueMode, ...item } = raw
  const byScene = valueMode ? valueMode === 'by_scene' : activityMode === 'by_scene'
  const values = byScene ? item.sceneDiscountValues ?? {} : {}
  const filled = Object.values(values).filter((value): value is number => value != null)
  const discountValue = item.discountValue ?? filled[0] ?? null
  const sceneDiscountValues = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value != null && value !== discountValue),
  )
  return { ...item, discountValue, sceneDiscountValues }
}

/** 旧的「按业务类型」是每个业务都填一遍；只保留和默认力度不同的业务 */
function migrateSharedScenes(legacy: Partial<LimitDiscountActivityForm>): Record<string, number | null> {
  if (legacy.goodsScope === 'include' || legacy.valueMode !== 'by_scene') return {}
  const discountValue = legacy.discountValue ?? null
  return Object.fromEntries(
    Object.entries(legacy.sceneDiscountValues ?? {}).filter(([, value]) => value != null && value !== discountValue),
  )
}

export function migrateLimitDiscountActivity(raw: Record<string, unknown>): LimitDiscountActivityForm {
  const defaults = createEmptyLimitDiscountActivity()
  const legacy = raw as Partial<LimitDiscountActivityForm>
  return {
    ...defaults,
    ...legacy,
    areaMode: legacy.areaMode === 'specified' ? 'specified' : 'all',
    areaIdsByStore: legacy.areaIdsByStore ?? {},
    channels: (legacy.channels ?? defaults.channels).filter((id) => CHANNEL_IDS.has(id)),
    orderTypes: (legacy.orderTypes ?? defaults.orderTypes).filter((id) => SCENE_IDS.has(id)),
    weekDays: legacy.weekDays ?? defaults.weekDays,
    monthDays: legacy.monthDays ?? defaults.monthDays,
    timeSlots: legacy.timeSlots?.length ? legacy.timeSlots : defaults.timeSlots,
    inactiveRanges: legacy.inactiveRanges ?? [],
    valueMode: 'unified',
    sceneDiscountValues: legacy.areaMode ? legacy.sceneDiscountValues ?? {} : migrateSharedScenes(legacy),
    productItems: legacy.areaMode ? legacy.productItems ?? [] : (legacy.productItems ?? []).map((raw) => migrateProductItem(raw, legacy.valueMode)),
    storeIds: legacy.storeIds ?? [],
    storeTagIds: legacy.storeTagIds ?? [],
    thresholdProductIds: legacy.thresholdProductIds ?? [],
    memberTagIds: legacy.memberTagIds ?? [],
    operationLogs: legacy.operationLogs ?? defaults.operationLogs,
  }
}
