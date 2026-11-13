import { useEffect } from 'react'
import type { BundlePriceActivityForm, BundlePriceConditionMode, BundlePriceHitRule, BundlePriceTier } from '../types'
import { MAX_BUNDLE_PRICE_TIERS } from '../mockBundlePriceData'

function resolvePriceHitRule(rule: BundlePriceHitRule | undefined): BundlePriceHitRule {
  return rule === 'low_to_high' ? 'low_to_high' : 'high_to_low'
}

interface BundlePriceRuleFieldsProps {
  activity: BundlePriceActivityForm
  readOnly?: boolean
  onChange: (activity: BundlePriceActivityForm) => void
}

export function BundlePriceRuleFields({ activity, readOnly, onChange }: BundlePriceRuleFieldsProps) {
  const cyclicQuantity = Number(activity.cyclicQuantity) > 0 ? activity.cyclicQuantity : 3
  const cyclicPrice = Number(activity.cyclicPrice) > 0 ? activity.cyclicPrice : 9.9
  const priceHitRule = resolvePriceHitRule(activity.priceHitRule)

  useEffect(() => {
    if (readOnly) return
    const missingMode = activity.conditionMode !== 'cyclic' && activity.conditionMode !== 'tiered'
    const missingCyclic = !(Number(activity.cyclicQuantity) > 0) || !(Number(activity.cyclicPrice) > 0)
    const missingHit = activity.priceHitRule !== 'high_to_low' && activity.priceHitRule !== 'low_to_high'
    if (!missingMode && !missingCyclic && !missingHit) return
    onChange({
      ...activity,
      conditionMode: missingMode ? 'tiered' : activity.conditionMode,
      cyclicQuantity: Number(activity.cyclicQuantity) > 0 ? activity.cyclicQuantity : 3,
      cyclicPrice: Number(activity.cyclicPrice) > 0 ? activity.cyclicPrice : 9.9,
      priceHitRule: resolvePriceHitRule(activity.priceHitRule),
    })
  }, [activity, onChange, readOnly])

  const updateMode = (conditionMode: BundlePriceConditionMode) => {
    onChange({
      ...activity,
      conditionMode,
      cyclicQuantity,
      cyclicPrice,
      priceHitRule,
    })
  }

  const updateTiers = (tiers: BundlePriceTier[]) => {
    onChange({ ...activity, tiers })
  }

  const updateTierAt = (index: number, patch: Partial<BundlePriceTier>) => {
    updateTiers(activity.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)))
  }

  const addTier = () => {
    if (readOnly || activity.tiers.length >= MAX_BUNDLE_PRICE_TIERS) return
    const last = activity.tiers[activity.tiers.length - 1]
    updateTiers([
      ...activity.tiers,
      {
        id: `tier-${Date.now()}`,
        quantity: (last?.quantity ?? 0) + 1,
        price: Math.round(((last?.price ?? 0) + 1) * 100) / 100,
      },
    ])
  }

  const removeTier = (index: number) => {
    if (readOnly || activity.tiers.length <= 1) return
    updateTiers(activity.tiers.filter((_, i) => i !== index))
  }

  return (
    <>
      <FormRow label="活动条件" required>
        <div>
          <div className="radio-group">
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={activity.conditionMode === 'cyclic'}
                onChange={() => updateMode('cyclic')}
              />
              每满设置
            </label>
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={activity.conditionMode === 'tiered'}
                onChange={() => updateMode('tiered')}
              />
              阶梯设置
            </label>
          </div>

          {activity.conditionMode === 'cyclic' ? (
            <div className="bp-condition">
              <div className="fr-tier-inline">
                每满
                <NumberInput
                  disabled={readOnly}
                  value={cyclicQuantity}
                  min={1}
                  step={1}
                  onChange={(v) => onChange({ ...activity, cyclicQuantity: v, cyclicPrice, priceHitRule })}
                />
                件，合计
                <NumberInput
                  disabled={readOnly}
                  value={cyclicPrice}
                  min={0.01}
                  step={0.01}
                  onChange={(v) => onChange({ ...activity, cyclicPrice: v, cyclicQuantity, priceHitRule })}
                />
                元
              </div>
              <p className="field-hint">
                每满指定件数按打包价结算一组，买够多组可循环。例如每满 3 件 9.9 元，买 6 件为两组共 19.8 元；不足一组的剩余件数按原价。
              </p>
              <p className="field-hint">
                哪些商品进入打包价，由下方优惠命中规则决定。若一组打包价高于对应商品原价合计，该组不使用本活动。
              </p>
            </div>
          ) : (
            <div className="bp-condition">
              {activity.tiers.map((tier, index) => (
                <div key={tier.id} className="bp-condition__row">
                  <span className="fr-tier-inline">
                    满足
                    <NumberInput
                      disabled={readOnly}
                      value={tier.quantity}
                      min={1}
                      step={1}
                      onChange={(v) => updateTierAt(index, { quantity: v })}
                    />
                    件，
                    <NumberInput
                      disabled={readOnly}
                      value={tier.price}
                      min={0.01}
                      step={0.01}
                      onChange={(v) => updateTierAt(index, { price: v })}
                    />
                    元
                  </span>
                  {!readOnly && activity.tiers.length > 1 && (
                    <button type="button" className="link-btn" onClick={() => removeTier(index)}>删除</button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  className="link-btn"
                  disabled={activity.tiers.length >= MAX_BUNDLE_PRICE_TIERS}
                  onClick={addTier}
                >
                  + 新增一级
                </button>
              )}
              <p className="field-hint">
                最多支持 {MAX_BUNDLE_PRICE_TIERS} 级，下一级件数和一口价金额都必须大于上一级。按已达到的最高一级结算，未凑满下一档的剩余件数按原价。
              </p>
              <p className="field-hint">
                件数超出已达到的档位时，超出部分按原价。件数未达到任一档时按原价，不参与活动。哪些商品进入打包价，由下方优惠命中规则决定。若打包价高于这些商品的原价合计，结算时不使用本活动。
              </p>
            </div>
          )}
        </div>
      </FormRow>

      <FormRow label="优惠命中规则" required>
        <div>
          <div className="radio-group">
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={priceHitRule === 'high_to_low'}
                onChange={() => onChange({ ...activity, priceHitRule: 'high_to_low', cyclicQuantity, cyclicPrice })}
              />
              按商品售价从高到低
            </label>
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={priceHitRule === 'low_to_high'}
                onChange={() => onChange({ ...activity, priceHitRule: 'low_to_high', cyclicQuantity, cyclicPrice })}
              />
              按商品售价从低到高
            </label>
          </div>
          <p className="field-hint">
            {priceHitRule === 'low_to_high'
              ? '件数凑够后，售价更低的活动商品优先进入打包价，售价更高的按原价。'
              : '件数凑够后，售价更高的活动商品优先进入打包价，售价更低的按原价。'}
          </p>
        </div>
      </FormRow>
    </>
  )
}

function NumberInput({
  value,
  min,
  step,
  disabled,
  onChange,
}: {
  value: number
  min?: number
  step?: number
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      className="input input--num"
      disabled={disabled}
      value={Number.isFinite(value) ? value : ''}
      min={min}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
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
