import type { ActivityForm, LimitType, ParticipationPeriod } from '../types'
import { getMinMaxDiscountItemsPerOrder, withClampedMaxDiscountItemsPerOrder } from '../utils/activity'

interface RuleLimitFieldsProps {
  activity: ActivityForm
  readOnly?: boolean
  onChange: (activity: ActivityForm) => void
}

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export function RuleLimitFields({ activity, readOnly, onChange }: RuleLimitFieldsProps) {
  const update = <K extends keyof ActivityForm>(key: K, value: ActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }
  const minDiscountItemsPerOrder = getMinMaxDiscountItemsPerOrder(activity)

  return (
    <>
      <FormRow label="加料商品是否参与优惠" required>
        <ParticipateRadio
          disabled={readOnly}
          value={activity.toppingsDiscount}
          onChange={(v) => update('toppingsDiscount', v)}
        />
      </FormRow>

      <FormRow label="做法加价金额是否参与优惠" required>
        <ParticipateRadio
          disabled={readOnly}
          value={activity.preparationSurchargeDiscount}
          onChange={(v) => update('preparationSurchargeDiscount', v)}
        />
      </FormRow>

      <FormRow label="用户参与活动总次数(单数)" required>
        <LimitOption
          disabled={readOnly}
          limitType={activity.totalParticipationLimitType}
          onLimitTypeChange={(t) => update('totalParticipationLimitType', t)}
          limitedContent={
            <>
              限制最多参与
              <NumberStepper
                disabled={readOnly}
                value={activity.totalParticipationLimit}
                onChange={(v) => update('totalParticipationLimit', v)}
              />
              次
            </>
          }
        />
      </FormRow>

      <FormRow label="用户参与活动频次(单数)" required>
        <LimitOption
          disabled={readOnly}
          limitType={activity.participationFrequencyType}
          onLimitTypeChange={(t) => update('participationFrequencyType', t)}
          limitedContent={
            <>
              限制每人
              <select
                className="input input--period"
                disabled={readOnly}
                value={activity.participationFrequencyPeriod}
                onChange={(e) => update('participationFrequencyPeriod', e.target.value as ParticipationPeriod)}
              >
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              最多优惠
              <NumberStepper
                disabled={readOnly}
                value={activity.participationFrequencyLimit}
                onChange={(v) => update('participationFrequencyLimit', v)}
              />
              次
            </>
          }
        />
      </FormRow>

      <FormRow label="每单可优惠商品件数" required>
        <div>
          <LimitOption
            disabled={readOnly}
            limitType={activity.maxDiscountItemsPerOrderType}
            onLimitTypeChange={(t) => {
              const next = { ...activity, maxDiscountItemsPerOrderType: t }
              onChange(
                t === 'limited'
                  ? withClampedMaxDiscountItemsPerOrder(next)
                  : next,
              )
            }}
            limitedContent={
              <>
                限制每单最多优惠
                <NumberStepper
                  disabled={readOnly}
                  value={activity.maxDiscountItemsPerOrder}
                  min={minDiscountItemsPerOrder}
                  onChange={(v) => update('maxDiscountItemsPerOrder', v)}
                />
                件
              </>
            }
          />
          {activity.ruleType === 'buyA_getB' && activity.maxDiscountItemsPerOrderType === 'limited' && (
            <p className="field-hint">
              买A送B规则下，赠品组为{minDiscountItemsPerOrder}组时，每单可优惠件数不少于{minDiscountItemsPerOrder}件。
            </p>
          )}
        </div>
      </FormRow>

      <FormRow label="优惠商品命中规则" required>
        <div>
          <div className="radio-group">
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={activity.discountHitRule === 'highest_price'}
                onChange={() => update('discountHitRule', 'highest_price')}
              />
              按价格最高
            </label>
            <label className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={activity.discountHitRule === 'lowest_price'}
                onChange={() => update('discountHitRule', 'lowest_price')}
              />
              按价格最低
            </label>
          </div>
          <p className="field-hint">
            若订单中存在多个参与优惠的商品，则按此设置取价格高→低或低→高的X个商品赠送1个相同商品
          </p>
        </div>
      </FormRow>
    </>
  )
}

function ParticipateRadio({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="radio-group">
      <label className="radio">
        <input type="radio" disabled={disabled} checked={!value} onChange={() => onChange(false)} />
        不参与
      </label>
      <label className="radio">
        <input type="radio" disabled={disabled} checked={value} onChange={() => onChange(true)} />
        参与
      </label>
    </div>
  )
}

function LimitOption({
  limitType,
  onLimitTypeChange,
  limitedContent,
  disabled,
}: {
  limitType: LimitType
  onLimitTypeChange: (t: LimitType) => void
  limitedContent: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="limit-options">
      <label className="radio">
        <input
          type="radio"
          disabled={disabled}
          checked={limitType === 'unlimited'}
          onChange={() => onLimitTypeChange('unlimited')}
        />
        不限
      </label>
      <label className="radio limit-options__limited">
        <input
          type="radio"
          disabled={disabled}
          checked={limitType === 'limited'}
          onChange={() => onLimitTypeChange('limited')}
        />
        <span className="limit-options__content">{limitedContent}</span>
      </label>
    </div>
  )
}

function NumberStepper({
  value,
  onChange,
  disabled,
  min = 1,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  min?: number
}) {
  return (
    <span className="number-stepper">
      <button
        type="button"
        className="number-stepper__btn"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <input
        type="number"
        className="number-stepper__input"
        disabled={disabled}
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
      />
      <button
        type="button"
        className="number-stepper__btn"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </span>
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

export function formatRuleLimitsSummary(activity: ActivityForm): Record<string, string> {
  const periodLabel = { daily: '每天', weekly: '每周', monthly: '每月' }[activity.participationFrequencyPeriod]
  return {
    toppings: activity.toppingsDiscount ? '参与' : '不参与',
    preparation: activity.preparationSurchargeDiscount ? '参与' : '不参与',
    totalLimit: activity.totalParticipationLimitType === 'unlimited'
      ? '不限'
      : `最多参与${activity.totalParticipationLimit}次`,
    frequency: activity.participationFrequencyType === 'unlimited'
      ? '不限'
      : `${periodLabel}最多优惠${activity.participationFrequencyLimit}次`,
    perOrder: activity.maxDiscountItemsPerOrderType === 'unlimited'
      ? '不限'
      : `每单最多优惠${activity.maxDiscountItemsPerOrder}件`,
    hitRule: activity.discountHitRule === 'highest_price' ? '按价格最高' : '按价格最低',
  }
}
