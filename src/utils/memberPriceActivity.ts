import { matchesActivityProductFilters } from './activityProductSearch'
import type {
  ActivityOperationLog,
  ActivityStatus,
  MemberLevelId,
  MemberPriceActivityForm,
  MemberPriceAudienceType,
  MemberPriceListFilters,
  MemberPriceMethod,
  MemberPriceOfferGroup,
  MemberPriceProductCoreFields,
  MemberPriceProductItem,
  StoreScope,
} from '../types'
import {
  MEMBER_LEVEL_LABELS,
  MEMBER_PRICE_METHOD_LABELS,
  MEMBER_PRICE_ORDER_TYPES,
  createEmptyMemberPriceActivity,
  createEmptyMemberPriceOfferGroup,
  normalizeMemberPriceOrderTypes,
  normalizeMemberPriceProductItem,
  remapMemberPriceSceneValues,
} from '../mockMemberPriceData'
import {
  MEMBER_LEVELS,
  PHYSICAL_CARDS,
  STORED_VALUE_LEVELS,
  getCreatorProfile,
  products,
  stores,
} from '../mockData'
import { createOperationLog, formatActivityDateTime, maskPhone } from './activity'

export { MEMBER_LEVEL_LABELS, MEMBER_PRICE_METHOD_LABELS }

export const MEMBER_PRICE_AUDIENCE_OPTIONS: { value: MemberPriceAudienceType; label: string }[] = [
  { value: 'all_level', label: '全部等级会员' },
  { value: 'specified_level', label: '指定等级会员' },
  { value: 'all_stored_value', label: '全部储值会员' },
  { value: 'specified_stored_value', label: '指定储值会员' },
  { value: 'any_physical_card', label: '使用任意实体卡付款用户' },
  { value: 'specified_physical_card', label: '使用指定实体卡付款用户' },
  { value: 'paid_member_card_user', label: '付费会员卡用户' },
]

/** 需要勾选具体对象（等级 / 储值等级 / 实体卡）的受众 */
export const MEMBER_PRICE_TARGET_AUDIENCES: MemberPriceAudienceType[] = [
  'specified_level',
  'specified_stored_value',
  'specified_physical_card',
]

/**
 * 按枚举自动拆组的受众（一组对应一个等级）。
 * 指定实体卡不在此列：多选卡共用一套商品与优惠。
 */
export const MEMBER_PRICE_MULTI_GROUP_AUDIENCES: MemberPriceAudienceType[] = [
  'specified_level',
  'specified_stored_value',
]

export const MEMBER_PRICE_PHYSICAL_CARD_AUDIENCES: MemberPriceAudienceType[] = [
  'any_physical_card',
  'specified_physical_card',
]

export const MEMBER_PRICE_STORED_VALUE_AUDIENCES: MemberPriceAudienceType[] = [
  'all_stored_value',
  'specified_stored_value',
]

/** 支付方式可选项（Demo） */
export const MEMBER_PRICE_PAYMENT_METHOD_OPTIONS = [
  { id: 'stored_balance', label: '储值余额' },
  { id: 'gift_stored_physical_card', label: '实体卡' },
] as const

/** 非实体卡受众：默认关闭支付限制 */
export const DEFAULT_MEMBER_PRICE_PAYMENT_OFF = {
  paymentLimitType: 'unlimited' as const,
  paymentMethodIds: [] as string[],
  paymentAmountLimit: 'any' as const,
}

/** 实体卡受众：默认限制「实体卡」支付 */
export const DEFAULT_MEMBER_PRICE_PAYMENT = {
  paymentLimitType: 'limited' as const,
  paymentMethodIds: ['gift_stored_physical_card'] as string[],
  paymentAmountLimit: 'any' as const,
}

export function isMemberPricePhysicalCardAudience(audienceType: MemberPriceAudienceType): boolean {
  return MEMBER_PRICE_PHYSICAL_CARD_AUDIENCES.includes(audienceType)
}

export function isMemberPriceStoredValueAudience(audienceType: MemberPriceAudienceType): boolean {
  return MEMBER_PRICE_STORED_VALUE_AUDIENCES.includes(audienceType)
}

/** 按优惠会员过滤可选支付方式：储值会员仅「储值余额」；实体卡仅「实体卡」 */
export function getMemberPricePaymentMethodOptionsForAudience(
  audienceType: MemberPriceAudienceType,
): readonly { id: string; label: string }[] {
  if (isMemberPricePhysicalCardAudience(audienceType)) {
    return MEMBER_PRICE_PAYMENT_METHOD_OPTIONS.filter((o) => o.id === 'gift_stored_physical_card')
  }
  if (isMemberPriceStoredValueAudience(audienceType)) {
    return MEMBER_PRICE_PAYMENT_METHOD_OPTIONS.filter((o) => o.id === 'stored_balance')
  }
  return MEMBER_PRICE_PAYMENT_METHOD_OPTIONS
}

/** 切换优惠会员时的支付限制默认值：实体卡开启限制，其余关闭 */
export function getMemberPricePaymentDefaultsForAudience(audienceType: MemberPriceAudienceType) {
  return isMemberPricePhysicalCardAudience(audienceType)
    ? { ...DEFAULT_MEMBER_PRICE_PAYMENT, paymentMethodIds: [...DEFAULT_MEMBER_PRICE_PAYMENT.paymentMethodIds] }
    : { ...DEFAULT_MEMBER_PRICE_PAYMENT_OFF, paymentMethodIds: [] as string[] }
}

export function getMemberPricePaymentMethodLabel(id: string): string {
  return MEMBER_PRICE_PAYMENT_METHOD_OPTIONS.find((o) => o.id === id)?.label ?? id
}

export function formatMemberPricePaymentLimit(activity: MemberPriceActivityForm): string {
  if (activity.paymentLimitType !== 'limited') return '不限'
  const allowed = new Set(
    getMemberPricePaymentMethodOptionsForAudience(activity.audienceType ?? 'specified_level').map((o) => o.id),
  )
  const methods = (activity.paymentMethodIds ?? [])
    .filter((id) => allowed.has(id))
    .map(getMemberPricePaymentMethodLabel)
    .join('、')
  return methods ? `限制：${methods}` : '限制（未选支付方式）'
}

export function formatMemberPricePaymentAmountLimit(activity: MemberPriceActivityForm): string {
  if (activity.paymentLimitType !== 'limited') return '-'
  return activity.paymentAmountLimit === 'full_order' ? '整单支付金额' : '任意支付金额'
}

/** 指定类按枚举自动拆组，上限=可选枚举数量 */
export function getMemberPriceMaxGroups(audienceType: MemberPriceAudienceType): number {
  const count = getMemberPriceTargetOptions(audienceType).length
  return count > 0 ? count : 1
}

/** @deprecated 指定类已改为按枚举拆组，保留常量供旧文案兼容 */
export const MAX_MEMBER_PRICE_GROUPS = 10

export function supportsMemberPriceMultiGroup(audienceType: MemberPriceAudienceType): boolean {
  return MEMBER_PRICE_MULTI_GROUP_AUDIENCES.includes(audienceType)
}

export function needsMemberPriceTargets(audienceType: MemberPriceAudienceType): boolean {
  return MEMBER_PRICE_TARGET_AUDIENCES.includes(audienceType)
}

export function getMemberPriceAudienceLabel(audienceType: MemberPriceAudienceType): string {
  return MEMBER_PRICE_AUDIENCE_OPTIONS.find((o) => o.value === audienceType)?.label ?? audienceType
}

export function getMemberPriceTargetOptions(
  audienceType: MemberPriceAudienceType,
): { id: string; label: string }[] {
  if (audienceType === 'specified_level') return MEMBER_LEVELS.map((l) => ({ id: l.id, label: l.label }))
  if (audienceType === 'specified_stored_value') return STORED_VALUE_LEVELS
  if (audienceType === 'specified_physical_card') return PHYSICAL_CARDS
  return []
}

export function getMemberPriceTargetFieldLabel(audienceType: MemberPriceAudienceType): string {
  if (audienceType === 'specified_level') return '选择会员等级'
  if (audienceType === 'specified_stored_value') return '选择会员等级'
  if (audienceType === 'specified_physical_card') return '选择实体卡'
  return '选择对象'
}

