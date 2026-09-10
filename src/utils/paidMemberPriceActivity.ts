import type {
  MemberPriceActivityForm,
  MemberPriceMethod,
  MemberPriceProductCoreFields,
  PaidMemberCardStatus,
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
  PaidMemberPriceBenefit,
  PaidMemberPriceListFilters,
  PaidMemberPriceStatus,
} from '../types'
import { products, stores } from '../mockData'
import {
  PAID_MEMBER_CARD_STATUS_LABELS,
  createEmptyPaidMemberPriceActivity,
} from '../mockPaidMemberPriceData'
import { formatActivityDateTime, createOperationLog } from './activity'
import {
  getActivityProducts,
  isUniformPricing,
  validateProductItemValue,
} from './memberPriceActivity'

/* ================= 卡与权益查询 ================= */

export function findCard(
  cards: PaidMemberCardTemplate[],
  cardTemplateId: string,
): PaidMemberCardTemplate | undefined {
  return cards.find((c) => c.id === cardTemplateId)
}

export function findBenefit(
  cards: PaidMemberCardTemplate[],
  cardTemplateId: string,
  benefitId: string,
): PaidMemberPriceBenefit | undefined {
  return findCard(cards, cardTemplateId)?.benefits.find((b) => b.id === benefitId)
}

export function getCardStatusLabel(status: PaidMemberCardStatus): string {
  return PAID_MEMBER_CARD_STATUS_LABELS[status] ?? status
}

/** 关联权益卡摘要：「大神卡 · 咖啡专享价」 */
export function getCardBenefitSummary(
  activity: PaidMemberPriceActivityForm,
  cards: PaidMemberCardTemplate[],
): { cardName: string; benefitName: string; cardStatus: PaidMemberCardStatus | null } {
  const card = findCard(cards, activity.cardTemplateId)
  const benefit = card?.benefits.find((b) => b.id === activity.benefitId)
  return {
    cardName: card?.name ?? '未关联',
    benefitName: benefit?.name ?? '未关联',
    cardStatus: card?.status ?? null,
  }
}

/** 权益额度摘要，用于向导第 1 步只读展示卡侧已配的额度 */
export function formatBenefitQuota(
  benefit: PaidMemberPriceBenefit,
  card: PaidMemberCardTemplate,
): { specLabel: string; count: string; items: string }[] {
  if (benefit.totalCountLimitType === 'unlimited' && benefit.totalItemsLimitType === 'unlimited') {
    return [{ specLabel: '全部规格', count: '不限', items: '不限' }]
  }
  return card.specs.map((spec) => {
    const limit = benefit.specLimits.find((l) => l.specId === spec.id)
    return {
      specLabel: spec.label,
      count: benefit.totalCountLimitType === 'unlimited' ? '不限' : `${limit?.count ?? 0} 次`,
      items: benefit.totalItemsLimitType === 'unlimited' ? '不限' : `${limit?.items ?? 0} 件`,
    }
  })
}

/* ================= 状态流转 ================= */

export function canPause(status: PaidMemberPriceStatus): boolean {
  return status === 'in_progress'
}

export function canResume(status: PaidMemberPriceStatus): boolean {
  return status === 'paused'
}

export function canVoid(status: PaidMemberPriceStatus): boolean {
  return status === 'pending' || status === 'in_progress' || status === 'paused'
}

export function canDelete(status: PaidMemberPriceStatus): boolean {
  return status === 'draft'
}

export function canPublish(status: PaidMemberPriceStatus): boolean {
  return status === 'draft'
}

export function canEdit(status: PaidMemberPriceStatus): boolean {
  return status !== 'voided'
}

export function canViewParticipation(status: PaidMemberPriceStatus): boolean {
  return status === 'in_progress' || status === 'paused' || status === 'voided'
}

/**
 * 「进行中」时价格与资格类字段被锁定，必须先暂停才能修改。
 * 仅展示类字段（活动名称、标题、促销标签、活动说明）可直接编辑。
 */
