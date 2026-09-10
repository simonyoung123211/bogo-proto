import type { PaidMemberCardTemplate, PaidMemberPriceActivityForm } from '../types'
import { findBenefit, formatBenefitQuota } from '../utils/paidMemberPriceActivity'

interface PaidMemberPriceRuleLimitFieldsProps {
  activity: PaidMemberPriceActivityForm
  cards: PaidMemberCardTemplate[]
  readOnly?: boolean
  ruleLocked?: boolean
  onChange: (activity: PaidMemberPriceActivityForm) => void
}

export function PaidMemberPriceRuleLimitFields({
  activity,
  cards,
  readOnly,
  ruleLocked,
  onChange,
}: PaidMemberPriceRuleLimitFieldsProps) {
  const disabled = readOnly || ruleLocked
  const update = <K extends keyof PaidMemberPriceActivityForm>(
    key: K,
    value: PaidMemberPriceActivityForm[K],
  ) => {
    onChange({ ...activity, [key]: value })
  }

  const card = cards.find((c) => c.id === activity.cardTemplateId)
  const benefit = findBenefit(cards, activity.cardTemplateId, activity.benefitId)

  return (
    <>
      {benefit && card && (
        <FormRow label="权益额度（来自权益卡）">
          <div className="quota-inline">
            {formatBenefitQuota(benefit, card).map((q) => (
              <span key={q.specLabel} className="quota-inline__item">
                {q.specLabel}：{q.count} / {q.items}
              </span>
            ))}
            <p className="field-hint">
              每人可优惠的总次数与总件数由权益卡决定，按卡有效期结算，此处不可修改。
              下方的每天 / 每单件数是活动侧的交易维度风控，与权益额度同时生效、取更严者。
            </p>
          </div>
        </FormRow>
      )}

      <FormRow label="加料费用是否参与优惠" required>
        <ParticipateRadio disabled={disabled} value={activity.toppingsDiscount} onChange={(v) => update('toppingsDiscount', v)} />
      </FormRow>
      <FormRow label="套餐加价金额是否参与优惠" required>
        <ParticipateRadio disabled={disabled} value={activity.comboSurchargeDiscount} onChange={(v) => update('comboSurchargeDiscount', v)} />
      </FormRow>
      <FormRow label="做法加价是否参与优惠" required>
        <ParticipateRadio disabled={disabled} value={activity.preparationSurchargeDiscount} onChange={(v) => update('preparationSurchargeDiscount', v)} />
      </FormRow>
      <FormRow label="活动侧优惠件数限制">
        <div className="checkbox-limit-group">
          <CheckboxLimit
            disabled={disabled}
            checked={activity.maxDiscountItemsDailyType === 'limited'}
            onCheckedChange={(on) => update('maxDiscountItemsDailyType', on ? 'limited' : 'unlimited')}
            label={
              <>
                限制每人每天最多优惠
                <NumberStepper disabled={disabled || activity.maxDiscountItemsDailyType !== 'limited'} value={activity.maxDiscountItemsDaily} onChange={(v) => update('maxDiscountItemsDaily', v)} />
                件
              </>
            }
          />
          <CheckboxLimit
            disabled={disabled}
            checked={activity.maxDiscountItemsPerOrderType === 'limited'}
            onCheckedChange={(on) => update('maxDiscountItemsPerOrderType', on ? 'limited' : 'unlimited')}
            label={
              <>
                限制每人每单最多优惠
                <NumberStepper disabled={disabled || activity.maxDiscountItemsPerOrderType !== 'limited'} value={activity.maxDiscountItemsPerOrder} onChange={(v) => update('maxDiscountItemsPerOrder', v)} />
                件
              </>
            }
          />
          <p className="field-hint">
            付费会员价活动无起止时间，因此不提供「参与总次数」「参与频次」「活动期件数」三项限制，
            这三项由权益卡的权益额度统一承担。
          </p>
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