export function getMemberPriceGroupUnitLabel(audienceType: MemberPriceAudienceType): string {
  if (audienceType === 'specified_physical_card') return '实体卡'
  return '等级'
}

export function formatMemberPriceTargetIds(
  audienceType: MemberPriceAudienceType,
  targetIds: string[],
): string {
  if (!needsMemberPriceTargets(audienceType)) {
    return getMemberPriceAudienceLabel(audienceType)
  }
  if (targetIds.length === 0) return '未选择'
  const map = new Map(getMemberPriceTargetOptions(audienceType).map((o) => [o.id, o.label]))
  return targetIds.map((id) => map.get(id) ?? id).join('、')
}

/** 组 Tab / 预览标题：优先展示等级或卡模版名称 */
export function getMemberPriceGroupLabel(
  audienceType: MemberPriceAudienceType,
  group: MemberPriceOfferGroup,
  fallbackIndex = 0,
): string {
  if (group.targetIds.length === 1) {
    const map = new Map(getMemberPriceTargetOptions(audienceType).map((o) => [o.id, o.label]))
    return map.get(group.targetIds[0]) ?? group.targetIds[0]
  }
  if (group.targetIds.length > 1) {
    return formatMemberPriceTargetIds(audienceType, group.targetIds)
  }
  return `未命名${getMemberPriceGroupUnitLabel(audienceType)}${fallbackIndex + 1}`
}

/** @deprecated 改用 getMemberPriceGroupLabel */
export function getMemberPriceOfferSchemeLabel(index: number): string {
  return `组${index + 1}`
}

/** 标签副文案（旧多选组摘要；新模型一组一枚举时通常为空） */
export function formatMemberPriceGroupTabSummary(
  audienceType: MemberPriceAudienceType,
  targetIds: string[],
  maxLabels = 2,
): string {
  if (!needsMemberPriceTargets(audienceType)) return ''
  if (targetIds.length <= 1) return ''
  const map = new Map(getMemberPriceTargetOptions(audienceType).map((o) => [o.id, o.label]))
  const labels = targetIds.map((id) => map.get(id) ?? id)
  if (labels.length <= maxLabels) return labels.join('、')
  return `${labels.slice(0, maxLabels).join('、')}等${labels.length}项`
}

/** 是否已配置参与/不参与商品（取消勾选时需二次确认） */
export function memberPriceGroupHasProductConfig(group: MemberPriceOfferGroup): boolean {
  if (group.productScope === 'all') return true
  return group.productIds.length > 0 || group.productItems.some((item) => item.productId)
}

/**
 * 按已选枚举同步拆组：一组对应一个等级/卡模版 ID。
 * 已有组保留商品配置；新勾选项建空组；去掉的枚举丢弃对应组。
 */
export function syncMemberPriceGroupsWithTargets(
  groups: MemberPriceOfferGroup[],
  selectedTargetIds: string[],
  template?: Pick<MemberPriceOfferGroup, 'priceMethod' | 'allProductsValue'>,
): MemberPriceOfferGroup[] {
  const byTarget = new Map<string, MemberPriceOfferGroup>()
  for (const group of groups) {
    const id = group.targetIds[0]
    if (!id || byTarget.has(id)) continue
    byTarget.set(id, { ...group, targetIds: [id] })
  }
  return selectedTargetIds.map((id) => {
    const existing = byTarget.get(id)
    if (existing) return existing
    return createEmptyMemberPriceOfferGroup({
      targetIds: [id],
      priceMethod: template?.priceMethod ?? 'discount',
      allProductsValue: template?.allProductsValue ?? defaultValueForMethod(template?.priceMethod ?? 'discount'),
    })
  })
}

/**
 * 旧数据迁移：一组挂多个枚举时拆成多组，商品配置复制到每一组。
 * 仅用于仍支持按枚举拆组的受众（指定等级 / 指定储值）。
 */
export function expandMemberPriceGroupsByTarget(
  audienceType: MemberPriceAudienceType,
  groups: MemberPriceOfferGroup[],
): MemberPriceOfferGroup[] {
  if (!supportsMemberPriceMultiGroup(audienceType)) return groups
  const result: MemberPriceOfferGroup[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    const ids = group.targetIds.length > 0 ? group.targetIds : []
    if (ids.length === 0) {
      result.push(group)
      continue
    }
    if (ids.length === 1) {
      if (seen.has(ids[0])) continue
      seen.add(ids[0])
      result.push({ ...group, targetIds: [ids[0]] })
      continue
    }
    ids.forEach((id, index) => {
      if (seen.has(id)) return
      seen.add(id)
      const next = createEmptyMemberPriceOfferGroup({
        targetIds: [id],
        priceMethod: group.priceMethod,
        allProductsValue: group.allProductsValue,
        valueMode: group.valueMode,
        sceneValues: group.sceneValues ? { ...group.sceneValues } : {},
        productScope: group.productScope,
        productSelectionMode: group.productSelectionMode,
        productIds: [...group.productIds],
        productItems: group.productItems.map((item) => ({
          productId: item.productId,
          value: item.value,
          sceneValues: item.sceneValues ? { ...item.sceneValues } : undefined,
        })),
      })
      result.push(index === 0 ? { ...next, id: group.id } : next)
    })
  }
  return result
}

/**
 * 指定实体卡：历史「按卡模版拆组」数据合并为单组，多卡共用一套商品与优惠。
 * 优先保留已配置商品的那一组作为商品底稿。
 */
export function collapseMemberPricePhysicalCardGroups(
  groups: MemberPriceOfferGroup[],
): MemberPriceOfferGroup[] {
  if (groups.length === 0) return groups
  const primary = groups.find((g) => memberPriceGroupHasProductConfig(g)) ?? groups[0]
  const allTargets = [...new Set(groups.flatMap((g) => g.targetIds))]
  return [{ ...primary, targetIds: allTargets }]
}

/** 按受众规范化 groups：指定等级/储值拆组；指定实体卡合并为单组 */
export function normalizeMemberPriceGroupsByAudience(
  audienceType: MemberPriceAudienceType,
  groups: MemberPriceOfferGroup[],
): MemberPriceOfferGroup[] {
  if (audienceType === 'specified_physical_card') {
    return collapseMemberPricePhysicalCardGroups(groups)
  }
  return expandMemberPriceGroupsByTarget(audienceType, groups)
}

export interface CopyMemberPriceProductsResult {
  group: MemberPriceOfferGroup
  /** 来源与目标的正选/反选不一致 */
  modeMismatch: boolean
}

/**
 * 一键复用参与商品：只带商品身份清单，不带优惠方式与正选/反选。
 * 优惠值按目标组当前优惠方式重置为默认值。
 */
export function copyMemberPriceGroupProducts(
  source: MemberPriceOfferGroup,
  target: MemberPriceOfferGroup,
): CopyMemberPriceProductsResult {
  const modeMismatch = source.productSelectionMode !== target.productSelectionMode
  const method = target.priceMethod
  const sourceIds = [...source.productIds]

  let productScope = target.productScope
  let productIds = sourceIds

  if (target.productSelectionMode === 'exclude') {
    // 反选始终是「部分商品」黑名单；来源若是「全部商品」则没有可写入的 ID
    productScope = 'partial'
    productIds = source.productScope === 'all' && source.productSelectionMode === 'include'
      ? [...target.productIds]
      : sourceIds
  } else if (source.productScope === 'all' && source.productSelectionMode === 'include') {
    productScope = 'all'
    productIds = []
  } else {
    productScope = 'partial'
    productIds = sourceIds
  }

  const productItems = productIds.map((productId) => {
    const salePrice = products.find((p) => p.id === productId)?.price
    return {
      productId,
      value: defaultValueForMethod(method, salePrice),
    }
  })

  return {
    modeMismatch,
    group: {
      ...target,
      // 只改商品清单；优惠方式、正选/反选、已填统一力度均保留目标组
      productScope,
      productIds,
      productItems,
      priceMethod: method,
      productSelectionMode: target.productSelectionMode,
      valueMode: target.valueMode ?? 'unified',
      allProductsValue: target.allProductsValue,
      sceneValues: target.sceneValues ? { ...target.sceneValues } : {},
    },
  }
}

