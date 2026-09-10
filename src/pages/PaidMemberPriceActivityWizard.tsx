import { useEffect, useRef, useState } from 'react'
import { MemberPriceProductConfig } from '../components/MemberPriceProductConfig'
import { PaidMemberPriceActivityPreview } from '../components/PaidMemberPriceActivityPreview'
import { PaidMemberPriceAdvancedOptionsFields } from '../components/PaidMemberPriceAdvancedOptionsFields'
import { PaidMemberPriceBasicInfoFields } from '../components/PaidMemberPriceBasicInfoFields'
import { PaidMemberPriceCardBinding } from '../components/PaidMemberPriceCardBinding'
import { PaidMemberPriceRuleLimitFields } from '../components/PaidMemberPriceRuleLimitFields'
import { StorePicker } from '../components/StorePicker'
import { CHANNELS, ORDER_TYPES } from '../mockData'
import { PAID_MEMBER_PRICE_STATUS_LABELS } from '../mockPaidMemberPriceData'
import type {
  MemberPriceActivityForm,
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
  WizardMode,
} from '../types'
import {
  findPriceDisadvantages,
  getPauseInfo,
  isBindingLocked,
  isRuleLocked,
  validateStep,
} from '../utils/paidMemberPriceActivity'

interface PaidMemberPriceActivityWizardProps {
  activity: PaidMemberPriceActivityForm
  cards: PaidMemberCardTemplate[]
  /** 用于比价提醒：付费会员价不应比普通会员价更贵 */
  memberPriceActivities: MemberPriceActivityForm[]
  mode: WizardMode
  /** 从权益卡带绑定进来时直接落在「活动基础规则」，省掉一次确认 */
  initialStep?: number
  onChange: (activity: PaidMemberPriceActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
  onGoToCards: () => void
  onToast?: (message: string) => void
}

const STEPS = ['关联权益卡', '活动基础规则', '选择参与门店', '参与商品及优惠', '预览并保存']
const PREVIEW_STEP = STEPS.length - 1

export function PaidMemberPriceActivityWizard({
  activity,
  cards,
  memberPriceActivities,
  mode,
  initialStep,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
  onGoToCards,
  onToast,
}: PaidMemberPriceActivityWizardProps) {
  const isView = mode === 'view'
  const readOnly = isView
  const canDraft = !isView && (mode === 'create' || mode === 'copy' || activity.status === 'draft')
  const primaryActionLabel = canDraft ? '发布' : '保存'
  const [step, setStep] = useState(isView ? PREVIEW_STEP : (initialStep ?? 0))
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // 进行中的活动只能改展示类字段，价格与资格类字段需先暂停
  const ruleLocked = !isView && isRuleLocked(activity.status)
  const bindingLocked = mode !== 'create' && isBindingLocked(activity)

  // 暂停时长需要实时跳变颜色，与列表页一致；仅在活动处于暂停态时启动定时器
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (activity.status !== 'paused') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [activity.status])
  const pauseInfo = getPauseInfo(activity, now)

  const priceDisadvantages = findPriceDisadvantages(activity, memberPriceActivities)