export function isRuleLocked(status: PaidMemberPriceStatus): boolean {
  return status === 'in_progress'
}

/** 关联卡与权益的绑定：草稿可换绑；发布后不可更换 */
export function isBindingLocked(activity: PaidMemberPriceActivityForm): boolean {
  if (activity.status === 'draft') return false
  return Boolean(activity.cardTemplateId && activity.benefitId)
}

/* ================= 暂停时长与超时分级 ================= */

/** 与其他活动类型共用同一套暂停计时与超时分级口径 */
export {
  countOverduePaused,
  formatDuration,
  getPauseInfo,
  type PauseInfo,
  type PauseLevel,
} from './activityPause'

/* ================= 生效范围展开与冲突校验 ================= */

/** 展开为实际生效的门店集合；反选需先展开再比对 */
export function resolveStoreIds(activity: PaidMemberPriceActivityForm): string[] {
  if (activity.storeScope === 'all') return stores.map((s) => s.id)
  if (activity.storeScope === 'partial_exclude') {
    return stores.filter((s) => !activity.storeIds.includes(s.id)).map((s) => s.id)
  }
  return activity.storeIds
}

/** 展开为实际生效的商品集合；反选需先展开再比对 */
export function resolveProductIds(activity: PaidMemberPriceActivityForm): string[] {
  return getActivityProducts(activity).map((p) => p.id)
}

export interface RangeConflict {
  activity: PaidMemberPriceActivityForm
  storeCount: number
  productCount: number
  storeNames: string[]
  productNames: string[]
}

/**
 * 同一「卡模版 + 权益」下的冲突判定：
 * 门店集合与商品集合同时有交集才算冲突；
 * 草稿与已作废活动不参与判定，已暂停活动参与（随时会恢复）。
 */
export function findRangeConflicts(
  target: PaidMemberPriceActivityForm,
  all: PaidMemberPriceActivityForm[],
): RangeConflict[] {
  if (!target.cardTemplateId || !target.benefitId) return []
  const targetStores = new Set(resolveStoreIds(target))
  const targetProducts = new Set(resolveProductIds(target))
  const conflicts: RangeConflict[] = []

  for (const other of all) {
    if (other.id === target.id) continue
    if (other.status === 'voided' || other.status === 'draft') continue
    if (other.cardTemplateId !== target.cardTemplateId) continue
    if (other.benefitId !== target.benefitId) continue

    const storeHits = resolveStoreIds(other).filter((id) => targetStores.has(id))
    if (storeHits.length === 0) continue
    const productHits = resolveProductIds(other).filter((id) => targetProducts.has(id))
    if (productHits.length === 0) continue

    conflicts.push({
      activity: other,
      storeCount: storeHits.length,
      productCount: productHits.length,
      storeNames: storeHits
        .slice(0, 5)
        .map((id) => stores.find((s) => s.id === id)?.name ?? id),
      productNames: productHits
        .slice(0, 5)
        .map((id) => products.find((p) => p.id === id)?.name ?? id),
    })
  }
  return conflicts
}

export function formatConflictMessage(conflicts: RangeConflict[]): string {
  const first = conflicts[0]
  const more = conflicts.length > 1 ? `（另有 ${conflicts.length - 1} 个活动同样重叠）` : ''
  return `与活动「${first.activity.id} · ${first.activity.name}」在 ${first.storeCount} 家门店、${first.productCount} 个商品上范围重叠，同一权益下不可重复配置${more}`
}

/* ================= 卡侧联动 ================= */