/** 将 groups[0] 商品字段同步到活动顶层，供列表检索等复用 */
export function syncMemberPriceActivityMirrors(activity: MemberPriceActivityForm): MemberPriceActivityForm {
  const groups = activity.groups?.length
    ? activity.groups
    : [createEmptyMemberPriceOfferGroup({ targetIds: activity.memberLevels ?? [] })]
  const primary = groups[0]
  const levelTargets = groups.flatMap((g) => g.targetIds).filter((id): id is MemberLevelId =>
    MEMBER_LEVELS.some((l) => l.id === id),
  )
  return {
    ...activity,
    groups,
    memberLevels: activity.audienceType === 'specified_level' || activity.audienceType === 'all_level'
      ? (levelTargets.length ? [...new Set(levelTargets)] : (activity.memberLevels ?? []))
      : [],
    priceMethod: primary.priceMethod,
    productItems: primary.productItems,
    allProductsValue: primary.allProductsValue,
    productScope: primary.productScope,
    productIds: primary.productIds,
    productSelectionMode: primary.productSelectionMode,
  }
}

export function groupToProductCore(group: MemberPriceOfferGroup): MemberPriceProductCoreFields {
  return {
    priceMethod: group.priceMethod,
    productItems: group.productItems,
    allProductsValue: group.allProductsValue,
    valueMode: group.valueMode,
    sceneValues: group.sceneValues,
    productScope: group.productScope,
    productIds: group.productIds,
    productSelectionMode: group.productSelectionMode,
  }
}

export function applyProductCoreToGroup(
  group: MemberPriceOfferGroup,
  core: MemberPriceProductCoreFields,
): MemberPriceOfferGroup {
  return {
    ...group,
    priceMethod: core.priceMethod,
    productItems: core.productItems,
    allProductsValue: core.allProductsValue,
    valueMode: core.valueMode,
    sceneValues: core.sceneValues,
    productScope: core.productScope,
    productIds: core.productIds,
    productSelectionMode: core.productSelectionMode,
  }
}

/** 指定类下，其他方案已占用的会员子集 id（本方案内已选不计入） */
export function getTakenMemberPriceTargetIds(
  groups: MemberPriceOfferGroup[],
  excludeGroupId?: string,
): Set<string> {
  const taken = new Set<string>()
  for (const group of groups) {
    if (excludeGroupId && group.id === excludeGroupId) continue
    for (const id of group.targetIds) taken.add(id)
  }
  return taken
}

export function getMemberPriceAllAudienceHint(audienceType: MemberPriceAudienceType): string {
  if (audienceType === 'specified_level') return '全部等级会员'
  if (audienceType === 'specified_stored_value') return '全部储值会员'
  if (audienceType === 'specified_physical_card') return '使用任意实体卡付款用户'
  return '对应的「全部 / 任意」类型'
}

export function validateMemberPriceOfferGroup(
  audienceType: MemberPriceAudienceType,
  group: MemberPriceOfferGroup,
  groupIndex: number,
  orderTypes: string[],
): string | null {
  const prefix = supportsMemberPriceMultiGroup(audienceType)
    ? `${getMemberPriceGroupLabel(audienceType, group, groupIndex)}：`
    : ''
  if (needsMemberPriceTargets(audienceType) && group.targetIds.length === 0) {
    return `${prefix}请至少选择一个${getMemberPriceGroupUnitLabel(audienceType)}`
  }
  if (supportsMemberPriceMultiGroup(audienceType) && group.targetIds.length > 1) {
    return `${prefix}每组仅对应一个${getMemberPriceGroupUnitLabel(audienceType)}`
  }
  const core = groupToProductCore(group)
  const isExclude = group.productSelectionMode === 'exclude'
  if (group.productScope === 'partial' && group.productIds.length === 0) {
    return `${prefix}${isExclude ? '请至少选择一个不参与商品' : '请至少选择一个参与商品'}`
  }
  if (isUniformPricing(core)) {
    const err = validateProductItemValue(group.priceMethod, group.allProductsValue)
    if (err) return `${prefix}优惠设置：${err}`
    if (isExclude && group.productScope === 'partial' && getActivityProducts(core).length === 0) {
      return `${prefix}不参与商品已覆盖全部商品，请调整选择`
    }
  } else if (group.productScope === 'partial') {
    for (const item of group.productItems) {
      const product = products.find((p) => p.id === item.productId)
      const err = validateProductItemValue(group.priceMethod, item.value, product?.price)
      if (err) return `${prefix}「${product?.name ?? item.productId}」${err}`
    }
  }
  const sceneErr = validateMemberSceneSettings({ ...core, orderTypes })
  if (sceneErr) return `${prefix}${sceneErr}`
  return null
}

/** 指定类各组枚举不可重复 */
export function validateMemberPriceTargetExclusive(
  audienceType: MemberPriceAudienceType,
  groups: MemberPriceOfferGroup[],
): string | null {
  if (!needsMemberPriceTargets(audienceType)) return null
  const seen = new Map<string, number>()
  const labelMap = new Map(getMemberPriceTargetOptions(audienceType).map((o) => [o.id, o.label]))
  for (let i = 0; i < groups.length; i++) {
    for (const id of groups[i].targetIds) {
      const prev = seen.get(id)
      if (prev != null) {
        return `「${labelMap.get(id) ?? id}」不可重复配置（已用于${getMemberPriceGroupLabel(audienceType, groups[prev], prev)}与${getMemberPriceGroupLabel(audienceType, groups[i], i)}）`
      }
      seen.set(id, i)
    }
  }
  return null
}

export function formatPriceMethodValue(method: MemberPriceMethod, value: number): string {
  if (method === 'discount') return `${value}折`
  if (method === 'fixed_reduction') return `立减${value}元`
  return `特价${value}元`
}

/**
 * 以下商品 / 优惠 / 门店相关的函数只依赖会员价与付费会员价的共有字段，
 * 因此按 MemberPriceProductCoreFields 约束，两类活动共用同一份实现。
 */

/** 是否使用统一优惠值：全部商品，或反选模式下的剩余参与商品 */
export function isUniformPricing(activity: MemberPriceProductCoreFields): boolean {
  return activity.productScope === 'all' || activity.productSelectionMode === 'exclude'
}

export function orderTypeLabel(sceneId: string): string {
  return MEMBER_PRICE_ORDER_TYPES.find((item) => item.id === sceneId)?.label ?? sceneId
}

export function readMemberSceneValue(
  values: Record<string, number | null> | undefined,
  sceneId: string,
  fallback: number,
): number | null {
  if (values && Object.prototype.hasOwnProperty.call(values, sceneId)) return values[sceneId]
  return fallback
}

/** 商品在已选业务里单独设置、且与默认力度不同的值 */
export function memberSceneOverrides(
  orderTypes: string[],
  item: MemberPriceProductItem,
): { sceneId: string; value: number }[] {
  return orderTypes.flatMap((sceneId) => {
    const value = item.sceneValues?.[sceneId]
    return value == null || Number.isNaN(value) || value === item.value ? [] : [{ sceneId, value }]
  })
}

export function memberSceneOverrideCount(activity: MemberPriceProductCoreFields, orderTypes?: string[]): number {
  return activity.productItems.filter((item) => memberSceneOverrides(orderTypes ?? Object.keys(item.sceneValues ?? {}), item).length > 0).length
}

export function isMemberSameAsDefault(item: MemberPriceProductItem, sceneId: string): boolean {
  const value = item.sceneValues?.[sceneId]
  return value != null && value === item.value
}

export function setMemberSceneOverride(
  item: MemberPriceProductItem,
  sceneId: string,
  value: number | null,
): MemberPriceProductItem {
  const sceneValues = { ...(item.sceneValues ?? {}) }
  if (value == null) delete sceneValues[sceneId]
  else sceneValues[sceneId] = value
  return { ...item, sceneValues }
}

