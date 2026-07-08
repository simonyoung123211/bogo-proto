import type { DiscountMethod, MultiItemActivityForm, MultiItemRuleType, SkuThresholdMode } from '../types'
import { DISCOUNT_METHOD_LABELS, MULTI_ITEM_RULE_LABELS, SKU_THRESHOLD_LABELS } from '../mockMultiItemData'
import { formatDiscountValue, getRuleExample, getRuleHint, normalizeDiscountHitRule } from '../utils/multiItemActivity'

interface MultiItemRuleFieldsProps {
  activity: MultiItemActivityForm
  readOnly?: boolean
  onChange: (activity: MultiItemActivityForm) => void
}

const RULE_TYPE_OPTIONS: { value: MultiItemRuleType; label: string }[] = [
  { value: 'nth_item', label: '第N件优惠' },
  { value: 'every_n_items', label: '每N件优惠' },
  { value: 'reach_m_discount_n', label: '满M件N件优惠' },
  { value: 'every_reach_m_discount_n', label: '每满M件N件优惠' },
]

const PRODUCT_SCOPE_OPTIONS: { value: SkuThresholdMode; label: string }[] = [
  { value: 'same_sku', label: '同一活动商品' },
  { value: 'cross_sku', label: '任意活动商品' },
]

const DISCOUNT_OPTIONS: { value: DiscountMethod; label: string }[] = [
  { value: 'discount', label: '折扣' },
  { value: 'fixed_reduction', label: '立减' },
  { value: 'special_price', label: '特价' },
]

export function MultiItemRuleFields({ activity, readOnly, onChange }: MultiItemRuleFieldsProps) {
  const update = <K extends keyof MultiItemActivityForm>(key: K, value: MultiItemActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <>
      <FormRow label="规则类型" required>
        <RadioGroup
          disabled={readOnly}
          value={activity.ruleType}
          options={RULE_TYPE_OPTIONS}
          onChange={(v) => {
            const ruleType = v as MultiItemRuleType
            onChange({
              ...activity,
              ruleType,
              discountHitRule: normalizeDiscountHitRule(ruleType, activity.discountHitRule),
            })
          }}
        />
      </FormRow>

      <FormRow label="优惠方式" required>
        <RadioGroup
          disabled={readOnly}
          value={activity.discountMethod}
          options={DISCOUNT_OPTIONS}
          onChange={(v) => update('discountMethod', v as DiscountMethod)}
        />
      </FormRow>

      <FormRow label="优惠力度" required>
        <div className="rule-sentence">
          <span>购买</span>
          <select
            className="input rule-sentence__select"
            disabled={readOnly}
            value={activity.skuThresholdMode}
            onChange={(e) => update('skuThresholdMode', e.target.value as SkuThresholdMode)}
          >
            {PRODUCT_SCOPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {activity.ruleType === 'nth_item' && (
            <>
              <span>第</span>
              <NumberInput
                disabled={readOnly}
                value={activity.targetNth}
                min={2}
                onChange={(v) => update('targetNth', v)}
              />
              <span>件</span>
            </>
          )}
          {activity.ruleType === 'every_n_items' && (
            <>
              <span>每买</span>
              <NumberInput
                disabled={readOnly}
                value={activity.everyN}
                min={2}
                onChange={(v) => update('everyN', v)}
              />
              <span>件，其中 1 件</span>
            </>
          )}
          {(activity.ruleType === 'reach_m_discount_n' || activity.ruleType === 'every_reach_m_discount_n') && (
            <>
              <span>{activity.ruleType === 'reach_m_discount_n' ? '满' : '每满'}</span>
              <NumberInput
                disabled={readOnly}
                value={activity.thresholdM}
                min={2}
                onChange={(v) => update('thresholdM', v)}
              />
              <span>件，其中</span>
              <NumberInput
                disabled={readOnly}
                value={activity.discountCountN}
                min={1}
                max={activity.thresholdM}
                onChange={(v) => update('discountCountN', v)}
              />
              <span>件</span>
            </>
          )}
          {activity.discountMethod === 'discount' && (
            <>
              <span>打</span>
              <DecimalInput
                disabled={readOnly}
                value={activity.discountValue}
                onChange={(v) => update('discountValue', v)}
              />
              <span>折</span>
            </>
          )}
          {activity.discountMethod === 'fixed_reduction' && (
            <>
              <span>立减</span>
              <DecimalInput
                disabled={readOnly}
                value={activity.discountValue}
                onChange={(v) => update('discountValue', v)}
              />
              <span>元</span>
            </>
          )}
          {activity.discountMethod === 'special_price' && (
            <>
              <span>特价</span>
              <DecimalInput
                disabled={readOnly}
                value={activity.discountValue}
                onChange={(v) => update('discountValue', v)}
              />
              <span>元</span>
            </>
          )}
        </div>
        <p className="field-hint">
          {activity.skuThresholdMode === 'same_sku'
            ? '同一活动商品：各商品独立计算门槛与优惠，互不影响。'
            : '任意活动商品：活动内参与商品合并计算门槛与优惠件数。'}
        </p>
        <p className="field-hint rule-hint-box">
          <strong>{MULTI_ITEM_RULE_LABELS[activity.ruleType]}</strong>
          ：{getRuleHint(activity)}
        </p>
        <p className="field-hint">
          示例：{getRuleExample(activity)}（{formatDiscountValue(activity.discountMethod, activity.discountValue)}）
        </p>
      </FormRow>
    </>
  )
}

function NumberInput({
  value,
  onChange,
  disabled,
  min = 1,
  max,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      className="input input--inline-num"
      disabled={disabled}
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        let n = Number(e.target.value) || min
        if (max != null) n = Math.min(max, n)
        onChange(Math.max(min, n))
      }}
    />
  )
}

function DecimalInput({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <input
      type="number"
      className="input input--inline-num"
      disabled={disabled}
      min={0.1}
      step={0.1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  )
}

function FormRow({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="form-row">
      <label className="form-label">
        {required && <span className="required">*</span>}
        {label}
      </label>
      <div className="form-control">{children}</div>
    </div>
  )
}

function RadioGroup({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input
            type="radio"
            disabled={disabled}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

export function formatMultiItemRulePreview(activity: MultiItemActivityForm) {
  return {
    ruleType: MULTI_ITEM_RULE_LABELS[activity.ruleType],
    skuMode: SKU_THRESHOLD_LABELS[activity.skuThresholdMode],
    discountMethod: DISCOUNT_METHOD_LABELS[activity.discountMethod],
    example: getRuleExample(activity),
  }
}