/** 卡上架前置校验：关联的非草稿、非作废活动，参与商品不得全部失效 */
export function checkCardOnSale(
  card: PaidMemberCardTemplate,
  activities: PaidMemberPriceActivityForm[],
): { ok: true } | { ok: false; reason: string } {
  const bound = activities.filter(
    (a) =>
      a.cardTemplateId === card.id
      && a.status !== 'voided'
      && a.status !== 'draft',
  )
  for (const activity of bound) {
    if (resolveProductIds(activity).length === 0) {
      return {
        ok: false,
        reason: `无法上架：关联的付费会员价活动「${activity.name}」参与商品已全部失效，请先到促销活动中处理`,
      }
    }
  }
  return { ok: true }
}

/** 绑定保护：权益被非作废活动绑定时不可删除 */
export function findBenefitBoundActivities(
  benefitId: string,
  activities: PaidMemberPriceActivityForm[],
): PaidMemberPriceActivityForm[] {
  return activities.filter((a) => a.benefitId === benefitId && a.status !== 'voided')
}

/** 一个权益下是否已无进行中活动，用于卡侧提示 */
export function hasActiveBoundActivity(
  benefitId: string,
  activities: PaidMemberPriceActivityForm[],
): boolean {
  return activities.some(
    (a) => a.benefitId === benefitId && (a.status === 'in_progress' || a.status === 'paused'),
  )
}

/* ================= 与普通会员价的比价提醒 ================= */

/** 按优惠形式算出商品的实际成交价 */
function resolveUnitPrice(method: MemberPriceMethod, value: number, originalPrice: number): number {
  if (method === 'discount') return Math.round(originalPrice * value * 10) / 100
  if (method === 'fixed_reduction') return Math.max(0, Math.round((originalPrice - value) * 100) / 100)
  return value
}

/** 商品在某个会员价类活动中的成交价；商品不参与该活动时返回 null */
function unitPriceIn(
  activity: MemberPriceProductCoreFields,
  productId: string,
  originalPrice: number,
): number | null {
  if (!getActivityProducts(activity).some((p) => p.id === productId)) return null
  const value = isUniformPricing(activity)
    ? activity.allProductsValue
    : activity.productItems.find((i) => i.productId === productId)?.value
  if (value == null) return null
  return resolveUnitPrice(activity.priceMethod, value, originalPrice)
}

export interface PriceDisadvantage {
  productName: string
  paidPrice: number
  memberPrice: number
  memberActivityName: string
}

/**
 * 检出「付费会员价比普通会员价更贵」的商品。
 * 顾客付费开卡却买得更贵会直接损伤口碑，因此保存时提醒但不阻断。
 * 对比基准取生效中的普通会员价里对顾客最优（最低）的那一档。
 */
export function findPriceDisadvantages(
  activity: PaidMemberPriceActivityForm,
  memberPriceActivities: MemberPriceActivityForm[],
): PriceDisadvantage[] {
  const live = memberPriceActivities.filter(
    (m) => m.status === 'in_progress' || m.status === 'not_started',
  )
  if (live.length === 0) return []

  const result: PriceDisadvantage[] = []
  for (const product of getActivityProducts(activity)) {
    const paidPrice = unitPriceIn(activity, product.id, product.price)
    if (paidPrice == null) continue

    let best: { price: number; name: string } | null = null
    for (const m of live) {
      const price = unitPriceIn(m, product.id, product.price)
      if (price == null) continue
      if (!best || price < best.price) best = { price, name: m.name }
    }
    if (best && paidPrice > best.price) {
      result.push({
        productName: product.name,
        paidPrice,
        memberPrice: best.price,
        memberActivityName: best.name,
      })
    }
  }
  return result
}

/* ================= 校验 ================= */

const NAME_MAX = 30
const TITLE_MAX = 20
const TAG_MAX = 20
const DESC_MAX = 500
const CODE_MAX = 30

function validateLimitFields(activity: PaidMemberPriceActivityForm): string | null {
  if (activity.maxDiscountItemsDailyType === 'limited' && activity.maxDiscountItemsDaily < 1) {
    return '每天优惠件数限制须大于0'
  }
  if (activity.maxDiscountItemsPerOrderType === 'limited' && activity.maxDiscountItemsPerOrder < 1) {
    return '每单优惠件数限制须大于0'
  }
  return null
}

