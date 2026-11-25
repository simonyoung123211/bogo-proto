import { useEffect, useId, useRef, useState } from 'react'
import { PERIOD_OPTIONS } from '../mockLimitDiscountData'
import type { LimitDiscountActivityForm, LimitDiscountProductItem, LimitDiscountQuotaRule, ParticipationPeriod, Product } from '../types'
import { previewPrice, sceneLabel } from '../utils/limitDiscountActivity'
import {
  activeDiscountBusinessQuotas,
  commonDiscountQuota,
  discountQuantityWithQuota,
  discountQuotaBuckets,
  discountQuotaPoolNotices,
  discountQuotaRuleErrors,
  formatDiscountQuota,
  unlimitedDiscountQuota,
  type LimitDiscountQuotaConfig,
} from '../utils/limitDiscountQuota'

type QuotaRuleDraft = LimitDiscountQuotaRule & { totalLimited: boolean }

function quotaDraft(rule: LimitDiscountQuotaRule): QuotaRuleDraft {
  return { ...rule, totalLimited: rule.total != null }
}

const emptyQuotaDraft = quotaDraft(unlimitedDiscountQuota)
const commonQuotaLabel = '共用限量'
const quotaGuideByScope = {
  all: {
    intro: '每个参与规格用完优惠件数后，按正常规则计价。',
    eligible: '每个参与规格',
    deduction: '珍珠奶茶中杯、珍珠奶茶大杯、椰子水各有 1 件享活动价时，三个规格各扣 1 件、各剩 299 件。',
  },
  exclude: {
    intro: '余下规格在各自限量内享活动价，排除名单中的商品按正常规则计价。',
    eligible: '余下的每个参与规格',
    deduction: '排除椰子水后，珍珠奶茶中杯和大杯各有 1 件享活动价时，两个规格各扣 1 件、各剩 299 件。椰子水按正常规则计价。',
  },
  include: {
    intro: '所选规格可在各自限量内享活动价。优惠件数用完后，按正常规则计价。',
    eligible: '本次配置的每个规格',
    deduction: '珍珠奶茶中杯设为 300 件，其中 1 件享活动价时，中杯扣 1 件、剩余 299 件。',
  },
}

function quotaRule({ totalLimited, total, periodic }: QuotaRuleDraft): LimitDiscountQuotaRule {
  return { total: totalLimited ? total : null, periodic }
}

export function LimitDiscountQuotaSummary({ item, scenes, compact = false }: {
  item: LimitDiscountQuotaConfig
  scenes: string[]
  compact?: boolean
}) {
  const business = activeDiscountBusinessQuotas(item, scenes)
  const common = formatDiscountQuota(commonDiscountQuota(item))
  if (common === '不限量' && !business.length) return <span className="field-hint">不限量</span>

  return (
    <div className="ld-quota-summary">
      <span>共用 {common}</span>
      {compact && business.length > 0 && <small>已设 {business.length} 项分业务限量</small>}
      {!compact && business.map(({ scene, rule }) => <small key={scene}>{sceneLabel(scene)} {formatDiscountQuota(rule)}</small>)}
    </div>
  )
}

