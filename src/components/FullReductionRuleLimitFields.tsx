import type { FullReductionActivityForm, ParticipationPeriod } from '../types'

interface FullReductionRuleLimitFieldsProps {
  activity: FullReductionActivityForm
  readOnly?: boolean
  onChange: (activity: FullReductionActivityForm) => void
}

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export function FullReductionRuleLimitFields({ activity, readOnly, onChange }: FullReductionRuleLimitFieldsProps) {
  const update = <K extends keyof FullReductionActivityForm>(key: K, value: FullReductionActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <>
      <FormRow label="加料商品是否参与优惠" required>
        <div>
          <ParticipateRadio disabled={readOnly} value={activity.toppingsDiscount} onChange={(v) => update('toppingsDiscount', v)} />
          <p className="field-hint">
            选择参与，则商品中加料商品的价格参与优惠计算，例如A商品5元，加料商品2元，则参与优惠计算的金额为5+2=7元
          </p>
        </div>
      </FormRow>
      <FormRow label="包装费是否参与优惠" required>
        <ParticipateRadio disabled={readOnly} value={activity.packagingFeeDiscount} onChange={(v) => update('packagingFeeDiscount', v)} />
      </FormRow>
      <FormRow label="套餐加价金额是否参与优惠" required>
        <div>
          <ParticipateRadio disabled={readOnly} value={activity.comboSurchargeDiscount} onChange={(v) => update('comboSurchargeDiscount', v)} />
          <p className="field-hint">
            选择参与，则套餐商品中随心配的商品另外加价的金额参与优惠计算，如A套餐10元，随心配子商品B为5元，则参与优惠计算的金额为10+5=15元
          </p>
        </div>
      </FormRow>
      <FormRow label="做法加价是否参与优惠" required>
        <ParticipateRadio disabled={readOnly} value={activity.preparationSurchargeDiscount} onChange={(v) => update('preparationSurchargeDiscount', v)} />
      </FormRow>
      <FormRow label="用户参与活动总次数（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.totalParticipationLimitType === 'limited'}
            onCheckedChange={(on) => update('totalParticipationLimitType', on ? 'limited' : 'unlimited')}
            label={
              <>
                限制该活动期间每个用户最多优惠
                <NumberStepper
                  disabled={readOnly || activity.totalParticipationLimitType !== 'limited'}
                  value={activity.totalParticipationLimit}
                  onChange={(v) => update('totalParticipationLimit', v)}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            比如设置活动期间内每个用户最多优惠20单，则该用户在活动期间内享受20单之后不再享受满减优惠
          </p>
        </div>
      </FormRow>
      <FormRow label="用户参与活动频次（订单数）">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.participationFrequencyType === 'limited'}
            onCheckedChange={(on) => update('participationFrequencyType', on ? 'limited' : 'unlimited')}
            label={
              <>
                <select
                  className="input input--period"
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyPeriod}
                  onChange={(e) => update('participationFrequencyPeriod', e.target.value as ParticipationPeriod)}
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                最多优惠
                <NumberStepper
                  disabled={readOnly || activity.participationFrequencyType !== 'limited'}
                  value={activity.participationFrequencyLimit}
                  onChange={(v) => update('participationFrequencyLimit', v)}
                />
                单
              </>
            }
          />
          <p className="field-hint">
            若设置每天最多优惠2单，则用户当天内第3单不享受满减优惠
          </p>
        </div>
      </FormRow>
    </>
  )
}

function ParticipateRadio({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
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

export function formatFullReductionLimitsSummary(activity: FullReductionActivityForm) {
  const periodMap = { daily: '每天', weekly: '每周', monthly: '每月' }
  return {
    toppings: activity.toppingsDiscount ? '参与' : '不参与',
    packaging: activity.packagingFeeDiscount ? '参与' : '不参与',
    combo: activity.comboSurchargeDiscount ? '参与' : '不参与',
    preparation: activity.preparationSurchargeDiscount ? '参与' : '不参与',
    totalLimit: activity.totalParticipationLimitType === 'unlimited'
      ? '不限制'
      : `最多${activity.totalParticipationLimit}单`,
    frequency: activity.participationFrequencyType === 'unlimited'
      ? '不限制'
      : `${periodMap[activity.participationFrequencyPeriod]}最多${activity.participationFrequencyLimit}单`,
  }
}
