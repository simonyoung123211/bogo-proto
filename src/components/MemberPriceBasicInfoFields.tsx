import type { MemberPriceActivityForm } from '../types'

const NAME_MAX = 30
const TITLE_MAX = 20
const TAG_MAX = 20
const DESC_MAX = 500

interface MemberPriceBasicInfoFieldsProps {
  activity: MemberPriceActivityForm
  readOnly?: boolean
  onChange: (activity: MemberPriceActivityForm) => void
}

export function MemberPriceBasicInfoFields({ activity, readOnly, onChange }: MemberPriceBasicInfoFieldsProps) {
  const update = <K extends keyof MemberPriceActivityForm>(key: K, value: MemberPriceActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <>
      <FormRow label="活动名称" required>
        <CharInput disabled={readOnly} value={activity.name} max={NAME_MAX} placeholder="请输入活动名称" onChange={(v) => update('name', v)} />
      </FormRow>
      <FormRow label="点单页展示标题">
        <CharInput disabled={readOnly} value={activity.title} max={TITLE_MAX} placeholder="如：会员专享价" onChange={(v) => update('title', v)} />
        <p className="field-hint field-hint--inline">展示在小程序点单页顶部公告栏</p>
      </FormRow>
      <FormRow label="商品卡片展示标签">
        <CharInput disabled={readOnly} value={activity.tag} max={TAG_MAX} placeholder="如：会员价" onChange={(v) => update('tag', v)} />
        <p className="field-hint field-hint--inline">展示在参与活动的商品卡片上</p>
      </FormRow>
      <FormRow label="活动时间" required>
        <div className="date-range">
          <input type="datetime-local" className="input input--time" disabled={readOnly} value={activity.startTime.slice(0, 16)} onChange={(e) => update('startTime', e.target.value.replace('T', ' ') + ':00')} />
          <span className="date-range__sep">至</span>
          <input type="datetime-local" className="input input--time" disabled={readOnly} value={activity.endTime.slice(0, 16)} onChange={(e) => update('endTime', e.target.value.replace('T', ' ') + ':00')} />
        </div>
      </FormRow>
      <FormRow label="活动周期" required>
        <RadioGroup disabled={readOnly} value={activity.cycleType} options={[{ value: 'daily', label: '每天' }, { value: 'weekly', label: '每周' }, { value: 'monthly', label: '每月' }]} onChange={(v) => update('cycleType', v as MemberPriceActivityForm['cycleType'])} />
      </FormRow>
      <FormRow label="活动时段" required>
        <RadioGroup disabled={readOnly} value={activity.timeSlotType} options={[{ value: 'all_day', label: '全天' }, { value: 'specific', label: '指定时间段' }]} onChange={(v) => update('timeSlotType', v as MemberPriceActivityForm['timeSlotType'])} />
      </FormRow>
      <FormRow label="活动说明">
        <div className="char-textarea-wrap">
          <textarea className="textarea textarea--count" disabled={readOnly} value={activity.description} onChange={(e) => update('description', e.target.value.slice(0, DESC_MAX))} placeholder="请输入活动说明" rows={4} />
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

export function formatMemberPriceBasicPreview(activity: MemberPriceActivityForm) {
  const cycleMap = { daily: '每天', weekly: '每周', monthly: '每月' }
  const slotMap = { all_day: '全天', specific: '指定时间段' }
  return {
    cycle: cycleMap[activity.cycleType],
    timeSlot: slotMap[activity.timeSlotType],
  }
}
