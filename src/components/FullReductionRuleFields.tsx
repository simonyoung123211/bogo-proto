import type {
  FullReductionActivityForm,
  FullReductionDiscountType,
  FullReductionThresholdType,
  FullReductionTier,
  WizardMode,
} from '../types'
import { createDefaultTier, DISCOUNT_TYPE_LABELS, MAX_TIERS } from '../mockFullReductionData'
import {
  canChangeThresholdType,
  applyDinerCountScope,
  getDiscountUnit,
  getThresholdTypeLabel,
  getThresholdUnit,
} from '../utils/fullReductionActivity'

interface FullReductionRuleFieldsProps {
  activity: FullReductionActivityForm
  mode: WizardMode
  readOnly?: boolean
  onChange: (activity: FullReductionActivityForm) => void
}

const THRESHOLD_OPTIONS: { value: FullReductionThresholdType; label: string; hint?: string }[] = [
  { value: 'order_amount', label: '满订单金额' },
  { value: 'item_count', label: '满商品件数' },
  { value: 'diner_count', label: '满点餐人数', hint: '仅微信渠道的拼单业务可参与' },
]

export function FullReductionRuleFields({ activity, mode, readOnly, onChange }: FullReductionRuleFieldsProps) {
  const thresholdLocked = !canChangeThresholdType(activity.status, mode)
  const unit = getThresholdUnit(activity.thresholdType)

  const changeThresholdType = (type: FullReductionThresholdType) => {
    if (thresholdLocked || readOnly) return
    const tiers = createDefaultTier()
    const next: FullReductionActivityForm = {
      ...activity,
      thresholdType: type,
      tiers,
      cyclicThreshold: tiers[0].threshold,
      cyclicDiscountType: tiers[0].discountType,
      cyclicDiscountValue: tiers[0].discountValue,
    }
    if (type === 'diner_count') {
      Object.assign(next, applyDinerCountScope(next))
    }
    onChange(next)
  }

  const updateTier = (tiers: FullReductionTier[]) => {
    onChange({ ...activity, tiers })
  }

  const updateTierAt = (index: number, patch: Partial<FullReductionTier>) => {
    updateTier(activity.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  const changeTierDiscountType = (index: number, discountType: FullReductionDiscountType) => {
    const patch: Partial<FullReductionTier> = { discountType }
    if (discountType === 'percent_off') {
      patch.discountValue = 9.9
    } else if (activity.tiers[index].discountType === 'percent_off') {
      patch.discountValue = 0.01
    }
    updateTierAt(index, patch)
  }

  const changeCyclicDiscountType = (discountType: FullReductionDiscountType) => {
    onChange({
      ...activity,
      cyclicDiscountType: discountType,
      cyclicDiscountValue: discountType === 'percent_off'
        ? 9.9
        : activity.cyclicDiscountType === 'percent_off'
          ? 0.01
          : activity.cyclicDiscountValue,
    })
  }

  const addTier = () => {
    if (activity.tiers.length >= MAX_TIERS || readOnly) return
    const last = activity.tiers[activity.tiers.length - 1]
    updateTier([
      ...activity.tiers,
      {
        id: `tier-${Date.now()}`,
        threshold: (last?.threshold ?? 0) + 1,
        discountType: last?.discountType ?? 'amount_off',
        discountValue: last?.discountValue ?? 0.01,
      },
    ])
  }

  const removeTier = (index: number) => {
    if (activity.tiers.length <= 1 || readOnly) return
    updateTier(activity.tiers.filter((_, i) => i !== index))
  }

  return (
    <>
      <FormRow label="门槛类型" required>
        <div>
          {thresholdLocked ? (
            <div>
              <span className="rule-tag">{getThresholdTypeLabel(activity.thresholdType)}</span>
              <p className="field-hint">已发布或进行中的活动不可修改门槛类型</p>
            </div>
          ) : (
            <div className="radio-group radio-group--vertical">
              {THRESHOLD_OPTIONS.map((opt) => (
                <label key={opt.value} className="radio">
                  <input
                    type="radio"
                    disabled={readOnly}
                    checked={activity.thresholdType === opt.value}
                    onChange={() => changeThresholdType(opt.value)}
                  />
                  {opt.label}
                  {opt.hint && <span className="field-hint" style={{ display: 'inline', marginLeft: 8 }}>{opt.hint}</span>}
                </label>
              ))}
            </div>
          )}
        </div>
      </FormRow>

      <FormRow label="优惠设置" required>
        <div>
          <RadioGroup
            disabled={readOnly}
            value={activity.promoMode}
            options={[
              { value: 'tiered', label: '阶梯满减' },
              { value: 'cyclic', label: '循环满减' },
            ]}
            onChange={(v) => onChange({ ...activity, promoMode: v as FullReductionActivityForm['promoMode'] })}
          />

          {activity.promoMode === 'tiered' ? (
            <div className="fr-tier-table-wrap">
              <table className="table fr-tier-table">
                <thead>
                  <tr>
                    <th>门槛条件</th>
                    <th>优惠类型</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.tiers.map((tier, index) => (
                    <tr key={tier.id}>
                      <td>
                        <span className="fr-tier-inline">
                          满
                          <NumberInput
                            disabled={readOnly}
                            value={tier.threshold}
                            min={activity.thresholdType === 'order_amount' ? 0.01 : 1}
                            step={activity.thresholdType === 'order_amount' ? 0.01 : 1}
                            onChange={(v) => updateTierAt(index, { threshold: v })}
                          />
                          {unit}
                        </span>
                      </td>
                      <td>
                        <span className="fr-tier-inline">
                          <select
                            className="input"
                            disabled={readOnly}
                            value={tier.discountType}
                            onChange={(e) => changeTierDiscountType(index, e.target.value as FullReductionDiscountType)}
                          >
                            {(Object.keys(DISCOUNT_TYPE_LABELS) as FullReductionDiscountType[]).map((k) => (
                              <option key={k} value={k}>{DISCOUNT_TYPE_LABELS[k]}</option>
                            ))}
                          </select>
                          <NumberInput
                            disabled={readOnly}
                            value={tier.discountValue}
                            min={tier.discountType === 'percent_off' ? 0 : 0.01}
                            max={tier.discountType === 'percent_off' ? 9.9 : undefined}
                            step={0.01}
                            onChange={(v) => updateTierAt(index, { discountValue: v })}
                          />
                          {getDiscountUnit(tier.discountType)}
                        </span>
                      </td>
                      <td>
                        {index > 0 && !readOnly && (
                          <button type="button" className="link-btn" onClick={() => removeTier(index)}>删除</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!readOnly && (
                <div className="fr-tier-footer">
                  <button
                    type="button"
                    className="link-btn"
                    disabled={activity.tiers.length >= MAX_TIERS}
                    onClick={addTier}
                  >
                    + 新增优惠
                  </button>
                  <span className="field-hint">
                    还可以添加 {Math.max(0, MAX_TIERS - activity.tiers.length)} 个阶梯，一共可设置 {MAX_TIERS} 个阶梯
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="fr-tier-inline" style={{ marginTop: 12 }}>
              每满
              <NumberInput
                disabled={readOnly}
                value={activity.cyclicThreshold}
                min={activity.thresholdType === 'order_amount' ? 0.01 : 1}
                step={activity.thresholdType === 'order_amount' ? 0.01 : 1}
                onChange={(v) => onChange({ ...activity, cyclicThreshold: v })}
              />
              {unit}，
              <select
                className="input"
                disabled={readOnly}
                value={activity.cyclicDiscountType}
                onChange={(e) => changeCyclicDiscountType(e.target.value as FullReductionDiscountType)}
              >
                {(Object.keys(DISCOUNT_TYPE_LABELS) as FullReductionDiscountType[]).map((k) => (
                  <option key={k} value={k}>{DISCOUNT_TYPE_LABELS[k]}</option>
                ))}
              </select>
              <NumberInput
                disabled={readOnly}
                value={activity.cyclicDiscountValue}
                min={activity.cyclicDiscountType === 'percent_off' ? 0 : 0.01}
                max={activity.cyclicDiscountType === 'percent_off' ? 9.9 : undefined}
                step={0.01}
                onChange={(v) => onChange({ ...activity, cyclicDiscountValue: v })}
              />
              {getDiscountUnit(activity.cyclicDiscountType)}
            </div>
          )}
        </div>
      </FormRow>
    </>
  )
}

function NumberInput({
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      className="input input--num"
      disabled={disabled}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{required && <span className="required">*</span>}{label}</label>
      <div className="form-control">{children}</div>
    </div>
  )
}

function RadioGroup({ value, options, onChange, disabled }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input type="radio" disabled={disabled} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}
