import { LIMIT_DISCOUNT_SCENES, PERIOD_OPTIONS } from '../mockLimitDiscountData'
import type { LimitDiscountProductItem, LimitDiscountQuotaRule, ParticipationPeriod } from '../types'

export type LimitDiscountQuotaConfig = Pick<LimitDiscountProductItem, 'stock' | 'quota'>

export const unlimitedDiscountQuota: LimitDiscountQuotaRule = { total: null, periodic: null }

export function commonDiscountQuota(item: LimitDiscountQuotaConfig): LimitDiscountQuotaRule {
  return { total: item.stock ?? null, periodic: item.quota?.periodic ?? null }
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
  if (rule.periodic && validLimit(rule.periodic.limit)) {
    const label = PERIOD_OPTIONS.find(({ value }) => value === rule.periodic?.period)?.label
    if (label) limits.push({ period: rule.periodic.period, label, limit: rule.periodic.limit })
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

export function discountQuotaBuckets(item: LimitDiscountQuotaConfig, scene: string) {
  const business = item.quota?.byScene[scene] ?? unlimitedDiscountQuota
  return [
    ...ruleLimits(commonDiscountQuota(item)).map(({ period, label, limit }) => ({ id: `common-${period}`, label: `共用${label}`, limit })),
    ...ruleLimits(business).map(({ period, label, limit }) => ({ id: `${scene}-${period}`, label, limit })),
  ]
}

export function discountQuantityWithQuota(
  buckets: ReturnType<typeof discountQuotaBuckets>,
  quantity: number,
  usage: Record<string, number>,
) {
  return Math.min(quantity, ...buckets.map(({ id, limit }) => Math.max(0, limit - (usage[id] ?? 0))))
}
