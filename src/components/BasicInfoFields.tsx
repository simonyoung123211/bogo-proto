import type { ActivityForm } from '../types'

const NAME_MAX = 30
const TITLE_MAX = 20
const TAG_MAX = 20
const DESC_MAX = 500

interface BasicInfoFieldsProps {
  activity: ActivityForm
  readOnly?: boolean
  onChange: (activity: ActivityForm) => void
}

export function BasicInfoFields({ activity, readOnly, onChange }: BasicInfoFieldsProps) {
  const update = <K extends keyof ActivityForm>(key: K, value: ActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <>
      <FormRow label="活动名称" required>
        <CharInput
          disabled={readOnly}
          value={activity.name}
          max={NAME_MAX}
          placeholder="请输入活动名称"
          onChange={(v) => update('name', v)}
        />
      </FormRow>

      <FormRow label="点单页展示标题">
        <CharInput
          disabled={readOnly}
          value={activity.title}
          max={TITLE_MAX}
          placeholder="如：限时买赠，下单立享"
          onChange={(v) => update('title', v)}
        />
        <FieldHint>
          展示在小程序点单页顶部公告栏 <ExampleLink />
        </FieldHint>
      </FormRow>

      <FormRow label="商品卡片展示标签">
        <CharInput
          disabled={readOnly}
          value={activity.tag}
          max={TAG_MAX}
          placeholder="如：买赠、买一赠"
          onChange={(v) => update('tag', v)}
        />
        <FieldHint>
          展示在参与活动的商品卡片上 <ExampleLink />
        </FieldHint>
      </FormRow>

      <FormRow label="活动时间" required>
        <div className="date-range">
          <input
            type="datetime-local"
            className="input input--time"
            disabled={readOnly}
            placeholder="开始时间"
            value={activity.startTime.slice(0, 16)}
            onChange={(e) => update('startTime', e.target.value.replace('T', ' ') + ':00')}
          />
          <span className="date-range__sep">至</span>
          <input
            type="datetime-local"
            className="input input--time"
            disabled={readOnly}
            placeholder="结束时间"
            value={activity.endTime.slice(0, 16)}
            onChange={(e) => update('endTime', e.target.value.replace('T', ' ') + ':00')}
          />
        </div>
      </FormRow>

      <FormRow label="活动周期" required>
        <RadioGroup
          disabled={readOnly}
          value={activity.cycleType}
          options={[
            { value: 'daily', label: '每天' },
            { value: 'weekly', label: '每周' },
            { value: 'monthly', label: '每月' },
          ]}
          onChange={(v) => update('cycleType', v as ActivityForm['cycleType'])}
        />
      </FormRow>

      <FormRow label="活动时段" required>
        <RadioGroup
          disabled={readOnly}
          value={activity.timeSlotType}
          options={[
            { value: 'all_day', label: '全天' },
            { value: 'specific', label: '指定时间段' },
          ]}
          onChange={(v) => update('timeSlotType', v as ActivityForm['timeSlotType'])}
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

function CharInput({
  value,
  max,
  placeholder,
  disabled,
  onChange,
}: {
  value: string
  max: number
  placeholder?: string
  disabled?: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="char-input-wrap">
      <input
        className="input input--wide input--count"
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        maxLength={max}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
      />
      <span className="char-count">{value.length}/{max}</span>
    </div>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="field-hint field-hint--inline">{children}</p>
}

function ExampleLink() {
  return (
    <button type="button" className="link-btn link-btn--example" onClick={() => { /* 原型示意 */ }}>
      查看示例
    </button>
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

export function formatBasicInfoPreview(activity: ActivityForm) {
  return {
    cycle: activity.cycleType === 'daily' ? '每天' : activity.cycleType === 'weekly' ? '每周' : '每月',
    timeSlot: activity.timeSlotType === 'all_day' ? '全天' : '指定时间段',
  }
}
