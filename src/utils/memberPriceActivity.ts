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
  createEmptyMemberPriceActivity,
  createEmptyMemberPriceOfferGroup,
} from '../mockMemberPriceData'
import {
  MEMBER_LEVELS,
  ORDER_TYPES,
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

export const MEMBER_PRICE_MULTI_GROUP_AUDIENCES: MemberPriceAudienceType[] = [
  'specified_level',
  'specified_stored_value',
  'specified_physical_card',
]

export const MAX_MEMBER_PRICE_GROUPS = 10

export function supportsMemberPriceMultiGroup(audienceType: MemberPriceAudienceType): boolean {
  return MEMBER_PRICE_MULTI_GROUP_AUDIENCES.includes(audienceType)
}

export function needsMemberPriceTargets(audienceType: MemberPriceAudienceType): boolean {
  return supportsMemberPriceMultiGroup(audienceType)
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

/** 多方案标签主文案：方案1 / 方案2 … */
export function getMemberPriceOfferSchemeLabel(index: number): string {
  return `方案${index + 1}`
}

/** 标签副文案：已选会员摘要（过长时截断） */
export function formatMemberPriceGroupTabSummary(
  audienceType: MemberPriceAudienceType,
  targetIds: string[],
  maxLabels = 2,
): string {
  if (!needsMemberPriceTargets(audienceType)) return ''
  if (targetIds.length === 0) return '未选择'
  const map = new Map(getMemberPriceTargetOptions(audienceType).map((o) => [o.id, o.label]))
  const labels = targetIds.map((id) => map.get(id) ?? id)
  if (labels.length <= maxLabels) return labels.join('、')
  return `${labels.slice(0, maxLabels).join('、')}等${labels.length}项`
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
    ? `${getMemberPriceOfferSchemeLabel(groupIndex)}：`
    : ''
  if (needsMemberPriceTargets(audienceType) && group.targetIds.length === 0) {
    return `${prefix}请至少选择一个${getMemberPriceTargetFieldLabel(audienceType).replace('选择', '')}`
  }
  if (needsMemberPriceTargets(audienceType)) {
    const allCount = getMemberPriceTargetOptions(audienceType).length
    if (allCount > 0 && group.targetIds.length >= allCount) {
      return `${prefix}不可全选，如需覆盖全部请改选「${getMemberPriceAllAudienceHint(audienceType)}」`
    }
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

/** 方案间会员子集不可重复 */
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
        return `「${labelMap.get(id) ?? id}」不可在多个方案中重复选择（已用于${getMemberPriceOfferSchemeLabel(prev)}与${getMemberPriceOfferSchemeLabel(i)}）`
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
  return ORDER_TYPES.find((item) => item.id === sceneId)?.label ?? sceneId
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

export function getMemberLevelsSummary(activity: MemberPriceActivityForm): string {
  const audienceType = activity.audienceType ?? 'specified_level'
  if (!needsMemberPriceTargets(audienceType)) {
    return getMemberPriceAudienceLabel(audienceType)
  }
  const groups = activity.groups?.length ? activity.groups : []
  if (groups.length === 0) return '未选择'
  if (groups.length === 1) {
    return formatMemberPriceTargetIds(audienceType, groups[0].targetIds)
  }
  return groups
    .map((g, i) => `${getMemberPriceOfferSchemeLabel(i)}：${formatMemberPriceTargetIds(audienceType, g.targetIds)}`)
    .join('；')
}

export function getMemberPriceGroupsSummary(activity: MemberPriceActivityForm): string {
  const audienceType = activity.audienceType ?? 'specified_level'
  const groups = activity.groups?.length ? activity.groups : []
  if (!supportsMemberPriceMultiGroup(audienceType)) {
    const g = groups[0]
    if (!g) return getMemberPriceAudienceLabel(audienceType)
    return `${getMemberPriceAudienceLabel(audienceType)} · ${formatRuleSummary(groupToProductCore(g))}`
  }
  if (groups.length === 0) return '未配置方案'
  return groups
    .map((g, i) => {
      const targets = formatMemberPriceTargetIds(audienceType, g.targetIds)
      return `${getMemberPriceOfferSchemeLabel(i)}（${targets}）· ${formatRuleSummary(groupToProductCore(g))}`
    })
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

export function defaultValueForMethod(method: MemberPriceMethod): number {
  if (method === 'discount') return 8
  if (method === 'fixed_reduction') return 5
  return 9.9
}

export function syncProductItems<T extends MemberPriceProductCoreFields>(
  activity: T,
  productIds: string[],
  resetValues = false,
): T {
  const prev = new Map(activity.productItems.map((item) => [item.productId, item]))
  const defaultVal = defaultValueForMethod(activity.priceMethod)
  const productItems = productIds.map((productId) => {
    const old = prev.get(productId)
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
    if (value < 0.1 || value > 9.9) return '折扣须在0.1-9.9之间'
  } else if (method === 'fixed_reduction') {
    if (value <= 0) return '减价金额须大于0'
    if (originalPrice != null && value >= originalPrice) return '减价金额须小于商品原价'
  } else {
    if (value < 0) return '固定价格不能为负'
    if (originalPrice != null && value > originalPrice) return '固定价格不能高于商品原价'
  }
  return null
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
      : [createEmptyMemberPriceOfferGroup({ targetIds: activity.memberLevels ?? [] })]
    if (supportsMemberPriceMultiGroup(audienceType) && groups.length > MAX_MEMBER_PRICE_GROUPS) {
      issues.push(`方案最多${MAX_MEMBER_PRICE_GROUPS}个`)
    }
    if (groups.length === 0) issues.push('请至少配置一个方案')
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

function matchesProductName(activity: MemberPriceProductCoreFields, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProducts(activity).some((p) => p.name.toLowerCase().includes(kw))
}

function matchesProductId(activity: MemberPriceProductCoreFields, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return true
  return getActivityProducts(activity).some((p) =>
    p.id.toLowerCase().includes(kw) || p.skuId.toLowerCase().includes(kw),
  )
}

function matchesProductNameAcrossGroups(activity: MemberPriceActivityForm, keyword: string): boolean {
  const groups = activity.groups?.length ? activity.groups : [groupToProductCore(activity as unknown as MemberPriceOfferGroup)]
  if (groups.length === 0) return matchesProductName(activity, keyword)
  return groups.some((g) => matchesProductName(groupToProductCore(g as MemberPriceOfferGroup), keyword))
}

function matchesProductIdAcrossGroups(activity: MemberPriceActivityForm, keyword: string): boolean {
  const groups = activity.groups?.length ? activity.groups : null
  if (!groups?.length) return matchesProductId(activity, keyword)
  return groups.some((g) => matchesProductId(groupToProductCore(g), keyword))
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
  if (filters.productName && !matchesProductNameAcrossGroups(activity, filters.productName)) return false
  if (filters.productId && !matchesProductIdAcrossGroups(activity, filters.productId)) return false
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
  return syncMemberPriceActivityMirrors({
    ...defaults,
    ...legacy,
    audienceType,
    groups,
    memberLevels,
    priceMethod,
    productIds,
    productItems,
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