export function pruneMemberSameAsDefault(item: MemberPriceProductItem): MemberPriceProductItem {
  const entries = Object.entries(item.sceneValues ?? {})
  if (!entries.some(([, value]) => value != null && value === item.value)) return item
  return {
    ...item,
    sceneValues: Object.fromEntries(entries.filter(([, value]) => value == null || value !== item.value)),
  }
}

/** 全部商品、反选时，活动级的默认力度和业务例外 */
export function uniformDiscountItem(activity: MemberPriceProductCoreFields): MemberPriceProductItem {
  return {
    productId: '',
    value: activity.allProductsValue,
    sceneValues: activity.sceneValues ?? {},
  }
}

export function writeUniformDiscount<T extends MemberPriceProductCoreFields>(
  activity: T,
  patch: Partial<Pick<MemberPriceProductItem, 'value' | 'sceneValues'>>,
  prune = false,
): T {
  const merged: MemberPriceProductItem = {
    ...uniformDiscountItem(activity),
    ...patch,
    sceneValues: patch.sceneValues ?? activity.sceneValues ?? {},
  }
  const next = prune ? pruneMemberSameAsDefault(merged) : merged
  return { ...activity, allProductsValue: next.value, sceneValues: next.sceneValues, valueMode: 'unified' }
}

/** 预览、快照里某个商品实际配置的力度文案 */
export function formatConfiguredStrength(
  activity: MemberPriceProductCoreFields,
  orderTypes: string[],
  productId: string,
): string {
  if (isUniformPricing(activity)) {
    const base = formatPriceMethodValue(activity.priceMethod, activity.allProductsValue)
    const overrides = memberSceneOverrides(orderTypes, uniformDiscountItem(activity))
    if (overrides.length === 0) return base
    const extra = overrides
      .map(({ sceneId, value }) => `${orderTypeLabel(sceneId)} ${formatPriceMethodValue(activity.priceMethod, value)}`)
      .join('、')
    return `默认${base}（${extra}）`
  }
  const item = activity.productItems.find((row) => row.productId === productId)
  if (!item) return '未设置'
  const base = formatPriceMethodValue(activity.priceMethod, item.value)
  const overrides = memberSceneOverrides(orderTypes, item)
  if (overrides.length === 0) return base
  const extra = overrides
    .map(({ sceneId, value }) => `${orderTypeLabel(sceneId)} ${formatPriceMethodValue(activity.priceMethod, value)}`)
    .join('、')
  return `${base}（${extra}）`
}

export function formatUniformStrength(activity: MemberPriceProductCoreFields, orderTypes: string[]): string {
  const method = MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]
  const base = formatPriceMethodValue(activity.priceMethod, activity.allProductsValue)
  const overrides = memberSceneOverrides(orderTypes, uniformDiscountItem(activity))
  if (overrides.length === 0) return `${method}（参与商品统一${base}）`
  const parts = overrides
    .map(({ sceneId, value }) => `${orderTypeLabel(sceneId)} ${formatPriceMethodValue(activity.priceMethod, value)}`)
    .join('、')
  return `${method}（默认${base}，${parts}单独设置）`
}

/** 分业务力度的范围校验；与默认相同的值不算单独设置 */
export function validateMemberSceneSettings(
  activity: MemberPriceProductCoreFields & { orderTypes: string[] },
): string | null {
  if (isUniformPricing(activity)) {
    for (const { sceneId, value } of memberSceneOverrides(activity.orderTypes, uniformDiscountItem(activity))) {
      const err = validateProductItemValue(activity.priceMethod, value)
      if (err) return `${orderTypeLabel(sceneId)}：${err}`
    }
    return null
  }
  for (const item of activity.productItems) {
    const product = products.find((row) => row.id === item.productId)
    for (const { sceneId, value } of memberSceneOverrides(activity.orderTypes, item)) {
      const err = validateProductItemValue(activity.priceMethod, value, product?.price)
      if (err) return `「${product?.name ?? item.productId}」在${orderTypeLabel(sceneId)}：${err}`
    }
  }
  return null
}

export function formatRuleSummary(activity: MemberPriceProductCoreFields): string {
  const methodLabel = MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]
  const uniformValue = formatPriceMethodValue(activity.priceMethod, activity.allProductsValue)
  const sharedCount = memberSceneOverrides(
    Object.keys(activity.sceneValues ?? {}),
    uniformDiscountItem(activity),
  ).length
  const sharedText = sharedCount > 0 ? `，${sharedCount}个业务单独设置` : ''
  let count: string
  if (activity.productScope === 'all') {
    count = `全部商品${sharedCount > 0 ? `默认${uniformValue}` : uniformValue}${sharedText}`
  } else if (activity.productSelectionMode === 'exclude') {
    count = `排除${activity.productIds.length}个商品，其余${sharedCount > 0 ? `默认${uniformValue}` : uniformValue}${sharedText}`
  } else {
    const sceneCount = memberSceneOverrideCount(activity)
    count = sceneCount > 0
      ? `${activity.productItems.length}个商品，其中 ${sceneCount} 个有业务单独设置`
      : `${activity.productItems.length}个商品`
  }
  return `${methodLabel} · ${count}`
}

/** 列表「会员类型」列用的短受众名 */
export function getMemberPriceAudienceShortLabel(audienceType: MemberPriceAudienceType): string {
  switch (audienceType) {
    case 'all_level':
      return '全部等级'
    case 'specified_level':
      return '指定等级'
    case 'all_stored_value':
      return '全部储值'
    case 'specified_stored_value':
      return '指定储值'
    case 'any_physical_card':
      return '任意实体卡'
    case 'specified_physical_card':
      return '指定实体卡'
    case 'paid_member_card_user':
      return '付费会员'
    default:
      return getMemberPriceAudienceLabel(audienceType)
  }
}

/** 列表展示用的具体对象名称（等级 / 储值等级 / 实体卡） */
export function getMemberPriceAudienceTargetLabels(activity: MemberPriceActivityForm): string[] {
  const audienceType = activity.audienceType ?? 'specified_level'
  if (!needsMemberPriceTargets(audienceType)) return []
  const groups = activity.groups?.length ? activity.groups : []
  if (groups.length === 0) return []
  if (supportsMemberPriceMultiGroup(audienceType)) {
    return groups.map((g, i) => getMemberPriceGroupLabel(audienceType, g, i))
  }
  const map = new Map(getMemberPriceTargetOptions(audienceType).map((o) => [o.id, o.label]))
  return (groups[0]?.targetIds ?? []).map((id) => map.get(id) ?? id)
}

export function getMemberLevelsSummary(activity: MemberPriceActivityForm): string {
  const audienceType = activity.audienceType ?? 'specified_level'
  if (!needsMemberPriceTargets(audienceType)) {
    return getMemberPriceAudienceLabel(audienceType)
  }
  const labels = getMemberPriceAudienceTargetLabels(activity)
  if (labels.length === 0) return '未选择'
  return labels.join('、')
}

export function getMemberPriceGroupsSummary(activity: MemberPriceActivityForm): string {
  const audienceType = activity.audienceType ?? 'specified_level'
  const groups = activity.groups?.length ? activity.groups : []
  if (!supportsMemberPriceMultiGroup(audienceType)) {
    const g = groups[0]
    if (!g) return getMemberPriceAudienceLabel(audienceType)
    return `${getMemberPriceAudienceLabel(audienceType)} · ${formatRuleSummary(groupToProductCore(g))}`
  }
  if (groups.length === 0) return `未选择${getMemberPriceGroupUnitLabel(audienceType)}`
  return groups
    .map((g, i) => `${getMemberPriceGroupLabel(audienceType, g, i)} · ${formatRuleSummary(groupToProductCore(g))}`)
    .join('；')
}

export function computePublishStatus(activity: MemberPriceActivityForm): ActivityStatus {
  const now = Date.now()
  const start = new Date(activity.startTime.replace(/-/g, '/')).getTime()
  const end = new Date(activity.endTime.replace(/-/g, '/')).getTime()
  if (now < start) return 'not_started'
  if (now > end) return 'ended'
  return 'in_progress'
}

