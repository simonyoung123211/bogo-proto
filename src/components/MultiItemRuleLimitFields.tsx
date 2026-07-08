import type { LimitType, MultiItemActivityForm, MultiItemDiscountHitRule, ParticipationPeriod } from '../types'
import {
  getDiscountHitRuleLabel,
  getHitRuleM,
  isCycleHitRuleRuleType,
} from '../utils/multiItemActivity'

interface MultiItemRuleLimitFieldsProps {
  activity: MultiItemActivityForm
  readOnly?: boolean
  onChange: (activity: MultiItemActivityForm) => void
}

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export function MultiItemRuleLimitFields({ activity, readOnly, onChange }: MultiItemRuleLimitFieldsProps) {
  const update = <K extends keyof MultiItemActivityForm>(key: K, value: MultiItemActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <>
      <FormRow label="加料费用是否参与优惠" required>
        <ParticipateRadio disabled={readOnly} value={activity.toppingsDiscount} onChange={(v) => update('toppingsDiscount', v)} />
      </FormRow>
      <FormRow label="套餐加价金额是否参与优惠" required>
        <ParticipateRadio disabled={readOnly} value={activity.comboSurchargeDiscount} onChange={(v) => update('comboSurchargeDiscount', v)} />
      </FormRow>
      <FormRow label="做法加价是否参与优惠" required>
        <ParticipateRadio disabled={readOnly} value={activity.preparationSurchargeDiscount} onChange={(v) => update('preparationSurchargeDiscount', v)} />
      </FormRow>
      <FormRow label="用户参与活动总次数(单数)" required>
        <LimitOption
          disabled={readOnly}
          limitType={activity.totalParticipationLimitType}
          onLimitTypeChange={(t) => update('totalParticipationLimitType', t)}
          limitedContent={
            <>
              限制最多参与
              <NumberStepper disabled={readOnly} value={activity.totalParticipationLimit} onChange={(v) => update('totalParticipationLimit', v)} />
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
              <NumberStepper disabled={readOnly} value={activity.participationFrequencyLimit} onChange={(v) => update('participationFrequencyLimit', v)} />
              次
            </>
          }
        />
      </FormRow>
      <FormRow label="用户参与活动商品件数限制">
        <div className="checkbox-limit-group">
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.maxDiscountItemsTotalType === 'limited'}
            onCheckedChange={(on) => update('maxDiscountItemsTotalType', on ? 'limited' : 'unlimited')}
            label={
              <>
                限制每人活动期间最多优惠
                <NumberStepper disabled={readOnly || activity.maxDiscountItemsTotalType !== 'limited'} value={activity.maxDiscountItemsTotal} onChange={(v) => update('maxDiscountItemsTotal', v)} />
                件
              </>
            }
          />
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.maxDiscountItemsDailyType === 'limited'}
            onCheckedChange={(on) => update('maxDiscountItemsDailyType', on ? 'limited' : 'unlimited')}
            label={
              <>
                限制每人每天最多优惠
                <NumberStepper disabled={readOnly || activity.maxDiscountItemsDailyType !== 'limited'} value={activity.maxDiscountItemsDaily} onChange={(v) => update('maxDiscountItemsDaily', v)} />
                件
              </>
            }
          />
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.maxDiscountItemsPerOrderType === 'limited'}
            onCheckedChange={(on) => update('maxDiscountItemsPerOrderType', on ? 'limited' : 'unlimited')}
            label={
              <>
                限制每人每单最多优惠
                <NumberStepper disabled={readOnly || activity.maxDiscountItemsPerOrderType !== 'limited'} value={activity.maxDiscountItemsPerOrder} onChange={(v) => update('maxDiscountItemsPerOrder', v)} />
                件
              </>
            }
          />
        </div>
      </FormRow>
      <DiscountHitRuleField activity={activity} readOnly={readOnly} onChange={onChange} />
    </>
  )
}