export function LimitDiscountProductQuotaDialog({ item, description, goodsScope, scenes, productCount = 1, readOnly = false, requireLimit = false, onConfirm, onClose }: {
  item?: LimitDiscountQuotaConfig
  description?: string
  goodsScope: LimitDiscountActivityForm['goodsScope']
  scenes: string[]
  productCount?: number
  readOnly?: boolean
  requireLimit?: boolean
  onConfirm: (config: LimitDiscountQuotaConfig) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const batch = productCount > 1
  const guide = quotaGuideByScope[goodsScope]
  const [common, setCommon] = useState(() => item ? quotaDraft(commonDiscountQuota(item)) : emptyQuotaDraft)
  const [business, setBusiness] = useState<Record<string, QuotaRuleDraft>>(() =>
    Object.fromEntries(Object.entries(item?.quota?.byScene ?? {}).map(([scene, rule]) => [scene, quotaDraft(rule)])))
  const commonRule = quotaRule(common)
  const checkBounds = !readOnly
  const commonErrors = discountQuotaRuleErrors(commonRule, { requireTotal: common.totalLimited, checkBounds })
  const businessRows = scenes.map((scene) => {
    const draft = business[scene] ?? emptyQuotaDraft
    const rule = quotaRule(draft)
    const errors = discountQuotaRuleErrors(rule, { requireTotal: draft.totalLimited, commonRule, checkBounds })
    return { scene, label: sceneLabel(scene), draft, rule, errors }
  })
  const active = Object.fromEntries(businessRows.flatMap(({ scene, rule }) => {
    return rule.total != null || rule.periodic ? [[scene, rule]] : []
  }))
  const businessCount = Object.keys(active).length
  const config: LimitDiscountQuotaConfig = {
    stock: commonRule.total,
    quota: commonRule.periodic || businessCount ? { periodic: commonRule.periodic, byScene: active } : undefined,
  }
  const error = [{ label: commonQuotaLabel, errors: commonErrors }, ...businessRows].map(({ label, errors: { total, periodic } }) => {
    const message = total ?? periodic
    return message && `${label} · ${message}`
  }).find(Boolean)
  const needsLimit = requireLimit && config.stock == null && !config.quota
  const notices = error ? [] : discountQuotaPoolNotices(config, scenes)

  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog className="modal modal--lg ld-area-dialog ld-quota-dialog" ref={ref} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form noValidate onSubmit={(event) => {
        event.preventDefault()
        if (!readOnly && !error && !needsLimit) onConfirm(config)
      }}>
        <header className="modal__header">
          <div>
            <h3 id={titleId}>{batch ? '批量设置商品优惠限量' : readOnly ? '查看商品优惠限量' : '设置商品优惠限量'}</h3>
            <p className="modal__subtitle">{batch ? `将用同一配置覆盖已选 ${productCount} 个商品，各商品分别计数。` : description}</p>
          </div>
          <button type="button" className="modal__close" aria-label="关闭商品优惠限量" onClick={onClose}>×</button>
        </header>
        <div className="modal__body modal__body--scroll">
          <p className="field-hint ld-quota-purpose">{guide.intro}</p>
          <details className="ld-quota-help">
            <summary>使用说明</summary>
            <dl>
              <div><dt>整场限量</dt><dd>「活动总限量」设为 300 件时，{guide.eligible}整场各可优惠 300 件。</dd></div>
              <div><dt>扣减示例</dt><dd>{guide.deduction}</dd></div>
              <div><dt>定期投放</dt><dd>「周期限量」设为每天 100 件时，{guide.eligible}每天各可优惠 100 件。周期用量按期重新计算，整场用量继续累计。</dd></div>
              <div><dt>按业务限量</dt><dd>堂食每天最多优惠 60 件时，在「分业务限量」设堂食每天 60 件。下单时取共用和该业务各项剩余量中最小的一项。</dd></div>
            </dl>
          </details>
          <table className="table table--compact ld-quota-table">
            <thead><tr><th scope="col">范围</th><th scope="col">活动总限量（件）</th><th scope="col">周期限量（件）</th></tr></thead>
            <tbody>
              <QuotaRuleRow label={commonQuotaLabel} hint="同一规格的参与门店和业务共用" errors={commonErrors}
                draft={common} readOnly={readOnly} onChange={setCommon} />
            </tbody>
          </table>
          {scenes.length > 0 && (
            <details className="ld-quota-business" open={item && activeDiscountBusinessQuotas(item, scenes).length > 0}>
              <summary>分业务限量{businessCount > 0 && <small>已设 {businessCount} 项</small>}</summary>
              <p className="field-hint">设置各业务最多能优惠的件数，实际可用件数同时受共用限量约束。</p>
              <table className="table table--compact ld-quota-table" aria-label="分业务限量">
                <thead><tr><th scope="col">参与业务</th><th scope="col">活动总限量（件）</th><th scope="col">周期限量（件）</th></tr></thead>
                <tbody>
                  {businessRows.map(({ scene, label, draft, errors }) => (
                    <QuotaRuleRow key={scene} label={label} draft={draft} errors={errors}
                      readOnly={readOnly} onChange={(next) => setBusiness((current) => ({ ...current, [scene]: next }))} />
                  ))}
                </tbody>
              </table>
            </details>
          )}
          {notices.length > 0 && (
            <div className="ld-quota-notices" role="status">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>
          )}
        </div>
        <footer className="modal__footer">
          {error && !readOnly && <span className="ld-quota-save-error" role="status">{error}</span>}
          {!error && needsLimit && !readOnly && <span className="ld-quota-save-hint">设置至少一项限量后可确认。</span>}
          <button type="button" className="btn btn--default" onClick={onClose}>{readOnly ? '关闭' : '取消'}</button>
          {!readOnly && <button type="submit" className="btn btn--primary" disabled={Boolean(error) || needsLimit}>
            {batch ? `应用到 ${productCount} 个商品` : '确定'}
          </button>}
        </footer>
      </form>
    </dialog>
  )
}

type QuotaTrialRow = { item: LimitDiscountProductItem; product: Product }

export function LimitDiscountQuotaTrial({ activity, rows }: { activity: LimitDiscountActivityForm; rows: QuotaTrialRow[] }) {
  const [productId, setProductId] = useState('')
  const row = rows.find(({ product }) => product.id === productId) ?? rows[0]
  if (!row || !activity.orderTypes.length) return null

  return (
    <details className="ld-entry-preview">
      <summary>试算优惠件数</summary>
      <p className="field-hint">按填写的已用件数试算，假设订单满足其他优惠条件。</p>
      <div className="ld-quota-trial">
        <label>商品
          <select className="input select" value={row.product.id} onChange={(event) => setProductId(event.target.value)}>
            {rows.map(({ product }) => <option key={product.id} value={product.id}>{product.name} · {product.spec}</option>)}
          </select>
        </label>
        <QuotaTrialFields key={row.product.id} activity={activity} row={row} />
      </div>
    </details>
  )
}