export function getProductSummary(activity: MemberPriceProductCoreFields): string {
  if (activity.productScope === 'all') return '全部商品'
  const count = activity.productIds.length
  if (count === 0) return '未选择'
  if (activity.productSelectionMode === 'exclude') return `${count}个商品不参与`
  return `${count}个商品`
}

export function getProductCount(activity: MemberPriceProductCoreFields): number {
  if (activity.productScope === 'all') return products.length
  if (activity.productSelectionMode === 'exclude') {
    return Math.max(products.length - activity.productIds.length, 0)
  }
  return activity.productIds.length
}

export function getStoreSummary(activity: { storeScope: StoreScope; storeIds: string[] }): string {
  if (activity.storeScope === 'all') return '全部门店'
  const count = activity.storeIds.length
  if (count === 0) return '未选择门店'
  if (activity.storeScope === 'partial_exclude') return `${count}个门店不参与`
  return `${count}个门店参与`
}

export function getStoreScopeLabel(activity: { storeScope: StoreScope; storeIds: string[] }): string {
  if (activity.storeScope === 'all') return '全部门店'
  if (activity.storeScope === 'partial_exclude') return `指定门店不参与（${activity.storeIds.length}家）`
  return `指定门店参与（${activity.storeIds.length}家）`
}

export function getProductScopeLabel(activity: MemberPriceProductCoreFields): string {
  if (activity.productScope === 'all') return '全部商品'
  if (activity.productSelectionMode === 'exclude') {
    return `指定商品不参与（${activity.productIds.length}个）`
  }
  return `指定商品参与（${activity.productIds.length}个）`
}

