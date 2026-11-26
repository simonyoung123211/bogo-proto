import { useEffect, useRef, useState } from 'react'
import { StoredValuePayActivityPreview } from '../components/StoredValuePayActivityPreview'
import { StoredValuePayAdvancedOptionsFields } from '../components/StoredValuePayAdvancedOptionsFields'
import { StoredValuePayBasicInfoFields } from '../components/StoredValuePayBasicInfoFields'
import { StoredValuePayPayRuleFields } from '../components/StoredValuePayPayRuleFields'
import { MemberPriceProductConfig } from '../components/MemberPriceProductConfig'
import { MemberPriceRuleLimitFields } from '../components/MemberPriceRuleLimitFields'
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
import { CHANNELS, ORDER_TYPES, STATUS_LABELS } from '../mockData'
import type { MemberPriceActivityForm, StoredValuePayActivityForm, WizardMode } from '../types'
import { validateStep } from '../utils/storedValuePayActivity'

interface StoredValuePayActivityWizardProps {
  activity: StoredValuePayActivityForm
  mode: WizardMode
  onChange: (activity: StoredValuePayActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
  onToast?: (message: string) => void
}

const STEPS = ['活动基础规则', '选择参与门店', '参与商品及优惠', '预览并保存']
const PREVIEW_STEP = STEPS.length - 1

export function StoredValuePayActivityWizard({
  activity,
  mode,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
  onToast,
}: StoredValuePayActivityWizardProps) {
  const isView = mode === 'view'
  const readOnly = isView
  const [step, setStep] = useState(isView ? PREVIEW_STEP : 0)
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isView) setStep(PREVIEW_STEP)
  }, [isView])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])

  const update = <K extends keyof StoredValuePayActivityForm>(
    key: K,
    value: StoredValuePayActivityForm[K],
  ) => {
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
        <WizardStepCards
          steps={STEPS}
          step={step}
          previewStep={PREVIEW_STEP}
          pendingCounts={countStepPendings(PREVIEW_STEP, (s) => validateStep(activity, s))}
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
                <PromoSection title="适用渠道">
                  <PromoFormRow label="参与渠道" required>
                    <ChannelCornerChoices
                      options={CHANNELS}
                      selectedIds={activity.channels}
                      disabled={readOnly}
                      onToggle={toggleChannel}
                    />
                  </PromoFormRow>
                  <PromoFormRow label="参与业务场景" required>
                    <SceneTickChoices
                      options={ORDER_TYPES}
                      selectedIds={activity.orderTypes}
                      disabled={readOnly}
                      onToggle={toggleOrderType}
                    />
                  </PromoFormRow>
                </PromoSection>

                <PromoSection title="基础信息">
                  <StoredValuePayBasicInfoFields activity={activity} readOnly={readOnly} onChange={onChange} />
                </PromoSection>

                <PromoSection title="支付参与规则">
                  <StoredValuePayPayRuleFields activity={activity} readOnly={readOnly} onChange={onChange} />
                </PromoSection>

                <PromoSection title="活动规则">
                  <MemberPriceRuleLimitFields
                    activity={activity as unknown as MemberPriceActivityForm}
                    readOnly={readOnly}
                    onChange={(next) => onChange(next as unknown as StoredValuePayActivityForm)}
                  />
                </PromoSection>

                <StoredValuePayAdvancedOptionsFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </div>
            )}

            {step === 1 && (
              <div className="wizard-step wizard-step--animate">
                <PromoSection title="参与门店">
                  <StorePicker
                    scope={activity.storeScope}
                    selectedIds={activity.storeIds}
                    readOnly={readOnly}
                    onScopeChange={(scope) => update('storeScope', scope)}
                    onChange={(ids) => update('storeIds', ids)}
                  />
                </PromoSection>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step wizard-step--animate">
                <PromoSection title="参与商品及优惠">
                  <MemberPriceProductConfig
                    activity={activity}
                    readOnly={readOnly}
                    onChange={onChange}
                    onToast={onToast}
                    showMemberLevels={false}
                    priceMethodLabel="商品优惠方式"
                    priceMethodHint="切换优惠方式后，已填写的优惠数值将按默认值重置。"
                    batchRemoveExtraNote="已填写的优惠数值会一并清除。"
                  />
                </PromoSection>
              </div>
            )}

            {step === PREVIEW_STEP && (
              <div className="wizard-step wizard-step--animate">
                <StoredValuePayActivityPreview
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

      <WizardFooterBar
        isView={isView}
        health={
          !isView ? (
            (() => {
              const first = [0, 1, 2].map((s) => ({ step: s, message: validateStep(activity, s) })).find((x) => x.message)
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
              {onSwitchToEdit && <button type="button" className="btn btn--primary" onClick={onSwitchToEdit}>编辑活动</button>}
            </>
          ) : (
            <>
              <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
              {step > 0 && <button type="button" className="btn btn--default" onClick={goPrev}>上一步</button>}
              <button type="button" className="btn btn--default" onClick={onSaveDraft}>保存草稿</button>
              {step < PREVIEW_STEP ? (
                <button type="button" className="btn btn--primary" onClick={goNext}>下一步</button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={onSave}>保存</button>
              )}
            </>
          )
        }
      />
    </div>
  )
}