  useEffect(() => {
    if (isView) setStep(PREVIEW_STEP)
  }, [isView])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])

  const update = <K extends keyof PaidMemberPriceActivityForm>(
    key: K,
    value: PaidMemberPriceActivityForm[K],
  ) => {
    onChange({ ...activity, [key]: value })
  }

  const toggleChannel = (id: string) => {
    if (ruleLocked) return
    const next = activity.channels.includes(id)
      ? activity.channels.filter((c) => c !== id)
      : [...activity.channels, id]
    update('channels', next)
  }

  const toggleOrderType = (id: string) => {
    if (ruleLocked) return
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
      const err = validateStep(activity, i, cards)
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
    const err = validateStep(activity, step, cards)
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

  return (
    <div className={`wizard ${isView ? 'wizard--view' : ''}`}>
      <div className="wizard-header">
        <div className="wizard-header__main">
          <h2 className="wizard-header__title">{activity.name || '未命名活动'}</h2>
          <span className={`status-badge status-badge--${activity.status}`}>
            {PAID_MEMBER_PRICE_STATUS_LABELS[activity.status]}
          </span>
          {pauseInfo && (
            <span className={`pause-timer pause-timer--${pauseInfo.level}`}>{pauseInfo.label}</span>
          )}
          {isView && <span className="wizard-header__badge">查看模式</span>}
        </div>
        <div className="wizard-header__meta">
          <span>活动ID：{activity.id}</span>
          <span>创建者：{activity.creator}</span>
        </div>
      </div>

      {ruleLocked && (
        <div className="alert-banner alert-banner--warning">
          <span className="alert-banner__icon">!</span>
          <span>
            活动进行中，仅可修改活动名称、标题、促销标签与活动说明。
            如需调整优惠力度、参与商品、参与门店或使用时段，请先返回列表暂停活动。
          </span>
        </div>
      )}

      {!isView && (
        <div className="stepper">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`stepper__item ${i < step ? 'is-done' : ''} ${i === step ? 'is-active' : ''} ${i <= step ? 'is-clickable' : ''}`}
              onClick={() => goToStep(i)}
              disabled={i > step}
            >
              <div className="stepper__circle">{i < step ? '✓' : i + 1}</div>
              <div className="stepper__label">{label}</div>
              {i < STEPS.length - 1 && <div className="stepper__line" />}
            </button>
          ))}
        </div>
      )}

      <div className="wizard-body">
        <div className={`wizard-content ${step === PREVIEW_STEP ? 'wizard-content--preview' : ''}`}>
          {error && (
            <div ref={errorRef} className="form-error" role="alert">{error}</div>
          )}

          {step === 0 && (
            <div className="wizard-step wizard-step--animate">
              <Section title="关联付费会员卡与权益">
                <PaidMemberPriceCardBinding
                  activity={activity}
                  cards={cards}
                  locked={bindingLocked}
                  readOnly={readOnly}
                  onChange={onChange}
                  onGoToCards={onGoToCards}
                />
              </Section>
            </div>
          )}

          {step === 1 && (
            <div className="wizard-step wizard-step--animate">
              <Section title="适用渠道">
                <FormRow label="参与渠道">
                  <div className="channel-group">
                    {CHANNELS.map((ch) => (
                      <button key={ch.id} type="button" disabled={readOnly || ruleLocked} className={`channel-btn ${activity.channels.includes(ch.id) ? 'is-active' : ''}`} onClick={() => toggleChannel(ch.id)}>
                        <span className="channel-btn__icon">{ch.icon}</span>
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </FormRow>
                <FormRow label="参与业务场景">
                  <div className="checkbox-group">
                    {ORDER_TYPES.map((ot) => (
                      <label key={ot.id} className="checkbox">
                        <input type="checkbox" disabled={readOnly || ruleLocked} checked={activity.orderTypes.includes(ot.id)} onChange={() => toggleOrderType(ot.id)} />
                        {ot.label}
                      </label>
                    ))}
                  </div>
                </FormRow>
              </Section>

              <Section title="基础信息">
                <PaidMemberPriceBasicInfoFields activity={activity} readOnly={readOnly} ruleLocked={ruleLocked} onChange={onChange} />
              </Section>

              <Section title="活动规则">
                <PaidMemberPriceRuleLimitFields activity={activity} cards={cards} readOnly={readOnly} ruleLocked={ruleLocked} onChange={onChange} />
              </Section>

              <PaidMemberPriceAdvancedOptionsFields activity={activity} readOnly={readOnly} ruleLocked={ruleLocked} onChange={onChange} />
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step wizard-step--animate">
              <Section title="参与门店">
                <StorePicker
                  scope={activity.storeScope}
                  selectedIds={activity.storeIds}
                  readOnly={readOnly || ruleLocked}
                  onScopeChange={(scope) => update('storeScope', scope)}
                  onChange={(ids) => update('storeIds', ids)}
                />
              </Section>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step wizard-step--animate">
              <Section title="参与商品及优惠">
                <MemberPriceProductConfig
                  activity={activity}
                  readOnly={readOnly || ruleLocked}
                  showMemberLevels={false}
                  onChange={onChange}
                  onToast={onToast}
                />
              </Section>
            </div>
          )}

          {step === PREVIEW_STEP && (
            <div className="wizard-step wizard-step--animate">
              {priceDisadvantages.length > 0 && (
                <div className="alert-banner alert-banner--warning">
                  <span className="alert-banner__icon">!</span>
                  <span>
                    有 {priceDisadvantages.length} 个商品的付费会员价高于普通会员价，顾客付费开卡反而买得更贵，建议核对优惠力度：
                    {priceDisadvantages
                      .slice(0, 3)
                      .map((d) => `「${d.productName}」付费价 ¥${d.paidPrice}、普通会员价 ¥${d.memberPrice}（${d.memberActivityName}）`)
                      .join('；')}
                    {priceDisadvantages.length > 3 && ` 等 ${priceDisadvantages.length} 个商品`}。
                    仍可保存，结算时会按对顾客更优的价格执行。
                  </span>
                </div>
              )}
              <PaidMemberPriceActivityPreview
                activity={activity}
                cards={cards}
                showAnchorNav
                showEditLinks={!isView}
                onEditSection={(target) => { setError(null); setStep(target) }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="wizard-footer">
        {isView ? (
          <>
            <button type="button" className="btn btn--default" onClick={onCancel}>返回列表</button>
            {onSwitchToEdit && activity.status !== 'voided' && (
              <button type="button" className="btn btn--primary" onClick={onSwitchToEdit}>编辑活动</button>
            )}
          </>
        ) : (
          <>
            <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
            {step > 0 && <button type="button" className="btn btn--default" onClick={goPrev}>上一步</button>}
            {canDraft && (
              <button type="button" className="btn btn--default" onClick={onSaveDraft}>保存草稿</button>
            )}
            {step < PREVIEW_STEP ? (
              <button type="button" className="btn btn--primary" onClick={goNext}>下一步</button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={onSave}>{primaryActionLabel}</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="form-section__title">{title}</div>
      <div className="form-section__body">{children}</div>
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
