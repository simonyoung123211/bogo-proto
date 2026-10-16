import type { BundlePriceActivityForm, BundlePriceTier } from '../types'
import { MAX_BUNDLE_PRICE_TIERS } from '../mockBundlePriceData'

interface BundlePriceRuleFieldsProps {
  activity: BundlePriceActivityForm
  readOnly?: boolean
  onChange: (activity: BundlePriceActivityForm) => void
}

export function BundlePriceRuleFields({ activity, readOnly, onChange }: BundlePriceRuleFieldsProps) {
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
      <FormRow label="优惠方式" required>
        <div>
          <span className="rule-tag">特价（打包一口价）</span>
          <p className="field-hint">
            一口价只支持特价：凑满指定件数后，这些件数合计按一个打包价结算。不提供折扣、立减。
          </p>
          <p className="field-hint">
            与「第 N 件优惠」不同：满 3 件一口价 9.9 元，是这 3 件一共 9.9 元，不是其中 1 件特价 9.9 元。
          </p>
        </div>
      </FormRow>

      <FormRow label="计件范围">
        <div>
          <span className="rule-tag">任意活动商品合计</span>
          <p className="field-hint">不同活动商品的件数可以凑在一起计算。此项固定，不可改为同商品或单品。</p>
        </div>
      </FormRow>

      <FormRow label="命中方式">
        <div>
          <span className="rule-tag">阶梯就高</span>
          <p className="field-hint">
            按顾客已达到的最高一级结算。未凑满下一档的剩余件数按原价。本期不做「每满 M 件」循环打包。
          </p>
        </div>
      </FormRow>

      <FormRow label="优惠阶梯" required>
        <div>
          <div className="fr-tier-table-wrap">
            <table className="table fr-tier-table">
              <thead>
                <tr>
                  <th>件数门槛</th>
                  <th>打包一口价</th>
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
                          value={tier.quantity}
                          min={1}
                          step={1}
                          onChange={(v) => updateTierAt(index, { quantity: v })}
                        />
                        件
                      </span>
                    </td>
                    <td>
                      <span className="fr-tier-inline">
                        合计
                        <NumberInput
                          disabled={readOnly}
                          value={tier.price}
                          min={0.01}
                          step={0.01}
                          onChange={(v) => updateTierAt(index, { price: v })}
                        />
                        元
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
                  disabled={activity.tiers.length >= MAX_BUNDLE_PRICE_TIERS}
                  onClick={addTier}
                >
                  + 新增一级
                </button>
                <span className="field-hint">
                  还可以添加 {Math.max(0, MAX_BUNDLE_PRICE_TIERS - activity.tiers.length)} 级，一共最多 {MAX_BUNDLE_PRICE_TIERS} 级。下一级件数和金额都必须大于上一级。
                </span>
              </div>
            )}
          </div>
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
