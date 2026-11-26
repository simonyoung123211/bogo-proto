import { useId, useRef, useState } from 'react'
import type { LimitDiscountActivityForm, LimitDiscountMethod, LimitDiscountProductItem } from '../types'
import { discountUnit, discountValueLabel, formatDiscountValue, sceneLabel, sceneOverrides, validateDiscountNumber } from '../utils/limitDiscountActivity'
import { LimitDiscountBusinessSelect, LimitDiscountRuleDialog, LimitDiscountRuleSummary } from './LimitDiscountRuleDialog'

export function LimitDiscountStrengthSummary({ activity, item, expandBusiness }: {
  activity: LimitDiscountActivityForm
  item: LimitDiscountProductItem
  expandBusiness?: boolean
}) {
  const { discountMethod } = activity
  const value = item.discountValue
  const invalid = value != null && Boolean(validateDiscountNumber(discountMethod, value, '默认力度'))
  const business = sceneOverrides(activity, item).map(({ sceneId, value }) => {
    const invalid = Boolean(validateDiscountNumber(discountMethod, value, '力度'))
    return { scene: sceneId, value: invalid ? '待修正' : formatDiscountValue(discountMethod, value), invalid }
  })
  return <LimitDiscountRuleSummary label="默认" values={value != null && !invalid ? [formatDiscountValue(discountMethod, value)] : []}
    empty={invalid ? '默认力度待修正' : '未设置默认力度'} attention={invalid}
    businessLabel="分业务力度" business={business} expandBusiness={expandBusiness} />
}

export type LimitDiscountStrengthChange = {
  defaultValue?: number | null
  business: Record<string, number | null>
}

export function LimitDiscountStrengthControls({ activity, item, readOnly, editing, onEdit, onCancel, onApply, onOpenBusiness }: {
  activity: LimitDiscountActivityForm
  item: LimitDiscountProductItem
  readOnly?: boolean
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onApply: (value: number | null) => void
  onOpenBusiness: () => void
}) {
  const { discountMethod, orderTypes } = activity
  const value = item.discountValue
  const defaultLabel = `默认${discountValueLabel(discountMethod)}`
  const invalid = value != null && Boolean(validateDiscountNumber(discountMethod, value, defaultLabel))
  const businessCount = sceneOverrides(activity, item).length
  const refocusDefault = useRef(false)

  if (readOnly) return <LimitDiscountStrengthSummary activity={activity} item={item} />

  return (
    <div className="ld-inline-rule ld-inline-rule--strength">
      {editing ? (
        <DefaultStrengthEditor method={discountMethod} label={defaultLabel} initialValue={value}
          onCancel={() => {
            refocusDefault.current = true
            onCancel()
          }}
          onApply={(nextValue) => {
            refocusDefault.current = true
            onApply(nextValue)
          }} />
      ) : (
        <div className="ld-inline-rule__values">
          <button type="button" className={`ld-inline-rule__value${invalid ? ' ld-rule-summary__invalid' : ''}`}
            aria-label={`${value == null ? '设置' : '编辑'}${defaultLabel}`}
            ref={(button) => {
              if (!button || !refocusDefault.current) return
              refocusDefault.current = false
              button.focus({ preventScroll: true })
            }}
            onClick={onEdit}>
            {value == null ? '设置默认力度' : invalid ? '默认力度待修正' : <>默认 <strong>{formatDiscountValue(discountMethod, value)}</strong></>}
          </button>
        </div>
      )}
      {!editing && orderTypes.length > 0 && (
        <button type="button" className="link-btn ld-inline-rule__business" aria-haspopup="dialog" onClick={onOpenBusiness}>
          {businessCount ? `分业务力度（${businessCount}）` : '设置分业务力度'}
        </button>
      )}
    </div>
  )
}

