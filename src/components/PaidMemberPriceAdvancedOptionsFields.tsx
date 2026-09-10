import { useState } from 'react'
import type { DisplayToggle, PaidMemberPriceActivityForm } from '../types'

const CODE_MAX = 30

interface PaidMemberPriceAdvancedOptionsFieldsProps {
  activity: PaidMemberPriceActivityForm
  readOnly?: boolean
  ruleLocked?: boolean
  onChange: (activity: PaidMemberPriceActivityForm) => void
}

export function PaidMemberPriceAdvancedOptionsFields({
  activity,
  readOnly,
  ruleLocked,
  onChange,
}: PaidMemberPriceAdvancedOptionsFieldsProps) {
  const [expanded, setExpanded] = useState(false)
  const update = <K extends keyof PaidMemberPriceActivityForm>(
    key: K,
    value: PaidMemberPriceActivityForm[K],
  ) => {
    onChange({ ...activity, [key]: value })
  }

  return (
    <div className="form-section form-section--collapsible">
      <button type="button" className="form-section__title form-section__title--toggle" onClick={() => setExpanded((v) => !v)}>
        <span className={`collapse-arrow ${expanded ? 'is-expanded' : ''}`}>›</span>
        高级选项
      </button>
      {expanded && (
        <div className="form-section__body">
          <FormRow label="共享互斥关系">
            <div>
              <div className="radio-group radio-group--vertical">
                <label className="radio">
                  <input type="radio" disabled={readOnly || ruleLocked} checked={activity.shareMutexRelation === 'share_all'} onChange={() => update('shareMutexRelation', 'share_all')} />
                  全部活动/券 共享
                </label>
                <label className="radio">
                  <input type="radio" disabled={readOnly || ruleLocked} checked={activity.shareMutexRelation === 'mutex_all'} onChange={() => update('shareMutexRelation', 'mutex_all')} />
                  全部活动/券 互斥
                </label>
              </div>
              <p className="field-hint">
                付费会员价与普通会员价属同一「用户权益」组，同一单品上互斥，命中时取对顾客更优的价格。
              </p>
            </div>
          </FormRow>
          <FormRow label="活动编码">
            <div className="char-input-wrap">
              <input className="input input--wide input--count" disabled={readOnly} value={activity.activityCode} placeholder="请输入活动编码" maxLength={CODE_MAX} onChange={(e) => update('activityCode', e.target.value.slice(0, CODE_MAX))} />
              <span className="char-count">{activity.activityCode.length}/{CODE_MAX}</span>
            </div>
          </FormRow>
          <FormRow label="点单页展示标题">
            <div>
              <DisplayRadio disabled={readOnly} value={activity.titleDisplay} onChange={(v) => update('titleDisplay', v)} />
              <p className="field-hint">控制是否在用户端点单页展示上述标题。</p>
            </div>
          </FormRow>
          <FormRow label="商品付费会员价标签展示">
            <div>
              <DisplayRadio disabled={readOnly} value={activity.memberPriceTagDisplay} onChange={(v) => update('memberPriceTagDisplay', v)} />
              <p className="field-hint">门店商品展示详情价格标签。</p>
            </div>
          </FormRow>
          <FormRow label="商品卡片展示标签">
            <div>
              <DisplayRadio disabled={readOnly} value={activity.tagDisplay} onChange={(v) => update('tagDisplay', v)} />
              <p className="field-hint">控制是否在用户端商品卡片展示上述标签。</p>
            </div>
          </FormRow>
        </div>
      )}
    </div>
  )
}

function DisplayRadio({ value, onChange, disabled }: { value: DisplayToggle; onChange: (v: DisplayToggle) => void; disabled?: boolean }) {
  return (
    <div className="radio-group">
      <label className="radio"><input type="radio" disabled={disabled} checked={value === 'show'} onChange={() => onChange('show')} />显示</label>
      <label className="radio"><input type="radio" disabled={disabled} checked={value === 'hide'} onChange={() => onChange('hide')} />不显示</label>
    </div>
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

export function formatPaidAdvancedPreview(activity: PaidMemberPriceActivityForm) {
  const shareLabel = activity.shareMutexRelation === 'share_all' ? '全部活动/券 共享' : '全部活动/券 互斥'
  const display = (v: DisplayToggle) => (v === 'show' ? '显示' : '不显示')
  return { shareLabel, display }
}
