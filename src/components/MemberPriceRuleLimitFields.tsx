import type { LimitType, MemberPriceActivityForm, ParticipationPeriod } from '../types'

interface MemberPriceRuleLimitFieldsProps {
  activity: MemberPriceActivityForm
  readOnly?: boolean
  onChange: (activity: MemberPriceActivityForm) => void
}

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export function MemberPriceRuleLimitFields({ activity, readOnly, onChange }: MemberPriceRuleLimitFieldsProps) {
  const update = <K extends keyof MemberPriceActivityForm>(key: K, value: MemberPriceActivityForm[K]) => {
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
    </>
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
    <div className="radio-group radio-group--vertical">
      <label className="radio"><input type="radio" disabled={disabled} checked={limitType === 'unlimited'} onChange={() => onLimitTypeChange('unlimited')} />不限制</label>
      <label className="radio limit-option-inline">
        <input type="radio" disabled={disabled} checked={limitType === 'limited'} onChange={() => onLimitTypeChange('limited')} />
        <span className={limitType !== 'limited' ? 'is-disabled-inline' : ''}>{limitedContent}</span>
      </label>
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
    <label className="checkbox checkbox--limit">
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function NumberStepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <input
      type="number"
      className="input input--num"
      disabled={disabled}
      value={value}
      min={1}
      onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
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

export function formatMemberPriceLimitsSummary(activity: MemberPriceActivityForm) {
  const yn = (v: boolean) => (v ? '参与' : '不参与')
  return {
    toppings: yn(activity.toppingsDiscount),
    combo: yn(activity.comboSurchargeDiscount),
    preparation: yn(activity.preparationSurchargeDiscount),
  }
}