function QuotaTrialFields({ activity, row }: { activity: LimitDiscountActivityForm; row: QuotaTrialRow }) {
  const [scene, setScene] = useState(activity.orderTypes[0])
  const [quantity, setQuantity] = useState(1)
  const [usage, setUsage] = useState<Record<string, number>>({})
  const buckets = discountQuotaBuckets(row.item, scene)
  const valid = Number.isSafeInteger(quantity) && quantity > 0 && buckets.every(({ id }) =>
    Number.isSafeInteger(usage[id] ?? 0) && (usage[id] ?? 0) >= 0)
  const discounted = valid ? discountQuantityWithQuota(buckets, quantity, usage) : 0
  const discountedPrice = previewPrice(row.product, activity, row.item, scene)

  return (
    <>
      <label>订单业务
        <select className="input select" value={scene} onChange={(event) => setScene(event.target.value)}>
          {activity.orderTypes.map((id) => <option key={id} value={id}>{sceneLabel(id)}</option>)}
        </select>
      </label>
      <label>购买件数
        <input className="input" type="number" min={1} step={1} value={quantity || ''}
          onChange={(event) => setQuantity(event.target.valueAsNumber || 0)} />
      </label>
      {buckets.map(({ id, label, limit }) => (
        <label key={id}>{id.startsWith('common-') ? label : sceneLabel(scene) + label}已用（共 {limit} 件）
          <input className="input" type="number" min={0} step={1} placeholder="0" value={usage[id] ?? ''}
            onChange={(event) => {
              const used = event.target.valueAsNumber || 0
              setUsage((current) => ({ ...current, [id]: used }))
            }} />
        </label>
      ))}
      <p className="ld-quota-trial__result" aria-live="polite">
        {valid ? (
          <>
            {discounted > 0 ? <strong>{discounted} 件享活动价 ¥{discountedPrice.toFixed(2)}</strong> : '可优惠件数已用完'}
            {discounted < quantity && ` · ${quantity - discounted} 件按正常价 ¥${row.product.price.toFixed(2)}`}
          </>
        ) : '请填写有效购买件数和已用件数。'}
      </p>
    </>
  )
}

function QuotaRuleRow({ label, hint, draft, errors, readOnly, onChange }: {
  label: string
  hint?: string
  draft: QuotaRuleDraft
  errors: ReturnType<typeof discountQuotaRuleErrors>
  readOnly: boolean
  onChange: (draft: QuotaRuleDraft) => void
}) {
  const id = useId()
  const periodic = draft.periodic
  return (
    <tr>
      <th scope="row">{label}{hint && <small>{hint}</small>}</th>
      <td>
        <div className="ld-quota-control">
          <select className="input select" aria-label={`${label}活动总限量方式`}
            value={draft.totalLimited ? 'limited' : 'unlimited'} disabled={readOnly}
            onChange={(event) => onChange({ ...draft, totalLimited: event.target.value === 'limited' })}>
            <option value="unlimited">不限总量</option>
            <option value="limited">限制总量</option>
          </select>
          {draft.totalLimited && (
            <input className="input" type="number" min={1} step={1} placeholder="输入件数" required
              aria-label={`${label}活动总限量`} aria-invalid={!!errors.total} aria-describedby={errors.total ? `${id}-total` : undefined}
              value={draft.total ?? ''} disabled={readOnly}
              onChange={(event) => onChange({ ...draft, total: event.target.value === '' ? null : event.target.valueAsNumber })} />
          )}
        </div>
        {errors.total && <p className="ld-quota-error" id={`${id}-total`}>{errors.total}</p>}
      </td>
      <td>
        <div className="ld-quota-control ld-quota-control--periodic">
          <select className="input select" aria-label={`${label}周期类型`} value={periodic?.period ?? ''} disabled={readOnly}
            onChange={(event) => {
              const period = event.target.value as ParticipationPeriod | ''
              onChange({ ...draft, periodic: period ? { period, limit: periodic?.limit ?? null } : null })
            }}>
            <option value="">不设周期限量</option>
            {PERIOD_OPTIONS.map(({ value, label: periodLabel }) => <option key={value} value={value}>{periodLabel}</option>)}
          </select>
          {periodic && (
            <input className="input" type="number" min={1} step={1} placeholder="请输入件数" required disabled={readOnly}
              aria-label={`${label}周期限量`} aria-invalid={!!errors.periodic} aria-describedby={errors.periodic ? `${id}-periodic` : undefined}
              value={periodic.limit ?? ''}
              onChange={(event) => onChange({
                ...draft, periodic: { ...periodic, limit: event.target.value === '' ? null : event.target.valueAsNumber },
              })} />
          )}
        </div>
        {errors.periodic && <p className="ld-quota-error" id={`${id}-periodic`}>{errors.periodic}</p>}
      </td>
    </tr>
  )
}