function DefaultStrengthEditor({ method, label, initialValue, onCancel, onApply }: {
  method: LimitDiscountMethod
  label: string
  initialValue: number | null
  onCancel: () => void
  onApply: (value: number | null) => void
}) {
  const [value, setValue] = useState(initialValue)
  const error = value == null ? null : validateDiscountNumber(method, value, label)

  return (
    <form className="ld-inline-rule__editor" noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (!error) onApply(value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onCancel()
        }
      }}>
      <StrengthAmountInput method={method} label={label} value={value} placeholder={label} error={error} autoFocus onChange={setValue} />
      <div className="ld-inline-rule__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={Boolean(error)}>应用</button>
        <button type="button" className="btn btn--default btn--sm" onClick={onCancel}>取消</button>
      </div>
    </form>
  )
}

type BusinessStrengthDraft = { value: number | null; reset?: boolean }
const emptyBusinessStrength: BusinessStrengthDraft = { value: null }

export function LimitDiscountStrengthDialog({ activity, item, description, productCount = 1, readOnly, businessOnly = false, onConfirm, onClose }: {
  activity: LimitDiscountActivityForm
  item?: LimitDiscountProductItem
  description?: string
  productCount?: number
  readOnly?: boolean
  businessOnly?: boolean
  onConfirm: (change: LimitDiscountStrengthChange) => void
  onClose: () => void
}) {
  const { discountMethod, orderTypes } = activity
  const batch = productCount > 1
  const valueLabel = discountValueLabel(discountMethod)
  const defaultLabel = `默认${valueLabel}`
  const [defaultValue, setDefaultValue] = useState(item?.discountValue ?? null)
  const [business, setBusiness] = useState<Record<string, BusinessStrengthDraft>>(() =>
    Object.fromEntries(item ? sceneOverrides(activity, item).map(({ sceneId, value }) => [sceneId, { value }]) : []))
  const rows = orderTypes.flatMap((scene) => {
    const draft = business[scene]
    if (!draft) return []
    const label = sceneLabel(scene)
    const error = draft.value != null ? validateDiscountNumber(discountMethod, draft.value, `${label}${valueLabel}`) : null
    return [{ scene, label, draft, error }]
  })
  const defaultError = defaultValue != null ? validateDiscountNumber(discountMethod, defaultValue, defaultLabel) : null
  const error = (businessOnly ? null : defaultError) ?? rows.find((row) => row.error)?.error
  const businessChanges = batch
    ? Object.fromEntries(rows.filter(({ draft }) => draft.reset || draft.value != null).map(({ scene, draft }) => [scene, draft.value]))
    : Object.fromEntries(orderTypes.map((scene) => [scene, business[scene]?.value ?? null]))
  const emptyBatch = batch && defaultValue == null && Object.keys(businessChanges).length === 0

  function removeBusiness(scene: string) {
    setBusiness((current) => {
      const next = { ...current }
      delete next[scene]
      return next
    })
  }

  function resetBusiness() {
    setBusiness(batch ? Object.fromEntries(orderTypes.map((scene) => [scene, { value: null, reset: true }])) : {})
  }

  return (
    <LimitDiscountRuleDialog
      title={batch ? '批量设置优惠力度' : businessOnly ? '设置分业务力度' : readOnly ? '查看优惠力度' : '设置优惠力度'}
      description={batch ? `已勾选 ${productCount} 个规格` : description}
      onClose={onClose}
      onApply={() => {
        if (readOnly || emptyBatch || error) return
        const change: LimitDiscountStrengthChange = { business: businessChanges }
        if (!businessOnly && (!batch || defaultValue != null)) change.defaultValue = defaultValue
        onConfirm(change)
      }}
      footer={<>
        {!readOnly && error && <div className="ld-rule-dialog__feedback ld-strength-error" role="status">{error}</div>}
        <button type="button" className="btn btn--default" onClick={onClose}>{readOnly ? '关闭' : '取消'}</button>
        {!readOnly && <button type="submit" className="btn btn--primary" disabled={Boolean(error) || emptyBatch}>
          {batch ? `应用到 ${productCount} 个规格` : '应用力度'}
        </button>}
      </>}>
      {readOnly ? item && <LimitDiscountStrengthSummary activity={activity} item={item} expandBusiness /> : (
        <>
          {batch && <p className="ld-quota-batch-note">填写要调整的力度，留空的项目保留各规格原设置。</p>}
          {!businessOnly && <section className="ld-rule-section" aria-label="默认力度">
            <h4>{defaultLabel}</h4>
            <p className="ld-rule-section__hint">未单独设置的业务使用默认力度。</p>
            <StrengthAmountInput method={discountMethod} label={defaultLabel} value={defaultValue}
              placeholder={batch ? '不修改' : '请输入'} error={defaultError} onChange={setDefaultValue} />
          </section>}
          {orderTypes.length > 0 && (
            <section className="ld-rule-section" aria-label="分业务力度">
              <div className="ld-rule-section__head">
                {!businessOnly && <h4>分业务力度</h4>}
                <LimitDiscountBusinessSelect scenes={orderTypes.filter((scene) => !business[scene])} label="添加业务力度"
                  onAdd={(scene) => setBusiness((current) => ({ ...current, [scene]: emptyBusinessStrength }))} />
              </div>
              {batch && <p className="ld-rule-section__hint">选择「恢复默认」后，该业务使用各规格的默认力度。</p>}
              {businessOnly && (
                <p className="ld-rule-section__hint">
                  未单独设置的业务沿用默认力度。{defaultValue != null && !defaultError && `当前默认 ${formatDiscountValue(discountMethod, defaultValue)}。`}
                </p>
              )}
              {rows.length > 0 && (
                <table className="table table--compact ld-strength-table" aria-label="分业务力度">
                  <thead><tr><th scope="col">参与业务</th><th scope="col">{valueLabel}</th><th scope="col">操作</th></tr></thead>
                  <tbody>
                    {rows.map(({ scene, label, draft, error }) => (
                      <tr key={scene}>
                        <th scope="row">{label}</th>
                        <td>
                          {draft.reset ? <span className="field-hint">使用默认力度</span> : (
                            <StrengthAmountInput method={discountMethod} label={`${label}${valueLabel}`} value={draft.value}
                              placeholder={batch ? '不修改' : '使用默认'} error={error}
                              onChange={(value) => setBusiness((current) => ({ ...current, [scene]: { value } }))} />
                          )}
                        </td>
                        <td>
                          {batch && !draft.reset && <button type="button" className="link-btn" onClick={() => {
                            setBusiness((current) => ({ ...current, [scene]: { value: null, reset: true } }))
                          }}>恢复默认</button>}
                          <button type="button" className="link-btn" onClick={() => removeBusiness(scene)}>{draft.reset ? '撤销' : '移除'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {(batch || rows.length > 0) && <button type="button" className="link-btn ld-strength-reset" onClick={resetBusiness}>全部业务恢复默认</button>}
            </section>
          )}
        </>
      )}
    </LimitDiscountRuleDialog>
  )
}

function StrengthAmountInput({ method, label, value, placeholder, error, autoFocus, onChange }: {
  method: LimitDiscountMethod
  label: string
  value: number | null
  placeholder: string
  error: string | null
  autoFocus?: boolean
  onChange: (value: number | null) => void
}) {
  const errorId = useId()
  const discount = method === 'discount'
  return (
    <div className="ld-strength-field">
      <div className="ld-strength-field__control">
        <input className="input" type="number" aria-label={label} aria-invalid={Boolean(error)} autoFocus={autoFocus}
          aria-describedby={error ? errorId : undefined} placeholder={placeholder}
          min={discount ? 0.1 : 0.01} max={discount ? 9.9 : undefined} step={discount ? 0.1 : 0.01}
          value={value != null && Number.isFinite(value) ? value : ''}
          onChange={(event) => {
            const input = event.currentTarget
            onChange(input.value === '' && !input.validity.badInput ? null : input.valueAsNumber)
          }} />
        <span>{discountUnit(method)}</span>
      </div>
      {error && <p className="ld-strength-error" id={errorId}>{error}</p>}
    </div>
  )
}
