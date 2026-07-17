import { useState } from 'react'
import { MEMBER_TAG_OPTIONS, PARTICIPANT_USER_OPTIONS } from '../mockData'
import type { DisplayToggle, FullReductionActivityForm } from '../types'

const CODE_MAX = 30

interface FullReductionAdvancedOptionsFieldsProps {
  activity: FullReductionActivityForm
  readOnly?: boolean
  onChange: (activity: FullReductionActivityForm) => void
}

export function FullReductionAdvancedOptionsFields({ activity, readOnly, onChange }: FullReductionAdvancedOptionsFieldsProps) {
  const [expanded, setExpanded] = useState(false)
  const update = <K extends keyof FullReductionActivityForm>(key: K, value: FullReductionActivityForm[K]) => {
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
                  <input type="radio" disabled={readOnly} checked={activity.shareMutexRelation === 'share_all'} onChange={() => update('shareMutexRelation', 'share_all')} />
                  全部活动/券 共享
                </label>
                <label className="radio">
                  <input type="radio" disabled={readOnly} checked={activity.shareMutexRelation === 'mutex_all'} onChange={() => update('shareMutexRelation', 'mutex_all')} />
                  全部活动/券 互斥
                </label>
              </div>
            </div>
          </FormRow>
          <FormRow label="参与用户">
            <select className="input input--wide" disabled={readOnly} value={activity.participantUser} onChange={(e) => update('participantUser', e.target.value as FullReductionActivityForm['participantUser'])}>
              {PARTICIPANT_USER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="打标签">
            <select className="input input--wide" disabled={readOnly} value={activity.memberTagId} onChange={(e) => update('memberTagId', e.target.value)}>
              {MEMBER_TAG_OPTIONS.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>{o.label}</option>
              ))}
            </select>
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
        </div>
      )}
    </div>
  )
}

function DisplayRadio({ value, onChange, disabled }: { value: DisplayToggle; onChange: (v: DisplayToggle) => void; disabled?: boolean }) {
  return (
    <div className="radio-group">
      <label className="radio">
        <input type="radio" disabled={disabled} checked={value === 'show'} onChange={() => onChange('show')} />
        展示
      </label>
      <label className="radio">
        <input type="radio" disabled={disabled} checked={value === 'hide'} onChange={() => onChange('hide')} />
        不展示
      </label>
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

export function formatFullReductionAdvancedPreview(activity: FullReductionActivityForm) {
  return {
    shareLabel: activity.shareMutexRelation === 'share_all' ? '全部共享' : '全部互斥',
    userLabel: PARTICIPANT_USER_OPTIONS.find((o) => o.value === activity.participantUser)?.label ?? '-',
    tagLabel: MEMBER_TAG_OPTIONS.find((o) => o.value === activity.memberTagId)?.label || '未设置',
    display: (v: DisplayToggle) => (v === 'show' ? '展示' : '不展示'),
  }
}
