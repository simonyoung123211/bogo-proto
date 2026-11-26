import { LIMIT_DISCOUNT_SCENES, PERIOD_OPTIONS } from '../mockLimitDiscountData'
import type { LimitDiscountPeriodicQuota, LimitDiscountProductItem, LimitDiscountQuotaRule, ParticipationPeriod } from '../types'

export type LimitDiscountQuotaConfig = Pick<LimitDiscountProductItem, 'stock' | 'quota'>

export const unlimitedDiscountQuota: LimitDiscountQuotaRule = { total: null, periodic: null }

export function commonDiscountQuota(item: LimitDiscountQuotaConfig): LimitDiscountQuotaRule {
  return { total: item.stock ?? null, periodic: item.quota?.periodic ?? null }
}

export function discountQuotaConfig({ total, periodic }: LimitDiscountQuotaRule, byScene: Record<string, LimitDiscountQuotaRule> = {}): LimitDiscountQuotaConfig {
  return { stock: total, quota: periodic || Object.keys(byScene).length ? { periodic, byScene } : undefined }
}

export function activeDiscountBusinessQuotas(item: LimitDiscountQuotaConfig, scenes: string[]) {
  return scenes.flatMap((scene) => {
    const rule = item.quota?.byScene[scene]
    return rule && (rule.total != null || rule.periodic) ? [{ scene, rule }] : []
  })
}

export function hasDiscountProductQuota(item: LimitDiscountQuotaConfig, scenes: string[]) {
  return item.stock != null || item.quota?.periodic != null || activeDiscountBusinessQuotas(item, scenes).length > 0
}

function validLimit(limit: number | null): limit is number {
  return limit != null && Number.isSafeInteger(limit) && limit > 0
}

type QuotaPeriod = 'activity' | ParticipationPeriod

function ruleLimits(rule: LimitDiscountQuotaRule) {
  const limits: { period: QuotaPeriod; label: string; limit: number }[] = []
  if (validLimit(rule.total)) limits.push({ period: 'activity', label: '活动累计', limit: rule.total })
  if (rule.periodic) {
    const limit = rule.periodic.limit
    const label = PERIOD_OPTIONS.find(({ value }) => value === rule.periodic?.period)?.label
    if (label && validLimit(limit)) limits.push({ period: rule.periodic.period, label, limit })
  }
  return limits
}

export function discountQuotaLabels(rule: LimitDiscountQuotaRule) {
  return ruleLimits(rule).map(({ period, label, limit }) =>
    `${period === 'activity' ? '整场' : label} ${limit.toLocaleString('zh-CN')} 件`)
}

export function formatDiscountQuota(rule: LimitDiscountQuotaRule) {
  return discountQuotaLabels(rule).join(' · ') || '不限量'
}

function containsQuotaPeriod(outer: QuotaPeriod, inner: QuotaPeriod) {
  return outer === inner || outer === 'activity' || (inner === 'daily' && (outer === 'weekly' || outer === 'monthly'))
}

export function discountQuotaRuleErrors(rule: LimitDiscountQuotaRule, {
  requireTotal = false, commonRule, checkBounds = true,
}: { requireTotal?: boolean; commonRule?: LimitDiscountQuotaRule; checkBounds?: boolean } = {}) {
  const errors: { total?: string; periodic?: string } = {}
  if (rule.total == null && requireTotal) errors.total = '请填写活动总限量'
  if (rule.total != null && !validLimit(rule.total)) errors.total = '活动总限量须为正整数'
  if (rule.periodic) {
    if (!PERIOD_OPTIONS.some(({ value }) => value === rule.periodic?.period)) errors.periodic = '请选择周期'
    else if (!validLimit(rule.periodic.limit)) errors.periodic = '周期限量须为正整数'
  }
  if (!checkBounds) return errors

  const commonLimits = commonRule ? ruleLimits(commonRule).map((limit) => ({ ...limit, scope: '共用' })) : []
  const limits = ruleLimits(rule)
  const total = limits.find(({ period }) => period === 'activity')
  for (const limit of limits) {
    const field = limit.period === 'activity' ? 'total' : 'periodic'
    const caps = field === 'periodic' && total
      ? [...commonLimits, { ...total, scope: commonRule ? '本业务' : '共用' }]
      : commonLimits
    const cap = caps.filter(({ period }) => containsQuotaPeriod(period, limit.period))
      .sort((left, right) => left.limit - right.limit)[0]
    if (cap && limit.limit > cap.limit) {
      const fieldLabel = field === 'total' ? '活动总限量' : `${limit.label}限量`
      const capLabel = cap.period === 'activity' ? '活动总限量' : `${cap.label}限量`
      errors[field] = `${fieldLabel}不能超过${cap.scope}${capLabel} ${cap.limit} 件`
    }
  }
  return errors
}