function DiscountHitRuleField({
  activity,
  readOnly,
  onChange,
}: {
  activity: MultiItemActivityForm
  readOnly?: boolean
  onChange: (activity: MultiItemActivityForm) => void
}) {
  const isCycle = isCycleHitRuleRuleType(activity.ruleType)
  const m = getHitRuleM(activity)

  const updateHitRule = (value: MultiItemDiscountHitRule) => {
    onChange({ ...activity, discountHitRule: value })
  }

  const simpleOptions: { value: MultiItemDiscountHitRule; label: string }[] = [
    { value: 'high_to_low', label: '优惠售价高到低的商品' },
    { value: 'low_to_high', label: '优惠售价低到高的商品' },
  ]

  const cycleOptions: { value: MultiItemDiscountHitRule; label: string }[] = [
    ...simpleOptions,
    { value: 'every_m_highest', label: `每${m}件(价格降序)优惠其中最高` },
    { value: 'every_m_lowest', label: `每${m}件(价格降序)优惠其中最低` },
  ]

  const options = isCycle ? cycleOptions : simpleOptions

  return (
    <FormRow label="优惠商品命中规则" required>
      <div>
        <div className={`radio-group ${isCycle ? 'radio-group--hit-rule' : ''}`}>
          {options.map((opt) => (
            <label key={opt.value} className="radio">
              <input
                type="radio"
                disabled={readOnly}
                checked={activity.discountHitRule === opt.value}
                onChange={() => updateHitRule(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <p className="field-hint">
          {isCycle
            ? '循环优惠规则下，可指定按售价排序或按每批件数选取最高/最低价商品享受优惠。'
            : '当多件商品同时满足优惠条件时，按售价从高到低或从低到高确定优惠商品。'}
        </p>
      </div>
    </FormRow>
  )
}

function ParticipateRadio({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="radio-group">
      <label className="radio"><input type="radio" disabled={disabled} checked={!value} onChange={() => onChange(false)} />不参与</label>
      <label className="radio"><input type="radio" disabled={disabled} checked={value} onChange={() => onChange(true)} />参与</label>
    </div>
  )
}

function LimitOption({ limitType, onLimitTypeChange, limitedContent, disabled }: {
  limitType: LimitType; onLimitTypeChange: (t: LimitType) => void; limitedContent: React.ReactNode; disabled?: boolean
}) {
  return (
    <div className="limit-options">
      <label className="radio">
        <input type="radio" disabled={disabled} checked={limitType === 'unlimited'} onChange={() => onLimitTypeChange('unlimited')} />
        不限
      </label>
      <label className="radio limit-options__limited">
        <input type="radio" disabled={disabled} checked={limitType === 'limited'} onChange={() => onLimitTypeChange('limited')} />
        <span className="limit-options__content">{limitedContent}</span>
      </label>
    </div>
  )
}

function CheckboxLimit({ checked, onCheckedChange, label, disabled }: {
  checked: boolean; onCheckedChange: (on: boolean) => void; label: React.ReactNode; disabled?: boolean
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
    <span className="number-stepper">
      <button type="button" className="number-stepper__btn" disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input type="number" className="number-stepper__input" disabled={disabled} min={min} value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))} />
      <button type="button" className="number-stepper__btn" disabled={disabled} onClick={() => onChange(value + 1)}>+</button>
    </span>
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

export function formatMultiItemLimitsSummary(activity: MultiItemActivityForm) {
  const periodLabel = { daily: '每天', weekly: '每周', monthly: '每月' }[activity.participationFrequencyPeriod]
  return {
    toppings: activity.toppingsDiscount ? '参与' : '不参与',
    combo: activity.comboSurchargeDiscount ? '参与' : '不参与',
    preparation: activity.preparationSurchargeDiscount ? '参与' : '不参与',
    totalLimit: activity.totalParticipationLimitType === 'unlimited' ? '不限' : `最多参与${activity.totalParticipationLimit}次`,
    frequency: activity.participationFrequencyType === 'unlimited' ? '不限' : `${periodLabel}最多优惠${activity.participationFrequencyLimit}次`,
    itemsTotal: activity.maxDiscountItemsTotalType === 'unlimited' ? '不限' : `活动期间最多${activity.maxDiscountItemsTotal}件`,
    itemsDaily: activity.maxDiscountItemsDailyType === 'unlimited' ? '不限' : `每天最多${activity.maxDiscountItemsDaily}件`,
    perOrder: activity.maxDiscountItemsPerOrderType === 'unlimited' ? '不限' : `每单最多${activity.maxDiscountItemsPerOrder}件`,
    hitRule: getDiscountHitRuleLabel(activity),
  }
}
