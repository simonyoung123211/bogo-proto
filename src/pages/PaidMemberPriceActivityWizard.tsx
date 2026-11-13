import { useEffect, useRef, useState } from 'react'
import { MemberPriceProductConfig } from '../components/MemberPriceProductConfig'
import { PaidMemberPriceActivityPreview } from '../components/PaidMemberPriceActivityPreview'
import { PaidMemberPriceAdvancedOptionsFields } from '../components/PaidMemberPriceAdvancedOptionsFields'
import { PaidMemberPriceBasicInfoFields } from '../components/PaidMemberPriceBasicInfoFields'
import { PaidMemberPriceCardBinding } from '../components/PaidMemberPriceCardBinding'
import { PaidMemberPriceRuleLimitFields } from '../components/PaidMemberPriceRuleLimitFields'
import { StorePicker } from '../components/StorePicker'
import {
  ChannelCornerChoices,
  PromoFormRow,
  PromoSection,
  SceneTickChoices,
  WizardFooterBar,
  WizardStepCards,
  countStepPendings,
} from '../components/promoWizardUi'
import { CHANNELS, ORDER_TYPES } from '../mockData'
import { PAID_MEMBER_PRICE_STATUS_LABELS } from '../mockPaidMemberPriceData'
import type {
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
  WizardMode,
} from '../types'
import {
  getPauseInfo,
  isBindingLocked,
  isRuleLocked,
  validateStep,
} from '../utils/paidMemberPriceActivity'

interface PaidMemberPriceActivityWizardProps {
  activity: PaidMemberPriceActivityForm
  cards: PaidMemberCardTemplate[]
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
        <WizardStepCards
          steps={STEPS}
          step={step}
          previewStep={PREVIEW_STEP}
          pendingCounts={countStepPendings(PREVIEW_STEP, (s) => validateStep(activity, s, cards))}
          onGoToStep={goToStep}
        />
      )}

      <div className="wizard-body">
        <div className="promo-editor">
          <div className={`wizard-content ${step === PREVIEW_STEP ? 'wizard-content--preview' : ''}`}>
            {error && (
              <div ref={errorRef} className="form-error" role="alert">{error}</div>
            )}

            {step === 0 && (
              <div className="wizard-step wizard-step--animate">
                <PromoSection title="关联付费会员卡与权益">
                  <PaidMemberPriceCardBinding
                    activity={activity}
                    cards={cards}
                    locked={bindingLocked}
                    readOnly={readOnly}
                    onChange={onChange}
                    onGoToCards={onGoToCards}
                  />
                </PromoSection>
              </div>
            )}

            {step === 1 && (
              <div className="wizard-step wizard-step--animate">
                <PromoSection title="适用渠道">
                  <PromoFormRow label="参与渠道" required>
                    <ChannelCornerChoices
                      options={CHANNELS}
                      selectedIds={activity.channels}
                      disabled={readOnly || ruleLocked}
                      onToggle={toggleChannel}
                    />
                  </PromoFormRow>
                  <PromoFormRow label="参与业务场景" required>
                    <SceneTickChoices
                      options={ORDER_TYPES}
                      selectedIds={activity.orderTypes}
                      disabled={readOnly || ruleLocked}
                      onToggle={toggleOrderType}
                    />
                  </PromoFormRow>
                </PromoSection>

                <PromoSection title="基础信息">
                  <PaidMemberPriceBasicInfoFields activity={activity} readOnly={readOnly} ruleLocked={ruleLocked} onChange={onChange} />
                </PromoSection>

                <PromoSection title="活动规则">
                  <PaidMemberPriceRuleLimitFields activity={activity} cards={cards} readOnly={readOnly} ruleLocked={ruleLocked} onChange={onChange} />
                </PromoSection>

                <PaidMemberPriceAdvancedOptionsFields activity={activity} readOnly={readOnly} ruleLocked={ruleLocked} onChange={onChange} />
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step wizard-step--animate">
                <PromoSection title="参与门店">
                  <StorePicker
                    scope={activity.storeScope}
                    selectedIds={activity.storeIds}
                    readOnly={readOnly || ruleLocked}
                    onScopeChange={(scope) => update('storeScope', scope)}
                    onChange={(ids) => update('storeIds', ids)}
                  />
                </PromoSection>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-step wizard-step--animate">
                <PromoSection title="参与商品及优惠">
                  <MemberPriceProductConfig
                    activity={activity}
                    readOnly={readOnly || ruleLocked}
                    showMemberLevels={false}
                    onChange={onChange}
                    onToast={onToast}
                    sceneOrderTypes={activity.orderTypes}
                  />
                </PromoSection>
              </div>
            )}

            {step === PREVIEW_STEP && (
              <div className="wizard-step wizard-step--animate">
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
      </div>

      <WizardFooterBar
        isView={isView}
        health={
          !isView ? (
            (() => {
              const first = [0, 1, 2, 3].map((s) => ({ step: s, message: validateStep(activity, s, cards) })).find((x) => x.message)
              return first?.message ? (
                <>
                  <span className="wizard-footer__warn">还有配置待完善</span>
                  <button type="button" className="link-btn" onClick={() => { setError(null); setStep(first.step) }}>
                    {first.message}
                  </button>
                </>
              ) : (
                <span className="wizard-footer__ok">配置体检：已完成</span>
              )
            })()
          ) : undefined
        }
        actions={
          isView ? (
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
          )
        }
      />
    </div>
  )
}
