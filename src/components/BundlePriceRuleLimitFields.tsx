import type { BundlePriceActivityForm, ParticipationPeriod } from '../types'

interface BundlePriceRuleLimitFieldsProps {
  activity: BundlePriceActivityForm
  readOnly?: boolean
  onChange: (activity: BundlePriceActivityForm) => void
}

const PERIOD_OPTIONS: { value: ParticipationPeriod; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export function BundlePriceRuleLimitFields({ activity, readOnly, onChange }: BundlePriceRuleLimitFieldsProps) {
  const update = <K extends keyof BundlePriceActivityForm>(key: K, value: BundlePriceActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <>
      <FormRow label="每单打包组数">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.maxBundleGroupsPerOrderType === 'limited'}
            onCheckedChange={(on) => update('maxBundleGroupsPerOrderType', on ? 'limited' : 'unlimited')}
            label={
              <>
                每笔订单最多享受
                <NumberStepper
                  disabled={readOnly || activity.maxBundleGroupsPerOrderType !== 'limited'}
                  value={activity.maxBundleGroupsPerOrder}
                  onChange={(v) => update('maxBundleGroupsPerOrder', v)}
                />
                组打包价
              </>
            }
          />
          <p className="field-hint">
            一组即命中一次阶梯。例如满 3 件一口价，限制每单 1 组时，第 4 件起按原价，不再凑第二组。
          </p>
        </div>
      </FormRow>
      <FormRow label="每人参与总次数">
        <div>
          <CheckboxLimit
            disabled={readOnly}
            checked={activity.totalParticipationLimitType === 'limited'}
            onCheckedChange={(on) => update('totalParticipationLimitType', on ? 'limited' : 'unlimited')}
            label={
              <>
                活动期间每个用户最多优惠
                <NumberStepper
                  disabled={readOnly || activity.totalParticipationLimitType !== 'limited'}
                  value={activity.totalParticipationLimit}
                  onChange={(v) => update('totalParticipationLimit', v)}
                />
                单
              </>
            }
          />
          <p className="field-hint">达到次数后，该用户后续订单不再享受本活动的打包价。</p>
        </div>
      </FormRow>
      <FormRow label="每人参与频次">
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
          <p className="field-hint">例如每天最多 1 单，则当天第 2 单不再享受打包价。</p>
        </div>
      </FormRow>
    </>
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
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  min?: number
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

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{label}</label>
      <div className="form-control">{children}</div>
    </div>
  )
}

export function formatBundlePriceLimitsSummary(activity: BundlePriceActivityForm) {
  const periodMap = { daily: '每天', weekly: '每周', monthly: '每月' }
  return {
    groups: activity.maxBundleGroupsPerOrderType === 'unlimited'
      ? '不限制'
      : `每单最多 ${activity.maxBundleGroupsPerOrder} 组`,
    totalLimit: activity.totalParticipationLimitType === 'unlimited'
      ? '不限制'
      : `最多 ${activity.totalParticipationLimit} 单`,
    frequency: activity.participationFrequencyType === 'unlimited'
      ? '不限制'
      : `${periodMap[activity.participationFrequencyPeriod]}最多 ${activity.participationFrequencyLimit} 单`,
  }
}
