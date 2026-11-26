import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { PERIOD_OPTIONS } from '../mockLimitDiscountData'
import type { LimitDiscountActivityForm, LimitDiscountProductItem, LimitDiscountQuotaRule, ParticipationPeriod, Product } from '../types'
import { previewPrice, sceneLabel } from '../utils/limitDiscountActivity'
import {
  activeDiscountBusinessQuotas,
  commonDiscountQuota,
  discountQuantityWithQuota,
  discountQuotaBuckets,
  discountQuotaConfig,
  discountQuotaLabels,
  discountQuotaPoolNotices,
  discountQuotaRuleErrors,
  formatDiscountQuota,
  hasDiscountProductQuota,
  unlimitedDiscountQuota,
  type LimitDiscountQuotaConfig,
} from '../utils/limitDiscountQuota'
import { LimitDiscountBusinessSelect, LimitDiscountRuleDialog, LimitDiscountRuleSummary } from './LimitDiscountRuleDialog'

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

export function LimitDiscountQuotaSummary({ item, scenes, expandBusiness = false }: {
  item: LimitDiscountQuotaConfig
  scenes: string[]
  expandBusiness?: boolean
}) {
  const business = activeDiscountBusinessQuotas(item, scenes)
  return <LimitDiscountRuleSummary label="共用" values={discountQuotaLabels(commonDiscountQuota(item))}
    empty={business.length ? '共用不限量' : '不限量'} businessLabel="分业务限量" expandBusiness={expandBusiness}
    business={business.map(({ scene, rule }) => ({ scene, value: formatDiscountQuota(rule) }))} />
}

type CommonQuotaField = 'total' | 'periodic'

interface LimitDiscountQuotaEditorProps {
  item: LimitDiscountQuotaConfig
  scenes: string[]
  editing: boolean
  editorPreset?: LimitDiscountQuotaRule
  onEdit: () => void
  onCancel: () => void
  onApply: (config: LimitDiscountQuotaConfig) => void
  onOpenBusiness: (commonDraft?: LimitDiscountQuotaRule) => void
}

