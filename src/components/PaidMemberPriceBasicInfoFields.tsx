import type { PaidMemberPriceActivityForm } from '../types'

const NAME_MAX = 30
const TITLE_MAX = 20
const TAG_MAX = 20
const DESC_MAX = 500

interface PaidMemberPriceBasicInfoFieldsProps {
  activity: PaidMemberPriceActivityForm
  readOnly?: boolean
  /** 「进行中」时价格与资格类字段锁定，仅展示类字段可改 */
  ruleLocked?: boolean
  onChange: (activity: PaidMemberPriceActivityForm) => void
}

export function PaidMemberPriceBasicInfoFields({
  activity,
  readOnly,
  ruleLocked,
  onChange,
}: PaidMemberPriceBasicInfoFieldsProps) {
  const update = <K extends keyof PaidMemberPriceActivityForm>(
    key: K,
    value: PaidMemberPriceActivityForm[K],
  ) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <>
      <FormRow label="活动名称" required>
        <CharInput disabled={readOnly} value={activity.name} max={NAME_MAX} placeholder="请输入活动名称" onChange={(v) => update('name', v)} />
      </FormRow>
      <FormRow label="点单页展示标题">
        <CharInput disabled={readOnly} value={activity.title} max={TITLE_MAX} placeholder="如：大神卡专享价" onChange={(v) => update('title', v)} />
        <p className="field-hint field-hint--inline">展示在小程序点单页顶部公告栏</p>
      </FormRow>
      <FormRow label="商品卡片展示标签">
        <CharInput disabled={readOnly} value={activity.tag} max={TAG_MAX} placeholder="如：大神卡价" onChange={(v) => update('tag', v)} />
        <p className="field-hint field-hint--inline">展示在参与活动的商品卡片上</p>
      </FormRow>
      <FormRow label="活动时间">
        <p className="field-static">
          无起止时间，生命周期跟随关联的付费会员卡：卡上架后活动生效，卡下架后已购卡用户在有效期内继续享受。
        </p>
      </FormRow>
      <FormRow label="权益使用周期" required>
        <div>
          <RadioGroup
            disabled={readOnly || ruleLocked}
            value={activity.cycleType}
            options={[{ value: 'daily', label: '每天' }, { value: 'weekly', label: '每周' }, { value: 'monthly', label: '每月' }]}
            onChange={(v) => update('cycleType', v as PaidMemberPriceActivityForm['cycleType'])}
          />
          <p className="field-hint">在顾客持卡有效期内，按此周期与下方时段判断权益是否可用。</p>
        </div>
      </FormRow>
      <FormRow label="权益使用时段" required>
        <RadioGroup
          disabled={readOnly || ruleLocked}
          value={activity.timeSlotType}
          options={[{ value: 'all_day', label: '全天' }, { value: 'specific', label: '指定时间段' }]}
          onChange={(v) => update('timeSlotType', v as PaidMemberPriceActivityForm['timeSlotType'])}
        />
      </FormRow>
      <FormRow label="活动说明">
        <div className="char-textarea-wrap">
          <textarea
            className="textarea textarea--count"
            disabled={readOnly}
            value={activity.description}
            onChange={(e) => update('description', e.target.value.slice(0, DESC_MAX))}
            placeholder="请输入活动说明"
            rows={4}
          />
          <span className="char-count">{activity.description.length}/{DESC_MAX}</span>
        </div>
      </FormRow>
    </>
  )
}

function CharInput({ value, max, placeholder, disabled, onChange }: { value: string; max: number; placeholder?: string; disabled?: boolean; onChange: (v: string) => void }) {
  return (
    <div className="char-input-wrap">
      <input className="input input--wide input--count" disabled={disabled} value={value} placeholder={placeholder} maxLength={max} onChange={(e) => onChange(e.target.value.slice(0, max))} />
      <span className="char-count">{value.length}/{max}</span>
    </div>
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

function RadioGroup({ value, options, onChange, disabled }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input type="radio" disabled={disabled} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

export function formatPaidBasicPreview(activity: PaidMemberPriceActivityForm) {
  const cycleMap = { daily: '每天', weekly: '每周', monthly: '每月' }
  const slotMap = { all_day: '全天', specific: '指定时间段' }
  return {
    cycle: cycleMap[activity.cycleType],
    timeSlot: slotMap[activity.timeSlotType],
  }
}
