import { useEffect, useRef, useState } from 'react'
import { DeliveryFeeActivityPreview } from '../components/DeliveryFeeActivityPreview'
import { DeliveryFeeAdvancedOptionsFields } from '../components/DeliveryFeeAdvancedOptionsFields'
import { DeliveryFeeBasicInfoFields } from '../components/DeliveryFeeBasicInfoFields'
import { DeliveryFeeRuleFields } from '../components/DeliveryFeeRuleFields'
import { ProductPicker } from '../components/ProductPicker'
import { SelectedProductTable } from '../components/SelectedProductTable'
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
import { CHANNELS, STATUS_LABELS } from '../mockData'
import {
  DELIVERY_FEE_ORDER_TYPES,
  DELIVERY_FEE_TAKEAWAY_TYPE_IDS,
} from '../mockDeliveryFeeData'
import type { DeliveryFeeActivityForm, WizardMode } from '../types'
import {
  applyOrderTypesChange,
  hasExpress,
  validateStep,
} from '../utils/deliveryFeeActivity'

interface DeliveryFeeActivityWizardProps {
  activity: DeliveryFeeActivityForm
  mode: WizardMode
  onChange: (activity: DeliveryFeeActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
  onToast?: (message: string) => void
}

const STEPS = ['活动基础规则', '选择参与门店', '选择参与商品', '预览并保存']
const PREVIEW_STEP = STEPS.length - 1

export function DeliveryFeeActivityWizard({
  activity,
  mode,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
  onToast,
}: DeliveryFeeActivityWizardProps) {
  const isView = mode === 'view'
  const readOnly = isView
  const [step, setStep] = useState(isView ? PREVIEW_STEP : 0)
  const [error, setError] = useState<string | null>(null)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const byCity = activity.ruleMode === 'by_city' && hasExpress(activity)

  useEffect(() => {
    if (isView) setStep(PREVIEW_STEP)
  }, [isView])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])

  const update = <K extends keyof DeliveryFeeActivityForm>(key: K, value: DeliveryFeeActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  const toggleChannel = (id: string) => {
    const next = activity.channels.includes(id)
      ? activity.channels.filter((c) => c !== id)
      : [...activity.channels, id]
    update('channels', next)
  }

  const toggleOrderType = (id: string) => {
    const isTakeaway = (DELIVERY_FEE_TAKEAWAY_TYPE_IDS as string[]).includes(id)
    if (byCity && isTakeaway) {
      onToast?.('指定城市仅对门店快递生效，不可同时勾选外卖类业务')
      return
    }
    const next = activity.orderTypes.includes(id)
      ? activity.orderTypes.filter((c) => c !== id)
      : [...activity.orderTypes, id]
    onChange(applyOrderTypesChange(activity, next))
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
                <PromoFormRow label="参与渠道">
                  <ChannelCornerChoices
                    options={CHANNELS}
                    selectedIds={activity.channels}
                    disabled={readOnly}
                    onToggle={toggleChannel}
                  />
                </PromoFormRow>
                <PromoFormRow label="参与场景/业务" required>
                  <SceneTickChoices
                    options={DELIVERY_FEE_ORDER_TYPES.map((ot) => {
                      const takeawayBlocked = byCity && ot.kind === 'takeaway'
                      return {
                        id: ot.id,
                        label: ot.label,
                        disabled: takeawayBlocked,
                        title: takeawayBlocked
                          ? '指定城市仅对门店快递生效，不可同时勾选外卖类业务'
                          : undefined,
                      }
                    })}
                    selectedIds={activity.orderTypes}
                    disabled={readOnly}
                    onToggle={toggleOrderType}
                  />
                </PromoFormRow>
              </PromoSection>

              <PromoSection title="基础信息">
                <DeliveryFeeBasicInfoFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </PromoSection>

              <PromoSection title="活动规则">
                <DeliveryFeeRuleFields
                  activity={activity}
                  readOnly={readOnly}
                  onChange={onChange}
                  onToast={onToast}
                />
              </PromoSection>

              <DeliveryFeeAdvancedOptionsFields activity={activity} readOnly={readOnly} onChange={onChange} />
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
              <PromoSection title="参与商品">
                <PromoFormRow label="商品范围">
                  <RadioGroup
                    disabled={readOnly}
                    value={activity.productScope}
                    options={[
                      { value: 'all', label: '全部商品' },
                      { value: 'partial', label: '指定商品' },
                    ]}
                    onChange={(v) => update('productScope', v as DeliveryFeeActivityForm['productScope'])}
                  />
                </PromoFormRow>
                {activity.productScope === 'partial' && !readOnly && (
                  <div className="section-toolbar">
                    <button type="button" className="btn btn--primary" onClick={() => setShowProductPicker(true)}>添加商品</button>
                  </div>
                )}
                {activity.productScope === 'partial' && (
                  <SelectedProductTable
                    productIds={activity.productIds}
                    readOnly={readOnly}
                    onChange={(ids) => update('productIds', ids)}
                    onToast={onToast}
                    emptyText="暂无数据，请点击「添加商品」选择商品"
                    columns={[
                      {
                        key: 'name',
                        header: '商品名称',
                        render: (p) => (
                          <>
                            <div>{p.name}</div>
                            <div className="text-secondary mono">{p.id}</div>
                          </>
                        ),
                      },
                      { key: 'spec', header: '规格', render: (p) => p.spec },
                      { key: 'category', header: '类目', render: (p) => p.categoryName },
                      { key: 'price', header: '销售价', render: (p) => `¥${p.price}` },
                    ]}
                  />
                )}
              </PromoSection>
            </div>
          )}

          {step === PREVIEW_STEP && (
            <div className="wizard-step wizard-step--animate">
              <DeliveryFeeActivityPreview
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

      {showProductPicker && (
        <ProductPicker
          selectedIds={activity.productIds}
          onChange={(ids) => update('productIds', ids)}
          onClose={() => setShowProductPicker(false)}
        />
      )}
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
          <input type="radio" disabled={disabled} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}