export function LimitDiscountQuotaEditor({ item, scenes, editing, editorPreset, onEdit, onCancel, onApply, onOpenBusiness }: LimitDiscountQuotaEditorProps) {
  const [field, setField] = useState<CommonQuotaField>('total')
  const common = commonDiscountQuota(item)
  const businessCount = activeDiscountBusinessQuotas(item, scenes).length
  const totalLabel = discountQuotaLabels({ total: common.total, periodic: null })[0]
    ?? (common.total == null ? '整场不限' : '总限量待修正')
  const periodicLabel = discountQuotaLabels({ total: null, periodic: common.periodic })[0]
    ?? (common.periodic == null ? '周期未设' : '周期限量待修正')

  function edit(nextField: CommonQuotaField) {
    setField(nextField)
    onEdit()
  }

  return (
    <div className="ld-inline-rule">
      {editing ? (
        <CommonQuotaInlineFields item={item} scenes={scenes} field={field}
          initial={common.total == null && !common.periodic && editorPreset ? editorPreset : common}
          onCancel={onCancel} onApply={onApply} onOpenBusiness={onOpenBusiness} />
      ) : (
        <>
          <div className="ld-inline-rule__values" aria-label="共用限量">
            <button type="button" className="ld-inline-rule__value" aria-label={`编辑活动总限量，${totalLabel}`} onClick={() => edit('total')}>{totalLabel}</button>
            <button type="button" className="ld-inline-rule__value" aria-label={`编辑周期限量，${periodicLabel}`} onClick={() => edit('periodic')}>{periodicLabel}</button>
          </div>
          {scenes.length > 0 && (
            <button type="button" className="link-btn ld-inline-rule__business" aria-haspopup="dialog" onClick={() => onOpenBusiness()}>
              {businessCount ? `分业务限量（${businessCount}）` : '设置分业务限量'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function CommonQuotaInlineFields({ item, scenes, initial, field, onCancel, onApply, onOpenBusiness }:
  Pick<LimitDiscountQuotaEditorProps, 'item' | 'scenes' | 'onCancel' | 'onApply' | 'onOpenBusiness'> & {
    initial: LimitDiscountQuotaRule
    field: CommonQuotaField
  }) {
  const id = useId()
  const totalRef = useRef<HTMLInputElement>(null)
  const periodRef = useRef<HTMLSelectElement>(null)
  const [totalInput, setTotalInput] = useState(() => initial.total?.toString() ?? '')
  const [periodic, setPeriodic] = useState(initial.periodic)
  const totalValue = totalInput.trim()
  const total = totalValue ? (/^\d+$/.test(totalValue) ? Number(totalValue) : Number.NaN) : null
  const common = { total, periodic }
  const config = discountQuotaConfig(common, item.quota?.byScene)
  const commonErrors = discountQuotaRuleErrors(common)
  const commonInvalid = Boolean(commonErrors.total || commonErrors.periodic)
  const businessErrors = commonInvalid ? [] : activeDiscountBusinessQuotas(item, scenes).flatMap(({ scene, rule }) => {
    const errors = discountQuotaRuleErrors(rule, { commonRule: common })
    return Object.entries(errors).map(([field, message]) => ({ scene, field, message }))
  })
  const invalid = commonInvalid || businessErrors.length > 0
  const notice = invalid ? undefined : discountQuotaPoolNotices(config, scenes).join(' ')

  useEffect(() => {
    if (field === 'total') totalRef.current?.focus({ preventScroll: true })
    else periodRef.current?.focus({ preventScroll: true })
  }, [field])

  return (
    <form className="ld-inline-rule__editor" aria-label="编辑共用限量" noValidate
      onSubmit={(event) => { event.preventDefault(); if (!invalid) onApply(config) }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onCancel() } }}>
      <div className="ld-inline-quota__fields">
        <div className="ld-inline-quota__field">
          <label htmlFor={`${id}-total-input`} className="ld-inline-quota__label">总限量</label>
          <div>
            <div className="ld-quota-control">
              <input className="input" id={`${id}-total-input`} placeholder="不限" inputMode="numeric" ref={totalRef}
                value={totalInput} aria-label="共用活动总限量" aria-invalid={Boolean(commonErrors.total)}
                aria-describedby={commonErrors.total ? `${id}-total-error` : undefined}
                onChange={(event) => setTotalInput(event.currentTarget.value)} />
              <span>件</span>
            </div>
            {commonErrors.total && <p className="ld-quota-error" id={`${id}-total-error`}>{commonErrors.total}</p>}
          </div>
        </div>
        <div className="ld-inline-quota__field">
          <label htmlFor={`${id}-period-select`} className="ld-inline-quota__label">周期限量</label>
          <QuotaPeriodicField id={id} label={commonQuotaLabel} periodic={periodic} error={commonErrors.periodic}
            onChange={setPeriodic} selectRef={periodRef} compact />
        </div>
      </div>
      {businessErrors.length > 0 && (
        <div className="ld-inline-rule__errors" role="status">
          {businessErrors.map(({ scene, field, message }) => <p key={`${scene}-${field}`} className="ld-quota-error">{sceneLabel(scene)} · {message}</p>)}
        </div>
      )}
      {notice && <div className="ld-quota-notices" role="status"><p>{notice}</p></div>}
      <div className="ld-inline-rule__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={invalid}>应用</button>
        <button type="button" className="btn btn--default btn--sm" onClick={onCancel}>取消</button>
        {businessErrors.length > 0 && (
          <button type="button" className="link-btn ld-inline-rule__business" aria-haspopup="dialog" onClick={() => onOpenBusiness(common)}>
            调整分业务限量
          </button>
        )}
      </div>
    </form>
  )
}

export function LimitDiscountProductQuotaDialog({ item, description, goodsScope, scenes, productCount = 1, configuredCount = 0, readOnly = false, businessOnly = false, initialCommon, onConfirm, onClose }: {
  item?: LimitDiscountQuotaConfig
  description?: string
  goodsScope: LimitDiscountActivityForm['goodsScope']
  scenes: string[]
  productCount?: number
  configuredCount?: number
  readOnly?: boolean
  businessOnly?: boolean
  initialCommon?: LimitDiscountQuotaRule
  onConfirm: (config: LimitDiscountQuotaConfig) => void
  onClose: () => void
}) {
  const batch = productCount > 1
  const guide = quotaGuideByScope[goodsScope]
  const [common, setCommon] = useState(() => initialCommon ? quotaDraft(initialCommon) : item ? quotaDraft(commonDiscountQuota(item)) : emptyQuotaDraft)
  const [business, setBusiness] = useState<Record<string, QuotaRuleDraft>>(() =>
    Object.fromEntries(item ? activeDiscountBusinessQuotas(item, scenes).map(({ scene, rule }) => [scene, quotaDraft(rule)]) : []))
  const commonRule = quotaRule(common)
  const checkBounds = !readOnly
  const commonErrors = discountQuotaRuleErrors(commonRule, { requireTotal: common.totalLimited, checkBounds })
  const businessRows = scenes.flatMap((scene) => {
    const draft = business[scene]
    if (!draft) return []
    const rule = quotaRule(draft)
    const errors = discountQuotaRuleErrors(rule, { requireTotal: draft.totalLimited, commonRule, checkBounds })
    return [{ scene, label: sceneLabel(scene), draft, rule, errors }]
  })
  const availableScenes = scenes.filter((scene) => !business[scene])
  const active = Object.fromEntries(businessRows.flatMap(({ scene, rule }) => {
    return rule.total != null || rule.periodic ? [[scene, rule]] : []
  }))
  const inactive = businessOnly ? Object.fromEntries(Object.entries(item?.quota?.byScene ?? {}).filter(([scene]) => !scenes.includes(scene))) : {}
  const config = discountQuotaConfig(commonRule, { ...inactive, ...active })
  const error = [{ label: commonQuotaLabel, errors: commonErrors }, ...businessRows].map(({ label, errors: { total, periodic } }) => {
    const message = total ?? periodic
    return message && `${label} · ${message}`
  }).find(Boolean)
  const unlimited = commonRule.total == null && !commonRule.periodic && Object.keys(active).length === 0
  const hadLimit = item && hasDiscountProductQuota(item, scenes)
  const needsLimit = unlimited && !batch && !hadLimit && !businessOnly
  const notices = error ? [] : discountQuotaPoolNotices(config, scenes)
  const applyLabel = businessOnly || needsLimit ? '应用限量' : unlimited
    ? batch ? `将 ${productCount} 个规格设为不限量` : '设为不限量'
    : batch ? `应用到 ${productCount} 个规格` : '应用限量'

  function removeBusiness(scene: string) {
    setBusiness((current) => {
      const next = { ...current }
      delete next[scene]
      return next
    })
  }

  return (
    <LimitDiscountRuleDialog
      title={batch ? '批量设置商品优惠限量' : readOnly ? '查看商品优惠限量' : businessOnly ? '设置分业务限量' : '设置商品优惠限量'}
      description={batch ? `已勾选 ${productCount} 个规格，各规格分别计数` : description}
      onClose={onClose}
      onApply={() => { if (!readOnly && !error && !needsLimit) onConfirm(config) }}
      footer={<>
        {!readOnly && (
          <div className="ld-rule-dialog__feedback">
            {error ? <span className="ld-quota-save-error" role="status">{error}</span>
              : needsLimit ? <span className="ld-quota-save-hint">设置至少一项限量后可应用。</span> : null}
            {(businessOnly ? businessRows.length > 0 : !unlimited || common.totalLimited || businessRows.length > 0) && (
              <button type="button" className="link-btn" onClick={() => { if (!businessOnly) setCommon(emptyQuotaDraft); setBusiness({}) }}>
                {businessOnly ? '清除分业务限量' : '清除限量'}
              </button>
            )}
          </div>
        )}
        <button type="button" className="btn btn--default" onClick={onClose}>{readOnly ? '关闭' : '取消'}</button>
        {!readOnly && <button type="submit" className="btn btn--primary" disabled={Boolean(error) || needsLimit}>{applyLabel}</button>}
      </>}>
      {batch && configuredCount > 0 && (
        <p className="ld-quota-batch-note">应用后将替换其中 {configuredCount} 个规格已有的限量设置。</p>
      )}
      <div className="ld-quota-dialog__intro">
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
      </div>
      {readOnly ? <LimitDiscountQuotaSummary item={config} scenes={scenes} expandBusiness /> : (
        <>
          {businessOnly ? (
            <p className="ld-rule-section__hint">{initialCommon ? '待应用的共用限量' : '共用限量'} · {formatDiscountQuota(commonRule)}</p>
          ) : (
            <section className="ld-rule-section" aria-label="共用限量">
              <h4>共用限量</h4>
              <p className="ld-rule-section__hint">同一规格的参与门店和业务共用。</p>
              <table className="table table--compact ld-quota-table">
                <thead><tr><th scope="col">活动总限量（件）</th><th scope="col">周期限量（件）</th></tr></thead>
                <tbody><QuotaRuleRow label={commonQuotaLabel} hideLabel draft={common} errors={commonErrors} onChange={setCommon} /></tbody>
              </table>
            </section>
          )}
          {scenes.length > 0 && (
            <section className="ld-rule-section" aria-label="分业务限量">
              <div className="ld-rule-section__head">
                <h4>分业务限量</h4>
                <LimitDiscountBusinessSelect scenes={availableScenes} label="添加业务限量"
                  onAdd={(scene) => setBusiness((current) => ({ ...current, [scene]: emptyQuotaDraft }))} />
              </div>
              <p className="ld-rule-section__hint">填写件数的业务会单独限量，其余业务按共用限量执行。</p>
              {businessRows.length > 0 && (
                <table className="table table--compact ld-quota-table ld-quota-table--business" aria-label="分业务限量">
                  <thead><tr><th scope="col">参与业务</th><th scope="col">活动总限量（件）</th><th scope="col">周期限量（件）</th><th scope="col">操作</th></tr></thead>
                  <tbody>
                    {businessRows.map(({ scene, label, draft, errors }) => (
                      <QuotaRuleRow key={scene} label={label} draft={draft} errors={errors} onRemove={() => removeBusiness(scene)}
                        onChange={(next) => setBusiness((current) => ({ ...current, [scene]: next }))} />
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </>
      )}
      {notices.length > 0 && (
        <div className="ld-quota-notices" role="status">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>
      )}
    </LimitDiscountRuleDialog>
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

function QuotaRuleRow({ label, hideLabel = false, draft, errors, onChange, onRemove }: {
  label: string
  hideLabel?: boolean
  draft: QuotaRuleDraft
  errors: ReturnType<typeof discountQuotaRuleErrors>
  onChange: (draft: QuotaRuleDraft) => void
  onRemove?: () => void
}) {
  const id = useId()
  return (
    <tr>
      {!hideLabel && <th scope="row">{label}</th>}
      <td>
        <div className="ld-quota-control">
          <select className="input select" aria-label={`${label}活动总限量方式`}
            value={draft.totalLimited ? 'limited' : 'unlimited'}
            onChange={(event) => onChange({ ...draft, totalLimited: event.target.value === 'limited' })}>
            <option value="unlimited">不限总量</option>
            <option value="limited">限制总量</option>
          </select>
          {draft.totalLimited && (
            <input className="input" type="number" min={1} step={1} placeholder="输入件数" required
              aria-label={`${label}活动总限量`} aria-invalid={!!errors.total} aria-describedby={errors.total ? `${id}-total` : undefined}
              value={draft.total ?? ''}
              onChange={(event) => onChange({ ...draft, total: event.target.value === '' ? null : event.target.valueAsNumber })} />
          )}
        </div>
        {errors.total && <p className="ld-quota-error" id={`${id}-total`}>{errors.total}</p>}
      </td>
      <td>
        <QuotaPeriodicField id={id} label={label} periodic={draft.periodic} error={errors.periodic}
          onChange={(periodic) => onChange({ ...draft, periodic })} />
      </td>
      {onRemove && <td><button type="button" className="link-btn" aria-label={`移除${label}限量`} onClick={onRemove}>移除</button></td>}
    </tr>
  )
}

function QuotaPeriodicField({ id, label, periodic, error, onChange, selectRef, compact }: {
  id: string
  label: string
  periodic: LimitDiscountQuotaRule['periodic']
  error?: string
  onChange: (periodic: LimitDiscountQuotaRule['periodic']) => void
  selectRef?: Ref<HTMLSelectElement>
  compact?: boolean
}) {
  return (
    <div>
      <div className="ld-quota-control ld-quota-control--periodic">
        <select className="input select" id={`${id}-period-select`} aria-label={`${label}周期类型`} value={periodic?.period ?? ''} ref={selectRef}
          onChange={(event) => {
            const period = event.currentTarget.value as ParticipationPeriod | ''
            onChange(period ? { period, limit: periodic?.limit ?? null } : null)
          }}>
          <option value="">{compact ? '不设置' : '不设周期限量'}</option>
          {PERIOD_OPTIONS.map(({ value, label: periodLabel }) => <option key={value} value={value}>{periodLabel}</option>)}
        </select>
        {periodic && (
          <input className="input" type="number" min={1} step={1} placeholder="输入件数" required
            aria-label={`${label}周期限量`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-periodic-error` : undefined}
            value={periodic.limit ?? ''}
            onChange={(event) => onChange({ ...periodic, limit: event.currentTarget.value === '' ? null : event.currentTarget.valueAsNumber })} />
        )}
        {compact && periodic && <span>件</span>}
      </div>
      {error && <p className="ld-quota-error" id={`${id}-periodic-error`}>{error}</p>}
    </div>
  )
}
