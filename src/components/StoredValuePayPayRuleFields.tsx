import type { StoredValuePayActivityForm, StoredValuePayRule } from '../types'
import { STORED_VALUE_PAY_RULE_LABELS } from '../mockStoredValuePayData'

interface StoredValuePayPayRuleFieldsProps {
  activity: StoredValuePayActivityForm
  readOnly?: boolean
  onChange: (activity: StoredValuePayActivityForm) => void
}

const RULE_HINTS: Record<StoredValuePayRule, string> = {
  min_balance_pay: '本单储值余额实付金额 ≥ 0.01 元即可享受活动价。',
  full_order_balance: '本单应付金额须全部由储值余额支付，才可享受活动价。',
}

export function StoredValuePayPayRuleFields({
  activity,
  readOnly,
  onChange,
}: StoredValuePayPayRuleFieldsProps) {
  return (
    <>
      <FormRow label="支付参与规则" required>
        <div>
          <div className="radio-group radio-group--vertical">
            {(Object.keys(STORED_VALUE_PAY_RULE_LABELS) as StoredValuePayRule[]).map((rule) => (
              <label key={rule} className="radio">
                <input
                  type="radio"
                  disabled={readOnly}
                  checked={activity.payRule === rule}
                  onChange={() => onChange({ ...activity, payRule: rule })}
                />
                {STORED_VALUE_PAY_RULE_LABELS[rule]}
              </label>
            ))}
          </div>
          <p className="field-hint">{RULE_HINTS[activity.payRule]}</p>
          <p className="field-hint">享受优惠须使用储值余额支付</p>
        </div>
      </FormRow>
    </>
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