export function discountProductQuotaErrors(item: LimitDiscountQuotaConfig, scenes: string[], { checkBounds = true } = {}) {
  const commonRule = commonDiscountQuota(item)
  const rules = [
    { label: '共用限量', errors: discountQuotaRuleErrors(commonRule, { checkBounds }) },
    ...activeDiscountBusinessQuotas(item, scenes).map(({ scene, rule }) => ({
      label: LIMIT_DISCOUNT_SCENES.find(({ id }) => id === scene)?.label ?? scene,
      errors: discountQuotaRuleErrors(rule, { commonRule, checkBounds }),
    })),
  ]
  return rules.flatMap(({ label, errors: { total, periodic } }) =>
    [total, periodic].flatMap((error) => error ? [`${label} · ${error}`] : []))
}

export function discountQuotaPoolNotices(item: LimitDiscountQuotaConfig, scenes: string[]) {
  const commonLimits = ruleLimits(commonDiscountQuota(item))
  const businessLimits = activeDiscountBusinessQuotas(item, scenes).flatMap(({ rule }) => ruleLimits(rule))
  return commonLimits.flatMap(({ period, label, limit }) => {
    const sum = businessLimits.filter((row) => row.period === period).reduce((total, row) => total + row.limit, 0)
    return sum > limit
      ? [`各业务${label}限量合计 ${sum} 件，所有业务${label}共用 ${limit} 件，实际可优惠件数受共用剩余量限制。`]
      : []
  })
}

export function discountQuotaRelaxationError(before: LimitDiscountQuotaConfig, after: LimitDiscountQuotaConfig, scenes: string[]) {
  const oldBusiness = before.quota?.byScene ?? {}
  const newBusiness = after.quota?.byScene ?? {}
  const businessKeys = new Set([...Object.keys(oldBusiness), ...Object.keys(newBusiness)])
  const rules = [
    { label: '共用限量', previous: commonDiscountQuota(before), next: commonDiscountQuota(after), scene: undefined },
    ...Array.from(businessKeys).flatMap((scene) =>
      JSON.stringify(oldBusiness[scene]) === JSON.stringify(newBusiness[scene]) ? [] : [{
        label: LIMIT_DISCOUNT_SCENES.find(({ id }) => id === scene)?.label ?? scene,
        previous: oldBusiness[scene] ?? unlimitedDiscountQuota,
        next: newBusiness[scene] ?? unlimitedDiscountQuota,
        scene,
      }]),
  ]
  for (const { label, previous, next, scene } of rules) {
    if (scene && !scenes.includes(scene)) return `${label}当前未参与活动，无法调整限量`
    if (next.total !== previous.total && next.total != null) {
      if (previous.total == null) return `${label}未设置总限量，进行中不能新增限量`
      if (!validLimit(next.total) || next.total < previous.total) return `${label}的活动总限量只能提高或取消`
    }
    if (!next.periodic || JSON.stringify(next.periodic) === JSON.stringify(previous.periodic)) continue
    if (!previous.periodic) return `${label}未设置周期限量，进行中不能新增限量`
    if (next.periodic.period !== previous.periodic.period) return `${label}进行中不能更换周期类型`
    if (!validLimit(next.periodic.limit) || (previous.periodic.limit != null && next.periodic.limit < previous.periodic.limit)) {
      return `${label}的周期限量只能提高或取消`
    }
  }
  const previousErrors = new Set(discountProductQuotaErrors(before, scenes))
  return discountProductQuotaErrors(after, scenes).find((error) => !previousErrors.has(error))
}

export function normalizeDiscountQuota(quota: LimitDiscountQuotaConfig['quota'], at: Date = new Date()): LimitDiscountQuotaConfig['quota'] {
  if (!quota) return undefined
  const normalizePeriodic = (periodic: LimitDiscountPeriodicQuota | null) => {
    if (!periodic) return null
    // 兼容上一版原型已保存的临时加量，将当前有效上限转为持续生效的上限。
    const legacy = periodic as LimitDiscountPeriodicQuota & { currentPeriod?: { startsOn: string; limit: number } }
    const date = new Date(at.getTime() + 8 * 60 * 60 * 1000)
    if (periodic.period === 'weekly') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
    if (periodic.period === 'monthly') date.setUTCDate(1)
    const current = legacy.currentPeriod
    const limit = current?.startsOn === date.toISOString().slice(0, 10) && validLimit(current.limit)
      ? Math.max(periodic.limit ?? 0, current.limit) : periodic.limit
    return { period: periodic.period, limit }
  }
  return {
    periodic: normalizePeriodic(quota.periodic),
    byScene: Object.fromEntries(Object.entries(quota.byScene ?? {}).map(([scene, rule]) =>
      [scene, { total: rule.total, periodic: normalizePeriodic(rule.periodic) }])),
  }
}