export function getChannelSummary(activity: { channels: string[] }): string {
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

/** 实际参与活动的商品：反选模式下为所选商品之外的其余商品 */
export function getActivityProducts(activity: MemberPriceProductCoreFields) {
  if (activity.productScope === 'all') return products
  if (activity.productSelectionMode === 'exclude') {
    return products.filter((p) => !activity.productIds.includes(p.id))
  }
  return products.filter((p) => activity.productIds.includes(p.id))
}

export function getActivityStores(activity: { storeIds: string[] }) {
  return stores.filter((s) => activity.storeIds.includes(s.id))
}

/* ================= 活动间冲突校验（会员价同类） ================= */

const MEMBER_PRICE_CONFLICT_STATUSES: ActivityStatus[] = [
  'pending',
  'not_started',
  'in_progress',
  'paused',
]

/** 展开实际生效门店；反选先展开再比对 */
export function resolveMemberPriceStoreIds(activity: MemberPriceActivityForm): string[] {
  const openStores = stores.filter((s) => s.status === 'open')
  if (activity.storeScope === 'all') return openStores.map((s) => s.id)
  if (activity.storeScope === 'partial_exclude') {
    return openStores.filter((s) => !activity.storeIds.includes(s.id)).map((s) => s.id)
  }
  return activity.storeIds.filter((id) => openStores.some((s) => s.id === id))
}

/** 展开实际生效商品（多方案取并集） */
export function resolveMemberPriceProductIds(activity: MemberPriceActivityForm): string[] {
  const groups = activity.groups?.length ? activity.groups : null
  if (!groups) return getActivityProducts(activity).map((p) => p.id)
  const ids = new Set<string>()
  for (const g of groups) {
    getActivityProducts(groupToProductCore(g)).forEach((p) => ids.add(p.id))
  }
  return [...ids]
}

function parseMemberPriceTime(value: string): number {
  return new Date(value.replace(/-/g, '/')).getTime()
}

export function memberPriceTimeOverlaps(a: MemberPriceActivityForm, b: MemberPriceActivityForm): boolean {
  const aStart = parseMemberPriceTime(a.startTime)
  const aEnd = parseMemberPriceTime(a.endTime)
  const bStart = parseMemberPriceTime(b.startTime)
  const bEnd = parseMemberPriceTime(b.endTime)
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return false
  return aStart < bEnd && bStart < aEnd
}

function audienceFamily(type: MemberPriceAudienceType): 'level' | 'stored' | 'physical' | 'paid' {
  if (type === 'all_level' || type === 'specified_level') return 'level'
  if (type === 'all_stored_value' || type === 'specified_stored_value') return 'stored'
  if (type === 'any_physical_card' || type === 'specified_physical_card') return 'physical'
  return 'paid'
}

function collectAudienceTargets(activity: MemberPriceActivityForm): string[] {
  const type = activity.audienceType ?? 'specified_level'
  if (!needsMemberPriceTargets(type)) return ['*']
  const groups = activity.groups?.length
    ? activity.groups
    : [createEmptyMemberPriceOfferGroup({ targetIds: activity.memberLevels ?? [] })]
  return [...new Set(groups.flatMap((g) => g.targetIds))]
}

/** 优惠会员是否会命中同一批顾客子集 */
export function memberPriceAudienceOverlaps(a: MemberPriceActivityForm, b: MemberPriceActivityForm): boolean {
  const aType = a.audienceType ?? 'specified_level'
  const bType = b.audienceType ?? 'specified_level'
  if (audienceFamily(aType) !== audienceFamily(bType)) return false
  if (aType === 'paid_member_card_user' || bType === 'paid_member_card_user') {
    return aType === 'paid_member_card_user' && bType === 'paid_member_card_user'
  }
  const aAll = !needsMemberPriceTargets(aType)
  const bAll = !needsMemberPriceTargets(bType)
  if (aAll || bAll) return true
  const aTargets = new Set(collectAudienceTargets(a))
  return collectAudienceTargets(b).some((id) => aTargets.has(id))
}

function isPausedStillActive(activity: MemberPriceActivityForm, now = Date.now()): boolean {
  if (activity.status !== 'paused') return true
  const end = parseMemberPriceTime(activity.endTime)
  return Number.isFinite(end) && end > now
}

export function participatesInMemberPriceConflict(activity: MemberPriceActivityForm, now = Date.now()): boolean {
  if (!MEMBER_PRICE_CONFLICT_STATUSES.includes(activity.status)) return false
  if (activity.status === 'paused' && !isPausedStillActive(activity, now)) return false
  return true
}

export interface MemberPriceConflict {
  activity: MemberPriceActivityForm
  storeIds: string[]
  productIds: string[]
  channelIds: string[]
  orderTypeIds: string[]
  audienceHint: string
  storeNames: string[]
  productNames: string[]
}

/**
 * 同类会员价冲突：时间 ∩ 门店 ∩ 商品 ∩ 渠道 ∩ 场景 ∩ 优惠会员 均有交集。
 * 仅与待发布 / 未开始 / 进行中 / 暂停（未过期）比对；草稿、已结束、已作废不参与。
 */
export function findMemberPriceConflicts(
  target: MemberPriceActivityForm,
  all: MemberPriceActivityForm[],
  now = Date.now(),
): MemberPriceConflict[] {
  const targetStores = new Set(resolveMemberPriceStoreIds(target))
  const targetProducts = new Set(resolveMemberPriceProductIds(target))
  const targetChannels = new Set(target.channels)
  const targetScenes = new Set(target.orderTypes)
  const conflicts: MemberPriceConflict[] = []

  for (const other of all) {
    if (other.id === target.id) continue
    if (!participatesInMemberPriceConflict(other, now)) continue
    if (!memberPriceTimeOverlaps(target, other)) continue
    if (!memberPriceAudienceOverlaps(target, other)) continue

    const storeHits = resolveMemberPriceStoreIds(other).filter((id) => targetStores.has(id))
    if (storeHits.length === 0) continue
    const productHits = resolveMemberPriceProductIds(other).filter((id) => targetProducts.has(id))
    if (productHits.length === 0) continue
    const channelHits = other.channels.filter((id) => targetChannels.has(id))
    if (channelHits.length === 0) continue
    const sceneHits = other.orderTypes.filter((id) => targetScenes.has(id))
    if (sceneHits.length === 0) continue

    const audienceHint = needsMemberPriceTargets(other.audienceType ?? 'specified_level')
      ? formatMemberPriceTargetIds(other.audienceType ?? 'specified_level', collectAudienceTargets(other))
      : getMemberPriceAudienceLabel(other.audienceType ?? 'specified_level')

    conflicts.push({
      activity: other,
      storeIds: storeHits,
      productIds: productHits,
      channelIds: channelHits,
      orderTypeIds: sceneHits,
      audienceHint,
      storeNames: storeHits.slice(0, 5).map((id) => stores.find((s) => s.id === id)?.name ?? id),
      productNames: productHits.slice(0, 5).map((id) => products.find((p) => p.id === id)?.name ?? id),
    })
  }
  return conflicts
}

/** 从当前活动中排除冲突门店（就地解除门店维度重叠） */
export function excludeConflictStoresFromMemberPrice(
  activity: MemberPriceActivityForm,
  storeIdsToExclude: string[],
): MemberPriceActivityForm {
  const exclude = [...new Set(storeIdsToExclude)]
  if (exclude.length === 0) return activity
  if (activity.storeScope === 'all') {
    return { ...activity, storeScope: 'partial_exclude', storeIds: exclude }
  }
  if (activity.storeScope === 'partial_exclude') {
    return { ...activity, storeIds: [...new Set([...activity.storeIds, ...exclude])] }
  }
  const nextIds = activity.storeIds.filter((id) => !exclude.includes(id))
  return { ...activity, storeIds: nextIds }
}

export function formatMemberPriceConflictSummary(conflicts: MemberPriceConflict[]): string {
  if (conflicts.length === 0) return ''
  const first = conflicts[0]
  const more = conflicts.length > 1 ? `（另有 ${conflicts.length - 1} 个活动同样重叠）` : ''
  return `与「${first.activity.id} · ${first.activity.name}」在时间、门店、商品、渠道与优惠会员上范围重叠${more}`
}

export interface MemberPriceConflictToken {
  id: string
  label: string
  /** 是否落在重叠集合内 */
  hit: boolean
}

export interface MemberPriceConflictCompareRow {
  key: 'time' | 'cycle' | 'audience' | 'store' | 'product' | 'channel' | 'scene'
  label: string
  /** 跳转向导步骤：0 基础 / 1 门店 / 2 商品 */
  step: 0 | 1 | 2
  currentSummary: string
  otherSummary: string
  currentTokens: MemberPriceConflictToken[]
  otherTokens: MemberPriceConflictToken[]
  overlapTokens: MemberPriceConflictToken[]
  /** 重叠列文案；门店/商品用简洁「共 N」+ 查看列表 */
  overlapHint: string
  /** 是否在重叠列展示「查看列表」并锚定底部明细 */
  listKind?: 'store' | 'product'
}

const CHANNEL_LABEL_MAP: Record<string, string> = {
  h5: '手机网页',
  wechat: '微信',
  alipay: '支付宝',
  app: 'App',
  pos: 'POS',
  douyin: '抖音',
  third_party: '第三方外卖',
  other: '其他',
}

function channelTokens(ids: string[], hitIds: Set<string>): MemberPriceConflictToken[] {
  return ids.map((id) => ({
    id,
    label: CHANNEL_LABEL_MAP[id] ?? id,
    hit: hitIds.has(id),
  }))
}

function sceneTokens(ids: string[], hitIds: Set<string>): MemberPriceConflictToken[] {
  return ids.map((id) => ({
    id,
    label: orderTypeLabel(id),
    hit: hitIds.has(id),
  }))
}

function formatOverlapTime(a: MemberPriceActivityForm, b: MemberPriceActivityForm): string {
  const aStart = parseMemberPriceTime(a.startTime)
  const aEnd = parseMemberPriceTime(a.endTime)
  const bStart = parseMemberPriceTime(b.startTime)
  const bEnd = parseMemberPriceTime(b.endTime)
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return '-'
  const start = Math.max(aStart, bStart)
  const end = Math.min(aEnd, bEnd)
  if (start >= end) return '-'
  const fmt = (ms: number) => {
    const d = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return `${fmt(start)} ~ ${fmt(end)}`
}

/** 当前活动 vs 冲突活动：结构化对照行（重叠枚举单独列出） */
export function buildMemberPriceConflictCompare(
  current: MemberPriceActivityForm,
  conflict: MemberPriceConflict,
): MemberPriceConflictCompareRow[] {
  const other = conflict.activity
  const currentAudienceType = current.audienceType ?? 'specified_level'
  const otherAudienceType = other.audienceType ?? 'specified_level'
  const currentAudienceIds = collectAudienceTargets(current)
  const otherAudienceIds = collectAudienceTargets(other)
  const audienceHit = new Set(
    !needsMemberPriceTargets(currentAudienceType) || !needsMemberPriceTargets(otherAudienceType)
      ? (needsMemberPriceTargets(otherAudienceType) ? otherAudienceIds : currentAudienceIds)
      : currentAudienceIds.filter((id) => otherAudienceIds.includes(id)),
  )
  if (!needsMemberPriceTargets(currentAudienceType) && !needsMemberPriceTargets(otherAudienceType)) {
    audienceHit.add(currentAudienceType)
  }

  const currentStoreIds = resolveMemberPriceStoreIds(current)
  const otherStoreIds = resolveMemberPriceStoreIds(other)

  const currentProductIds = resolveMemberPriceProductIds(current)
  const otherProductIds = resolveMemberPriceProductIds(other)

  const channelHit = new Set(conflict.channelIds)
  const sceneHit = new Set(conflict.orderTypeIds)

  const overlapTime = formatOverlapTime(current, other)
  const audienceOverlapTokens: MemberPriceConflictToken[] = !needsMemberPriceTargets(currentAudienceType) && !needsMemberPriceTargets(otherAudienceType)
    ? [{ id: currentAudienceType, label: getMemberPriceAudienceLabel(currentAudienceType), hit: true }]
    : [...audienceHit].map((id) => ({
        id,
        label: needsMemberPriceTargets(otherAudienceType)
          ? (formatMemberPriceTargetIds(otherAudienceType, [id]) || id)
          : (formatMemberPriceTargetIds(currentAudienceType, [id]) || getMemberPriceAudienceLabel(currentAudienceType)),
        hit: true,
      }))

  const cycleLabel = (a: MemberPriceActivityForm) => {
    const cycle = a.cycleType === 'weekly' ? '每周' : a.cycleType === 'monthly' ? '每月' : '每天'
    const slot = a.timeSlotType === 'specific' ? '指定时间段' : '全天'
    return `${cycle} · ${slot}`
  }
  const cycleOverlap =
    current.cycleType === other.cycleType && current.timeSlotType === other.timeSlotType
      ? (current.timeSlotType === 'all_day' ? '全天重叠' : cycleLabel(current))
      : '周期/时段有交集'

  return [
    {
      key: 'time',
      label: '参与时间',
      step: 0,
      currentSummary: `${current.startTime.slice(0, 10)} 至 ${current.endTime.slice(0, 10)}`,
      otherSummary: `${other.startTime.slice(0, 10)} 至 ${other.endTime.slice(0, 10)}`,
      currentTokens: [],
      otherTokens: [],
      overlapTokens: [],
      overlapHint: overlapTime.replace(' ~ ', ' 至 '),
    },
    {
      key: 'cycle',
      label: '活动周期及子时段',
      step: 0,
      currentSummary: cycleLabel(current),
      otherSummary: cycleLabel(other),
      currentTokens: [],
      otherTokens: [],
      overlapTokens: [],
      overlapHint: cycleOverlap,
    },
    {
      key: 'channel',
      label: '参与渠道',
      step: 0,
      currentSummary: getChannelSummary(current),
      otherSummary: getChannelSummary(other),
      currentTokens: [],
      otherTokens: [],
      overlapTokens: channelTokens(conflict.channelIds, channelHit).map((t) => ({ ...t, hit: true })),
      overlapHint: '',
    },
    {
      key: 'scene',
      label: '业务场景',
      step: 0,
      currentSummary: current.orderTypes.map(orderTypeLabel).join('、') || '-',
      otherSummary: other.orderTypes.map(orderTypeLabel).join('、') || '-',
      currentTokens: [],
      otherTokens: [],
      overlapTokens: sceneTokens(conflict.orderTypeIds, sceneHit).map((t) => ({ ...t, hit: true })),
      overlapHint: '',
    },
    {
      key: 'audience',
      label: '优惠会员',
      step: 0,
      currentSummary: needsMemberPriceTargets(currentAudienceType)
        ? `${getMemberPriceAudienceLabel(currentAudienceType)} · ${formatMemberPriceTargetIds(currentAudienceType, currentAudienceIds)}`
        : getMemberPriceAudienceLabel(currentAudienceType),
      otherSummary: conflict.audienceHint
        ? (needsMemberPriceTargets(otherAudienceType)
          ? `${getMemberPriceAudienceLabel(otherAudienceType)} · ${conflict.audienceHint}`
          : conflict.audienceHint)
        : getMemberPriceAudienceLabel(otherAudienceType),
      currentTokens: [],
      otherTokens: [],
      overlapTokens: audienceOverlapTokens,
      overlapHint: '',
    },
    {
      key: 'store',
      label: '参与门店',
      step: 1,
      currentSummary: currentStoreIds.length >= stores.filter((s) => s.status === 'open').length
        ? '全部门店'
        : `共 ${currentStoreIds.length} 家`,
      otherSummary: otherStoreIds.length >= stores.filter((s) => s.status === 'open').length
        ? '全部门店'
        : `共 ${otherStoreIds.length} 家`,
      currentTokens: [],
      otherTokens: [],
      overlapTokens: [],
      overlapHint: `共 ${conflict.storeIds.length} 家`,
      listKind: 'store',
    },
    {
      key: 'product',
      label: '参与商品',
      step: 2,
      currentSummary: currentProductIds.length >= products.length ? '全部商品' : `共 ${currentProductIds.length} 个`,
      otherSummary: otherProductIds.length >= products.length ? '全部商品' : `共 ${otherProductIds.length} 个`,
      currentTokens: [],
      otherTokens: [],
      overlapTokens: [],
      overlapHint: `共 ${conflict.productIds.length} 个`,
      listKind: 'product',
    },
  ]
}

export function formatCreatorDisplay(activity: { creator: string; creatorPhone: string; creatorOrg: string }) {
  const phone = activity.creatorPhone || getCreatorProfile(activity.creator).phone
  const org = activity.creatorOrg || getCreatorProfile(activity.creator).org
  return { maskedPhone: maskPhone(phone), org }
}

export function getActivityRemainingLabel(activity: MemberPriceActivityForm): string | null {
  if (activity.status !== 'in_progress') return null
  const end = new Date(activity.endTime.replace(/-/g, '/'))
  const diffMs = end.getTime() - Date.now()
  if (diffMs < 0) return null
  const days = Math.ceil(diffMs / 86_400_000)
  if (days === 0) return '今日结束'
  return `剩余 ${days} 天`
}

export function appendActivityLog<
  T extends { creatorPhone: string; creatorOrg: string; operationLogs: ActivityOperationLog[] },
>(
  activity: T,
  action: string,
  detail?: string,
  operator?: { phone: string; org: string },
): T {
  const op = operator ?? { phone: activity.creatorPhone, org: activity.creatorOrg }
  const now = formatActivityDateTime()
  const log = createOperationLog(action, op, detail, now)
  return {
    ...activity,
    updatedAt: now,
    operationLogs: [log, ...(activity.operationLogs ?? [])],
  }
}

export function cloneActivity(activity: MemberPriceActivityForm): MemberPriceActivityForm {
  const now = formatActivityDateTime()
  const operator = { phone: activity.creatorPhone, org: activity.creatorOrg }
  return {
    ...activity,
    id: `MP${Date.now()}`,
    name: `${activity.name}(副本)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    operationLogs: [
      createOperationLog('复制活动', operator, `从「${activity.name}」复制创建`),
    ],
  }
}

/**
 * 优惠方式预填默认值：
 * - 折扣 9.9 折
 * - 立减 0.01 元
 * - 特价 = 商品售价；无售价时返回 NaN（表单展示为空，须手填）
 */
export function defaultValueForMethod(method: MemberPriceMethod, salePrice?: number): number {
  if (method === 'discount') return 9.9
  if (method === 'fixed_reduction') return 0.01
  if (salePrice != null && Number.isFinite(salePrice) && salePrice >= 0) return salePrice
  return Number.NaN
}

export function formatMemberPriceInputValue(value: number | null | undefined): string | number {
  return value != null && Number.isFinite(value) ? value : ''
}

export function syncProductItems<T extends MemberPriceProductCoreFields>(
  activity: T,
  productIds: string[],
  resetValues = false,
): T {
  const prev = new Map(activity.productItems.map((item) => [item.productId, item]))
  const productItems = productIds.map((productId) => {
    const old = prev.get(productId)
    const salePrice = products.find((p) => p.id === productId)?.price
    const defaultVal = defaultValueForMethod(activity.priceMethod, salePrice)
    return {
      productId,
      value: resetValues ? defaultVal : (old?.value ?? defaultVal),
      sceneValues: resetValues ? {} : (old?.sceneValues ?? {}),
    }
  })
  return { ...activity, productIds, productItems }
}

export function validateProductItemValue(
  method: MemberPriceMethod,
  value: number,
  originalPrice?: number,
): string | null {
  if (!Number.isFinite(value)) return '请填写有效的会员价'
  if (method === 'discount') {
    if (value < 0.1 || value > 9.9) return '折扣须在 0.1～9.9 折之间'
  } else if (method === 'fixed_reduction') {
    if (value <= 0) return '减价金额须大于0'
    if (originalPrice != null && value >= originalPrice) return '减价金额须小于商品原价'
  } else {
    if (value < 0) return '固定价格不能为负'
    if (originalPrice != null && value > originalPrice) return '固定价格不能高于商品原价'
  }
  return null
}

/** 折扣输入越界时钳到合法区间；金额类仅保证非负 */
export function clampMemberPriceValue(method: MemberPriceMethod, value: number): number {
  if (!Number.isFinite(value)) return value
  if (method === 'discount') {
    const rounded = Math.round(value * 10) / 10
    return Math.min(9.9, Math.max(0.1, rounded))
  }
  return Math.max(0, value)
}

/**
 * 解析优惠输入：空串返回 null；非法/越界返回钳制后的值并附带提示文案。
 * 调用方应用返回值写入，并按需 toast 提示。
 */
export function normalizeMemberPriceInput(
  method: MemberPriceMethod,
  raw: string,
): { value: number | null; warning?: string } {
  if (raw.trim() === '') return { value: null }
  const num = Number(raw)
  if (!Number.isFinite(num)) return { value: null, warning: '请填写有效的会员价' }
  const warning = validateProductItemValue(method, num) ?? undefined
  if (!warning) return { value: num }
  return { value: clampMemberPriceValue(method, num), warning }
}

function validateLimitFields(activity: MemberPriceActivityForm): string | null {
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

export type MemberPriceHealthIssue = { step: number; message: string }

/** 单步全部问题（页脚体检 / 步骤副标题同源） */
export function collectMemberPriceStepIssues(
  activity: MemberPriceActivityForm,
  step: number,
): string[] {
  const issues: string[] = []
  if (step === 0) {
    if (!activity.name.trim()) issues.push('请填写活动名称')
    if (activity.name.length > 30) issues.push('活动名称不超过30字')
    if (activity.title.length > 20) issues.push('活动标题不超过20字')
    if (activity.tag.length > 20) issues.push('商品促销标签不超过20字')
    if (activity.description.length > 500) issues.push('活动说明不超过500字')
    if (activity.activityCode.length > 30) issues.push('活动编码不超过30字')
    if (!activity.startTime || !activity.endTime) issues.push('请填写活动时间')
    else if (new Date(activity.endTime) <= new Date(activity.startTime)) {
      issues.push('结束时间须晚于开始时间')
    }
    if (activity.channels.length === 0) issues.push('请至少选择一个参与渠道')
    if (activity.orderTypes.length === 0) issues.push('请至少选择一个业务场景')
    const limitErr = validateLimitFields(activity)
    if (limitErr) issues.push(limitErr)
  }
  if (step === 1) {
    if (activity.storeScope !== 'all' && activity.storeIds.length === 0) {
      issues.push('请至少选择一个门店')
    }
  }
  if (step === 2) {
    const audienceType = activity.audienceType ?? 'specified_level'
    const groups = activity.groups?.length
      ? activity.groups
      : supportsMemberPriceMultiGroup(audienceType)
        ? []
        : [createEmptyMemberPriceOfferGroup({ targetIds: activity.memberLevels ?? [] })]
    if (supportsMemberPriceMultiGroup(audienceType) && groups.length === 0) {
      issues.push(`请至少选择一个${getMemberPriceGroupUnitLabel(audienceType)}`)
    } else if (groups.length === 0) {
      issues.push('请完成参与商品及优惠配置')
    }
    if (
      (activity.paymentLimitType ?? 'unlimited') === 'limited'
      && !(activity.paymentMethodIds ?? []).length
    ) {
      issues.push('请至少勾选一种支付方式')
    }
    const maxGroups = getMemberPriceMaxGroups(audienceType)
    if (supportsMemberPriceMultiGroup(audienceType) && groups.length > maxGroups) {
      issues.push(`${getMemberPriceGroupUnitLabel(audienceType)}组最多${maxGroups}个`)
    }
    const exclusiveErr = validateMemberPriceTargetExclusive(audienceType, groups)
    if (exclusiveErr) issues.push(exclusiveErr)
    for (let i = 0; i < groups.length; i++) {
      const err = validateMemberPriceOfferGroup(audienceType, groups[i], i, activity.orderTypes)
      if (err) issues.push(err)
    }
  }
  return issues
}

export function validateStep(activity: MemberPriceActivityForm, step: number): string | null {
  return collectMemberPriceStepIssues(activity, step)[0] ?? null
}

/** 全流程体检条目（不含末步预览） */
export function collectMemberPriceHealthIssues(
  activity: MemberPriceActivityForm,
): MemberPriceHealthIssue[] {
  const out: MemberPriceHealthIssue[] = []
  for (let step = 0; step <= 2; step++) {
    for (const message of collectMemberPriceStepIssues(activity, step)) {
      out.push({ step, message })
    }
  }
  return out
}

/** 方案是否尚未配齐必填（多方案 Tab 空态） */
export function isMemberPriceGroupIncomplete(
  audienceType: MemberPriceAudienceType,
  group: MemberPriceOfferGroup,
  orderTypes: string[],
): boolean {
  return Boolean(validateMemberPriceOfferGroup(audienceType, group, 0, orderTypes))
}

/** 点单预览样例价（示意，非真实结算） */
export function previewMemberSamplePrice(
  method: MemberPriceMethod,
  value: number,
  originalPrice = 18,
): number {
  if (!Number.isFinite(value)) return originalPrice
  if (method === 'discount') {
    return Math.round(((originalPrice * value) / 10) * 100) / 100
  }
  if (method === 'fixed_reduction') {
    return Math.max(0, Math.round((originalPrice - value) * 100) / 100)
  }
  return Math.round(value * 100) / 100
}

export function matchesFilters(activity: MemberPriceActivityForm, filters: MemberPriceListFilters): boolean {
  if (filters.status !== 'all' && activity.status !== filters.status) return false
  const groupMethods = (activity.groups?.length ? activity.groups : [{ priceMethod: activity.priceMethod }])
    .map((g) => g.priceMethod)
  if (filters.priceMethod !== 'all' && !groupMethods.includes(filters.priceMethod) && activity.priceMethod !== filters.priceMethod) {
    return false
  }
  if (filters.memberLevel !== 'all') {
    const levelIds = new Set<string>([
      ...(activity.memberLevels ?? []),
      ...(activity.groups ?? []).flatMap((g) => g.targetIds),
    ])
    if (activity.audienceType === 'all_level') {
      // 全部等级：任意等级筛选都命中
    } else if (!levelIds.has(filters.memberLevel)) {
      return false
    }
  }
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    if (!activity.name.toLowerCase().includes(kw) && !activity.id.toLowerCase().includes(kw)) return false
  }
  if (!matchesActivityProductFilters((activity.groups?.length ? activity.groups.flatMap((group) => getActivityProducts(groupToProductCore(group))) : getActivityProducts(activity)), filters)) return false
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
  activities: MemberPriceActivityForm[],
  filters: MemberPriceListFilters,
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

export function migrateMemberPriceActivity(raw: Record<string, unknown>): MemberPriceActivityForm {
  const defaults = createEmptyMemberPriceActivity()
  const legacy = raw as Partial<MemberPriceActivityForm>
  const productIds = legacy.productIds ?? legacy.productItems?.map((i) => i.productId) ?? defaults.productIds
  const priceMethod = legacy.priceMethod ?? defaults.priceMethod
  const productItems = legacy.productItems?.length
    ? legacy.productItems
    : productIds.map((productId) => ({
        productId,
        value: defaultValueForMethod(priceMethod),
      }))
  const memberLevels = (legacy.memberLevels as MemberLevelId[] | undefined)?.length
    ? legacy.memberLevels as MemberLevelId[]
    : defaults.memberLevels
  const productScope =
    legacy.productSelectionMode === 'exclude' && legacy.productScope === 'all'
      ? 'partial'
      : legacy.productScope ?? defaults.productScope
  const allProductsValue =
    legacy.allProductsValue ?? defaultValueForMethod(priceMethod)
  const groups =
    legacy.groups?.length
      ? legacy.groups
      : [
          createEmptyMemberPriceOfferGroup({
            targetIds: memberLevels,
            priceMethod,
            productItems,
            allProductsValue,
            productScope,
            productIds,
            productSelectionMode: legacy.productSelectionMode ?? defaults.productSelectionMode,
          }),
        ]
  const audienceType =
    legacy.audienceType ??
    (memberLevels.length >= MEMBER_LEVELS.length ? 'all_level' : 'specified_level')
  const orderTypes = normalizeMemberPriceOrderTypes(
    (legacy.orderTypes as string[] | undefined) ?? defaults.orderTypes,
  )
  const paymentDefaults = getMemberPricePaymentDefaultsForAudience(audienceType)
  const paymentLimitType = legacy.paymentLimitType ?? paymentDefaults.paymentLimitType
  const paymentMethodIds = legacy.paymentMethodIds
    ? [...legacy.paymentMethodIds]
    : [...paymentDefaults.paymentMethodIds]
  const paymentAmountLimit = legacy.paymentAmountLimit ?? paymentDefaults.paymentAmountLimit
  const migratedProductItems = productItems.map(normalizeMemberPriceProductItem)
  const migratedGroups = normalizeMemberPriceGroupsByAudience(
    audienceType,
    groups.map((group) => ({
      ...group,
      productItems: (group.productItems ?? []).map(normalizeMemberPriceProductItem),
      sceneValues: remapMemberPriceSceneValues(group.sceneValues) ?? group.sceneValues,
    })),
  )
  return syncMemberPriceActivityMirrors({
    ...defaults,
    ...legacy,
    audienceType,
    paymentLimitType,
    paymentMethodIds,
    paymentAmountLimit,
    orderTypes,
    groups: migratedGroups,
    memberLevels,
    priceMethod,
    productIds,
    productItems: migratedProductItems,
    allProductsValue,
    productScope,
    memberPriceTagDisplay: legacy.memberPriceTagDisplay ?? defaults.memberPriceTagDisplay,
    creatorPhone: legacy.creatorPhone ?? getCreatorProfile(legacy.creator ?? defaults.creator).phone,
    creatorOrg: legacy.creatorOrg ?? getCreatorProfile(legacy.creator ?? defaults.creator).org,
    updatedAt: legacy.updatedAt ?? legacy.createdAt ?? defaults.createdAt,
    operationLogs: (legacy.operationLogs as ActivityOperationLog[] | undefined)?.length
      ? legacy.operationLogs as ActivityOperationLog[]
      : defaults.operationLogs,
  })
}