/**
 * 分步校验。步骤：0 关联权益卡 / 1 活动基础规则 / 2 参与门店 / 3 参与商品及优惠 / 4 预览
 */
export function validateStep(
  activity: PaidMemberPriceActivityForm,
  step: number,
  cards: PaidMemberCardTemplate[],
): string | null {
  if (step === 0) {
    if (!activity.cardTemplateId) return '请选择关联的付费会员卡'
    if (!activity.benefitId) return '请选择关联的付费会员价权益'
    const benefit = findBenefit(cards, activity.cardTemplateId, activity.benefitId)
    if (!benefit) return '所选权益不存在，请重新选择'
  }
  if (step === 1) {
    if (!activity.name.trim()) return '请填写活动名称'
    if (activity.name.length > NAME_MAX) return `活动名称不超过${NAME_MAX}字`
    if (activity.title.length > TITLE_MAX) return `活动标题不超过${TITLE_MAX}字`
    if (activity.tag.length > TAG_MAX) return `商品促销标签不超过${TAG_MAX}字`
    if (activity.description.length > DESC_MAX) return `活动说明不超过${DESC_MAX}字`
    if (activity.activityCode.length > CODE_MAX) return `活动编码不超过${CODE_MAX}字`
    if (activity.channels.length === 0) return '请至少选择一个参与渠道'
    if (activity.orderTypes.length === 0) return '请至少选择一个参与业务场景'
    const limitErr = validateLimitFields(activity)
    if (limitErr) return limitErr
  }
  if (step === 2) {
    if (activity.storeScope !== 'all' && activity.storeIds.length === 0) {
      return '请至少选择一个门店'
    }
  }
  if (step === 3) {
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

/** 保存草稿：只要求活动名称，允许半成品 */
export function validateDraftSave(activity: PaidMemberPriceActivityForm): string | null {
  if (!activity.name.trim()) return '请填写活动名称'
  if (activity.name.length > NAME_MAX) return `活动名称不超过${NAME_MAX}字`
  if (activity.title.length > TITLE_MAX) return `活动标题不超过${TITLE_MAX}字`
  if (activity.tag.length > TAG_MAX) return `商品促销标签不超过${TAG_MAX}字`
  if (activity.description.length > DESC_MAX) return `活动说明不超过${DESC_MAX}字`
  if (activity.activityCode.length > CODE_MAX) return `活动编码不超过${CODE_MAX}字`
  return null
}

/** 发布前的整体校验：跑完所有步骤 + 冲突校验（草稿不参与冲突，但发布目标须与非草稿活动无重叠） */
export function validateBeforeSave(
  activity: PaidMemberPriceActivityForm,
  cards: PaidMemberCardTemplate[],
  all: PaidMemberPriceActivityForm[],
): string | null {
  for (let i = 0; i <= 3; i++) {
    const err = validateStep(activity, i, cards)
    if (err) return err
  }
  const conflicts = findRangeConflicts(activity, all)
  if (conflicts.length > 0) return formatConflictMessage(conflicts)
  return null
}

/** 发布后的目标状态：关联卡在售 → 进行中，否则待发布 */
export function resolvePublishStatus(
  activity: PaidMemberPriceActivityForm,
  cards: PaidMemberCardTemplate[],
): Exclude<PaidMemberPriceStatus, 'draft' | 'paused' | 'voided'> {
  const card = findCard(cards, activity.cardTemplateId)
  return card?.status === 'on_sale' ? 'in_progress' : 'pending'
}

/* ================= 列表筛选 ================= */

function matchesProductName(activity: PaidMemberPriceActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProducts(activity).some((p) => p.name.toLowerCase().includes(kw))
}

function matchesProductId(activity: PaidMemberPriceActivityForm, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProducts(activity).some(
    (p) => p.id.toLowerCase().includes(kw) || p.skuId.toLowerCase().includes(kw),
  )
}

export function matchesFilters(
  activity: PaidMemberPriceActivityForm,
  filters: PaidMemberPriceListFilters,
  cards: PaidMemberCardTemplate[],
): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  if (filters.priceMethod !== 'all' && activity.priceMethod !== filters.priceMethod) return false
  if (filters.cardTemplateId && filters.cardTemplateId !== 'all') {
    if (activity.cardTemplateId !== filters.cardTemplateId) return false
  }
  if (filters.cardStatus !== 'all') {
    const card = findCard(cards, activity.cardTemplateId)
    if (!card || card.status !== filters.cardStatus) return false
  }
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
  if (filters.storeId && filters.storeId !== 'all') {
    if (!resolveStoreIds(activity).includes(filters.storeId)) return false
  }
  return true
}

export function countActivitiesByStatus(
  activities: PaidMemberPriceActivityForm[],
  filters: PaidMemberPriceListFilters,
  cards: PaidMemberCardTemplate[],
): Record<PaidMemberPriceStatus | 'all', number> {
  const base = activities.filter((a) => matchesFilters(a, { ...filters, status: 'all' }, cards))
  const counts = {
    all: base.length,
    draft: 0,
    pending: 0,
    in_progress: 0,
    paused: 0,
    voided: 0,
  } satisfies Record<PaidMemberPriceStatus | 'all', number>
  for (const a of base) counts[a.status] += 1
  return counts
}

/* ================= 复制与迁移 ================= */

/** 副本回落草稿，且不继承卡与权益绑定（发布后绑定受冲突校验约束，需重新选择） */
export function cloneActivity(activity: PaidMemberPriceActivityForm): PaidMemberPriceActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `PMP${Date.now()}`,
    name: `${activity.name}(副本)`,
    cardTemplateId: '',
    benefitId: '',
    status: 'draft',
    pausedAt: undefined,
    createdAt: now,
    updatedAt: now,
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建为草稿，需重新关联权益卡`),
    ],
  }
}

export function migratePaidMemberPriceActivity(
  raw: Record<string, unknown>,
): PaidMemberPriceActivityForm {
  const defaults = createEmptyPaidMemberPriceActivity()
  const legacy = raw as Partial<PaidMemberPriceActivityForm>
  const productIds = legacy.productIds ?? legacy.productItems?.map((i) => i.productId) ?? defaults.productIds
  return {
    ...defaults,
    ...legacy,
    productIds,
    productItems: legacy.productItems ?? defaults.productItems,
    status: legacy.status ?? defaults.status,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
    operationLogs: legacy.operationLogs?.length ? legacy.operationLogs : defaults.operationLogs,
  }
}

/* ================= 展示辅助 ================= */

export function formatPaidRuleSummary(activity: PaidMemberPriceActivityForm): string {
  const labels: Record<MemberPriceMethod, string> = {
    discount: '折扣',
    fixed_reduction: '减价',
    special_price: '固定价格',
  }
  const uniform = activity.priceMethod === 'discount'
    ? `${activity.allProductsValue}折`
    : activity.priceMethod === 'fixed_reduction'
      ? `立减${activity.allProductsValue}元`
      : `特价${activity.allProductsValue}元`
  let count: string
  if (activity.productScope === 'all') {
    count = `全部商品${uniform}`
  } else if (activity.productSelectionMode === 'exclude') {
    count = `排除${activity.productIds.length}个商品，其余${uniform}`
  } else {
    count = `${activity.productItems.length}个商品`
  }
  return `${labels[activity.priceMethod]} · ${count}`
}

/** 参与商品中已失效（已下架/删除）的数量 */
export function countInvalidProducts(activity: PaidMemberPriceActivityForm): number {
  if (activity.productScope === 'all' || activity.productSelectionMode === 'exclude') return 0
  const valid = new Set(products.map((p) => p.id))
  return activity.productIds.filter((id) => !valid.has(id)).length
}
