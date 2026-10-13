import { useState } from 'react'
import { CityRegionPicker } from './CityRegionPicker'
import {
  DISCOUNT_METHOD_LABELS,
  MAX_TIERS,
  THRESHOLD_TYPE_OPTIONS,
} from '../mockDeliveryFeeData'
import type {
  DeliveryFeeActivityForm,
  DeliveryFeeDiscountMethod,
  DeliveryFeeThresholdType,
  DeliveryFeeTier,
  ParticipationPeriod,
} from '../types'
import {
  applyRuleModeChange,
  getCityNames,
  hasExpress,
  hasTakeaway,
  normalizeTiersForThresholdType,
} from '../utils/deliveryFeeActivity'

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

interface DeliveryFeeRuleFieldsProps {
  activity: DeliveryFeeActivityForm
  readOnly?: boolean
  onChange: (activity: DeliveryFeeActivityForm) => void
  onToast?: (message: string) => void
}

export function DeliveryFeeRuleFields({ activity, readOnly, onChange, onToast }: DeliveryFeeRuleFieldsProps) {
  /** 方案 B：勾选门店快递即露出（可与外卖并存展示；指定城市时再与外卖互斥） */
  const showRegion = hasExpress(activity)
  const byCity = showRegion && activity.ruleMode === 'by_city'
  const [pickerOpen, setPickerOpen] = useState(false)

  const update = (patch: Partial<DeliveryFeeActivityForm>) => onChange({ ...activity, ...patch })

  const setRuleMode = (mode: DeliveryFeeActivityForm['ruleMode']) => {
    if (readOnly) return
    const strippingTakeaway = mode === 'by_city' && hasTakeaway(activity)
    onChange(applyRuleModeChange(activity, mode))
    if (strippingTakeaway) {
      onToast?.('已去掉外卖类业务：指定城市仅对门店快递生效')
    }
  }

  const setThresholdType = (thresholdType: DeliveryFeeThresholdType) => {
    if (readOnly) return
    onChange({
      ...activity,
      thresholdType,
      tiers: normalizeTiersForThresholdType(activity.tiers, thresholdType),
    })
  }

  const thresholdRadios = (
    <div>
      <div className="radio-group">
        {THRESHOLD_TYPE_OPTIONS.map((opt) => (
          <label key={opt.value} className="radio">
            <input
              type="radio"
              disabled={readOnly}
              checked={activity.thresholdType === opt.value}
              onChange={() => setThresholdType(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {activity.thresholdType === 'none' && (
        <p className="field-hint">无门槛时仅配置一条优惠规则；立减金额最高 999 元。</p>
      )}
    </div>
  )

  return (
    <>
      {showRegion && (
        <FormRow label="收货城市" required>
          <div>
            <div className="radio-group">
              <label className="radio">
                <input
                  type="radio"
                  disabled={readOnly}
                  checked={activity.ruleMode === 'national'}
                  onChange={() => setRuleMode('national')}
                />
                全国
              </label>
              <label className="radio">
                <input
                  type="radio"
                  disabled={readOnly}
                  checked={activity.ruleMode === 'by_city'}
                  onChange={() => setRuleMode('by_city')}
                />
                指定城市
              </label>
            </div>
            {activity.ruleMode === 'by_city' ? (
              <p className="field-hint">
                仅所选城市的快递订单可减免，其他城市不享受；不可同时勾选外卖。
              </p>
            ) : (
              <p className="field-hint">
                全国收货城市均可享受本活动减免，可与外卖等业务一起使用。
              </p>
            )}
          </div>
        </FormRow>
      )}

      {!byCity && (
        <>
          <FormRow label="活动门槛" required>
            {thresholdRadios}
          </FormRow>

          <FormRow label="优惠阶梯" required>
            <TierEditor
              tiers={activity.tiers}
              thresholdType={activity.thresholdType}
              readOnly={readOnly}
              onChange={(tiers) => update({ tiers })}
            />
          </FormRow>
        </>
      )}

      {byCity && (
        <FormRow label="城市规则组" required>
          <div className="df-rule-groups">
            <div className="df-rule-card">
              <div className="df-rule-card__block">
                <div className="df-rule-card__label"><span className="required">*</span>适用城市</div>
                <div className="df-city-tags">
                  {activity.cityIds.length === 0 ? (
                    <span className="text-secondary">尚未选择城市</span>
                  ) : (
                    activity.cityIds.map((id) => (
                      <span key={id} className="df-city-tag">
                        {getCityNames([id])}
                        {!readOnly && (
                          <button
                            type="button"
                            className="df-city-tag__remove"
                            aria-label={`删除${getCityNames([id])}`}
                            onClick={() => update({
                              cityIds: activity.cityIds.filter((cityId) => cityId !== id),
                            })}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
                {!readOnly && (
                  <div className="df-city-actions">
                    <button
                      type="button"
                      className="btn btn--default btn--sm"
                      onClick={() => setPickerOpen(true)}
                    >
                      选择城市
                    </button>
                    {activity.cityIds.length > 0 && (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => update({ cityIds: [] })}
                      >
                        清空
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="df-rule-card__block">
                <div className="df-rule-card__label"><span className="required">*</span>活动门槛</div>
                {thresholdRadios}
              </div>

              <div className="df-rule-card__block">
                <div className="df-rule-card__label"><span className="required">*</span>优惠阶梯</div>
                <TierEditor
                  tiers={activity.tiers}
                  thresholdType={activity.thresholdType}
                  readOnly={readOnly}
                  onChange={(tiers) => update({ tiers })}
                />
              </div>
            </div>
            <p className="field-hint">活动仅支持 1 组城市规则；未命中以上城市的快递订单本活动不减免配送费。</p>
          </div>
        </FormRow>
      )}

      {activity.thresholdType === 'amount' && (
        <>
          <FormRow label="门槛基础计算">
            <div className="radio-group">
              <label className="radio">
                <input
                  type="radio"
                  disabled={readOnly}
                  checked={activity.thresholdBase === 'sale_price'}
                  onChange={() => update({ thresholdBase: 'sale_price' })}
                />
                商品售价小计
              </label>
              <label className="radio">
                <input
                  type="radio"
                  disabled={readOnly}
                  checked={activity.thresholdBase === 'promo_price'}
                  onChange={() => update({ thresholdBase: 'promo_price' })}
                />
                活动价小计
              </label>
            </div>
          </FormRow>

          <FormRow label="门槛金额">
            <div className="checkbox-group checkbox-group--wrap">
              <label className="checkbox">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={activity.includeToppings}
                  onChange={(e) => update({ includeToppings: e.target.checked })}
                />
                包含加料商品价格
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={activity.includePackagingFee}
                  onChange={(e) => update({ includePackagingFee: e.target.checked })}
                />
                包含打包费/餐盒费
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={activity.includePreparationSurcharge}
                  onChange={(e) => update({ includePreparationSurcharge: e.target.checked })}
                />
                包含做法加价金额
              </label>
            </div>
          </FormRow>
        </>
      )}

      <FormRow label="用户参与活动总次数（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.totalParticipationLimitType === 'limited'}
            onCheckedChange={(on) => update({
              totalParticipationLimitType: on ? 'limited' : 'unlimited',
            })}
            label={
              <>
                限制该活动期间每个用户最多优惠
                <NumberStepper
                  disabled={readOnly || activity.totalParticipationLimitType !== 'limited'}
                  value={activity.totalParticipationLimit}
                  onChange={(v) => update({ totalParticipationLimit: v })}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            比如设置活动期间内每个用户最多优惠20单，则该用户在活动期间内享受20单之后不再享受减配送费优惠
          </p>
        </div>
      </FormRow>

      <FormRow label="用户参与活动频次（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.participationFrequencyType === 'limited'}
            onCheckedChange={(on) => update({
              participationFrequencyType: on ? 'limited' : 'unlimited',
            })}
            label={
              <>
                <select
                  className="input input--period"
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyPeriod}
                  onChange={(e) => update({
                    participationFrequencyPeriod: e.target.value as ParticipationPeriod,
                  })}
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                最多优惠
                <NumberStepper
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyLimit}
                  onChange={(v) => update({ participationFrequencyLimit: v })}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            若设置每天最多优惠2单，则用户当天内第3单不享受减配送费优惠
          </p>
        </div>
      </FormRow>

      {pickerOpen && (
        <CityRegionPicker
          selectedIds={activity.cityIds}
          onConfirm={(cityIds) => update({ cityIds })}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}

/** 金额保留最多 2 位小数，避免浮点误差（如 10.01+10 → 20.009999…） */
function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100
}

function TierEditor({
  tiers,
  thresholdType,
  readOnly,
  onChange,
}: {
  tiers: DeliveryFeeTier[]
  thresholdType: DeliveryFeeThresholdType
  readOnly?: boolean
  onChange: (tiers: DeliveryFeeTier[]) => void
}) {
  const updateAt = (index: number, patch: Partial<DeliveryFeeTier>) => {
    onChange(tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  const changeMethod = (index: number, discountMethod: DeliveryFeeDiscountMethod) => {
    const patch: Partial<DeliveryFeeTier> = { discountMethod }
    if (discountMethod === 'percent_off') patch.discountValue = 9
    else if (discountMethod === 'waive') patch.discountValue = 0
    else if (tiers[index].discountMethod !== 'amount_off') patch.discountValue = 0.1
    updateAt(index, patch)
  }

  const setAmountThreshold = (index: number, raw: number) => {
    updateAt(index, { threshold: Math.max(0.01, roundMoney(raw)) })
  }

  const setDiscountAmount = (index: number, raw: number) => {
    updateAt(index, { discountValue: Math.min(999, Math.max(0.01, roundMoney(raw))) })
  }

  const canAddTier = thresholdType !== 'none' && tiers.length < MAX_TIERS
  const thrUnit = thresholdType === 'item_count' ? '件' : '元'
  const thrLabel = thresholdType === 'item_count' ? '订单件数满' : '订单金额满'
  const thrStep = thresholdType === 'item_count' ? 1 : 0.01
  const thrMin = thresholdType === 'item_count' ? 1 : 0.01

  return (
    <div className="fr-tier-table-wrap">
      <table className="table fr-tier-table">
        <thead>
          <tr>
            <th>门槛条件</th>
            <th>优惠方式</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, index) => (
            <tr key={tier.id}>
              <td>
                {thresholdType === 'none' ? (
                  <span className="text-secondary">无门槛</span>
                ) : (
                  <span className="fr-tier-inline">
                    {thrLabel}
                    <input
                      className="input input--sm"
                      type="number"
                      min={thrMin}
                      step={thrStep}
                      disabled={readOnly}
                      value={thresholdType === 'amount' ? roundMoney(tier.threshold) : tier.threshold}
                      onChange={(e) => {
                        const raw = Number(e.target.value)
                        if (thresholdType === 'amount') setAmountThreshold(index, raw)
                        else updateAt(index, { threshold: Math.max(1, Math.round(raw || 1)) })
                      }}
                    />
                    {thrUnit}
                  </span>
                )}
              </td>
              <td>
                <span className="fr-tier-inline">
                  <select
                    className="input"
                    disabled={readOnly}
                    value={tier.discountMethod}
                    onChange={(e) => changeMethod(index, e.target.value as DeliveryFeeDiscountMethod)}
                  >
                    {(Object.keys(DISCOUNT_METHOD_LABELS) as DeliveryFeeDiscountMethod[]).map((k) => (
                      <option key={k} value={k}>{DISCOUNT_METHOD_LABELS[k]}</option>
                    ))}
                  </select>
                  {tier.discountMethod === 'amount_off' && (
                    <>
                      <input
                        className="input input--sm"
                        type="number"
                        min={0.01}
                        max={999}
                        step={0.01}
                        disabled={readOnly}
                        value={roundMoney(tier.discountValue)}
                        onChange={(e) => setDiscountAmount(index, Number(e.target.value))}
                      />
                      元
                    </>
                  )}
                  {tier.discountMethod === 'percent_off' && (
                    <>
                      <input
                        className="input input--sm"
                        type="number"
                        min={0.1}
                        max={9.9}
                        step={0.1}
                        disabled={readOnly}
                        value={tier.discountValue}
                        onChange={(e) => updateAt(index, { discountValue: Number(e.target.value) })}
                      />
                      折
                    </>
                  )}
                  {tier.discountMethod === 'waive' && <span className="text-secondary">免除全部配送费</span>}
                </span>
              </td>
              <td>
                {index > 0 && !readOnly && thresholdType !== 'none' && (
                  <button type="button" className="link-btn" onClick={() => onChange(tiers.filter((_, i) => i !== index))}>
                    删除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && canAddTier && (
        <div className="fr-tier-footer">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              const last = tiers[tiers.length - 1]
              const nextThreshold = thresholdType === 'item_count'
                ? Math.max(1, Math.round((last?.threshold ?? thrMin) + 1))
                : roundMoney((last?.threshold ?? thrMin) + 10)
              const nextDiscount = last?.discountMethod === 'waive'
                ? 0.1
                : last?.discountMethod === 'amount_off'
                  ? roundMoney(last?.discountValue ?? 0.1)
                  : (last?.discountValue ?? 0.1)
              onChange([
                ...tiers,
                {
                  id: `tier-${Date.now()}`,
                  threshold: nextThreshold,
                  discountMethod: last?.discountMethod === 'waive' ? 'amount_off' : (last?.discountMethod ?? 'amount_off'),
                  discountValue: nextDiscount,
                },
              ])
            }}
          >
            + 添加优惠阶梯
          </button>
        </div>
      )}
    </div>
  )
}

function CheckboxLimit({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (on: boolean) => void
  label: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label className="checkbox limit-checkbox">
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
      <span className="limit-checkbox__content">{label}</span>
    </label>
  )
}

function NumberStepper({ value, onChange, disabled, min = 1 }: {
  value: number; onChange: (v: number) => void; disabled?: boolean; min?: number
}) {
  return (
    <input
      type="number"
      className="input input--num"
      disabled={disabled}
      min={min}
      value={value}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
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
