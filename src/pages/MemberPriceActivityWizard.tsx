import { useEffect, useRef, useState } from 'react'
import { MemberPriceActivityPreview } from '../components/MemberPriceActivityPreview'
import { MemberPriceAdvancedOptionsFields } from '../components/MemberPriceAdvancedOptionsFields'
import { MemberPriceBasicInfoFields } from '../components/MemberPriceBasicInfoFields'
import { MemberPriceOfferStep } from '../components/MemberPriceOfferStep'
import { MemberPricePhonePreview } from '../components/MemberPricePhonePreview'
import { MemberPriceRuleLimitFields } from '../components/MemberPriceRuleLimitFields'
import { StorePicker } from '../components/StorePicker'
import { CHANNELS, ORDER_TYPES, STATUS_LABELS } from '../mockData'
import type { MemberPriceActivityForm, WizardMode } from '../types'
import {
  collectMemberPriceHealthIssues,
  collectMemberPriceStepIssues,
  validateStep,
} from '../utils/memberPriceActivity'

interface MemberPriceActivityWizardProps {
  activity: MemberPriceActivityForm
  mode: WizardMode
  onChange: (activity: MemberPriceActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
  onToast?: (message: string) => void
}

const STEPS = ['活动基础规则', '选择参与门店', '参与商品及优惠', '预览并保存']
const PREVIEW_STEP = STEPS.length - 1

export function MemberPriceActivityWizard({
  activity,
  mode,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
  onToast,
}: MemberPriceActivityWizardProps) {
  const isView = mode === 'view'
  const readOnly = isView
  const [step, setStep] = useState(isView ? PREVIEW_STEP : 0)
  const [error, setError] = useState<string | null>(null)
  const [previewGroupId, setPreviewGroupId] = useState(activity.groups?.[0]?.id ?? '')
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isView) setStep(PREVIEW_STEP)
  }, [isView])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])

  useEffect(() => {
    const ids = activity.groups?.map((g) => g.id) ?? []
    if (!ids.length) return
    if (!ids.includes(previewGroupId)) setPreviewGroupId(ids[0])
  }, [activity.groups, previewGroupId])

  const healthIssues = collectMemberPriceHealthIssues(activity)
  const stepIssueCounts = [0, 1, 2].map((s) => collectMemberPriceStepIssues(activity, s).length)

  const update = <K extends keyof MemberPriceActivityForm>(key: K, value: MemberPriceActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  const toggleChannel = (id: string) => {
    const next = activity.channels.includes(id)
      ? activity.channels.filter((c) => c !== id)
      : [...activity.channels, id]
    update('channels', next)
  }

  const toggleOrderType = (id: string) => {
    const next = activity.orderTypes.includes(id)
      ? activity.orderTypes.filter((c) => c !== id)
      : [...activity.orderTypes, id]
    update('orderTypes', next)
  }

  const goToStep = (target: number) => {
    if (isView) return
    if (target < step) {
      setError(null)
      setStep(target)
      return
    }
    if (target === step) return
    for (let i = step; i < target; i++) {
      const err = validateStep(activity, i)
      if (err) {
        setStep(i)
        setError(err)
        return
      }
    }
    setError(null)
    setStep(target)
  }

  const goNext = () => {
    const err = validateStep(activity, step)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, PREVIEW_STEP))
  }

  const goPrev = () => {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  const jumpHealthIssue = (targetStep: number) => {
    setError(null)
    setStep(targetStep)
  }

  return (
    <div className={`wizard ${isView ? 'wizard--view' : ''}`}>
      <div className="wizard-header">
        <div className="wizard-header__main">
          <h2 className="wizard-header__title">{activity.name || '未命名活动'}</h2>
          <span className={`status-badge status-badge--${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
          {isView && <span className="wizard-header__badge">查看模式</span>}
        </div>
        <div className="wizard-header__meta">
          <span>活动ID：{activity.id}</span>
          <span>创建者：{activity.creator}</span>
        </div>
      </div>

      {!isView && (
        <div className="step-shell">
          <div className="step-full">
            {STEPS.map((label, i) => {
              const pending = i < PREVIEW_STEP ? stepIssueCounts[i] : 0
              const done = i < step
              const active = i === step
              const available = i <= step
              return (
                <button
                  key={label}
                  type="button"
                  className={`step-card ${done ? 'done' : ''} ${active ? 'active' : ''} ${available ? 'available' : ''}`}
                  onClick={() => goToStep(i)}
                  disabled={!available}
                >
                  <div className="step-circle">{done ? '✓' : i + 1}</div>
                  <div className="step-words">
                    <b>{label}</b>
                    <small className={pending > 0 && i !== PREVIEW_STEP ? 'pending' : ''}>
                      {i === PREVIEW_STEP
                        ? '复核并保存'
                        : pending > 0
                          ? `待填 ${pending} 项`
                          : done || active
                            ? '已完成'
                            : '未开始'}
                    </small>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="wizard-body">
        <div className="promo-editor">
          {!isView && step < PREVIEW_STEP && (
            <MemberPricePhonePreview
              activity={activity}
              previewGroupId={previewGroupId}
              onPreviewGroupChange={setPreviewGroupId}
            />
          )}

          <div className={`wizard-content ${step === PREVIEW_STEP ? 'wizard-content--preview' : ''}`}>
            {error && (
              <div ref={errorRef} className="form-error" role="alert">{error}</div>
            )}

            {step === 0 && (
              <div className="wizard-step wizard-step--animate">
                <Section title="适用渠道">
                  <FormRow label="参与渠道" required>
                    <div className="choices">
                      {CHANNELS.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          disabled={readOnly}
                          className={`choice channel corner ${activity.channels.includes(ch.id) ? 'selected' : ''}`}
                          onClick={() => toggleChannel(ch.id)}
                        >
                          <span className="channel-icon">{ch.icon}</span>
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  </FormRow>
                  <FormRow label="参与业务场景" required>
                    <div className="choices">
                      {ORDER_TYPES.map((ot) => (
                        <button
                          key={ot.id}
                          type="button"
                          disabled={readOnly}
                          className={`choice tick ${activity.orderTypes.includes(ot.id) ? 'selected' : ''}`}
                          onClick={() => toggleOrderType(ot.id)}
                        >
                          {ot.label}
                        </button>
                      ))}
                    </div>
                  </FormRow>
                </Section>

                <Section title="基础信息">
                  <MemberPriceBasicInfoFields activity={activity} readOnly={readOnly} onChange={onChange} />
                </Section>

                <Section title="活动规则">
                  <MemberPriceRuleLimitFields activity={activity} readOnly={readOnly} onChange={onChange} />
                </Section>

                <MemberPriceAdvancedOptionsFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </div>
            )}

            {step === 1 && (
              <div className="wizard-step wizard-step--animate">
                <Section title="参与门店">
                  <StorePicker
                    scope={activity.storeScope}
                    selectedIds={activity.storeIds}
                    readOnly={readOnly}
                    onScopeChange={(scope) => update('storeScope', scope)}
                    onChange={(ids) => update('storeIds', ids)}
                  />
                </Section>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step wizard-step--animate">
                <Section title="参与商品及优惠">
                  <MemberPriceOfferStep
                    activity={activity}
                    readOnly={readOnly}
                    activeGroupId={previewGroupId}
                    onActiveGroupChange={setPreviewGroupId}
                    onChange={onChange}
                    onToast={onToast}
                  />
                </Section>
              </div>
            )}

            {step === PREVIEW_STEP && (
              <div className="wizard-step wizard-step--animate">
                <MemberPriceActivityPreview
                  activity={activity}
                  showAnchorNav
                  showEditLinks={!isView}
                  onEditSection={(target) => { setError(null); setStep(target) }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="wizard-footer">
        {isView ? (
          <div className="wizard-footer__actions">
            <button type="button" className="btn btn--default" onClick={onCancel}>返回列表</button>
            {onSwitchToEdit && <button type="button" className="btn btn--primary" onClick={onSwitchToEdit}>编辑活动</button>}
          </div>
        ) : (
          <>
            <div className="wizard-footer__health" aria-live="polite">
              {healthIssues.length === 0 ? (
                <span className="wizard-footer__ok">配置体检：已完成</span>
              ) : (
                <>
                  <span className="wizard-footer__warn">还有 {healthIssues.length} 项待完善</span>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => jumpHealthIssue(healthIssues[0].step)}
                  >
                    {healthIssues[0].message}
                  </button>
                </>
              )}
            </div>
            <div className="wizard-footer__actions">
              <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
              {step > 0 && <button type="button" className="btn btn--default" onClick={goPrev}>上一步</button>}
              <button type="button" className="btn btn--default" onClick={onSaveDraft}>保存草稿</button>
              {step < PREVIEW_STEP ? (
                <button type="button" className="btn btn--primary" onClick={goNext}>下一步</button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={healthIssues.length > 0}
                  onClick={onSave}
                >
                  保存
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="promo-card">
      <div className="promo-card__head">{title}</div>
      <div className="promo-card__body">{children}</div>
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
