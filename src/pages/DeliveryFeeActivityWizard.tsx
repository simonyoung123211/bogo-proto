import { useEffect, useRef, useState } from 'react'
import { DeliveryFeeActivityPreview } from '../components/DeliveryFeeActivityPreview'
import { DeliveryFeeAdvancedOptionsFields } from '../components/DeliveryFeeAdvancedOptionsFields'
import { DeliveryFeeBasicInfoFields } from '../components/DeliveryFeeBasicInfoFields'
import { DeliveryFeeRuleFields } from '../components/DeliveryFeeRuleFields'
import { ProductPicker } from '../components/ProductPicker'
import { SelectedProductTable } from '../components/SelectedProductTable'
import { StorePicker } from '../components/StorePicker'
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
              <Section title="适用渠道">
                <FormRow label="参与渠道">
                  <div className="channel-group">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={readOnly}
                        className={`channel-btn ${activity.channels.includes(ch.id) ? 'is-active' : ''}`}
                        onClick={() => toggleChannel(ch.id)}
                      >
                        <span className="channel-btn__icon">{ch.icon}</span>
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </FormRow>
                <FormRow label="参与场景/业务" required>
                  <div>
                    <div className="checkbox-group checkbox-group--wrap">
                      {DELIVERY_FEE_ORDER_TYPES.map((ot) => {
                        const takeawayBlocked = byCity && ot.kind === 'takeaway'
                        return (
                          <label key={ot.id} className={`checkbox ${takeawayBlocked ? 'is-disabled' : ''}`}>
                            <input
                              type="checkbox"
                              disabled={readOnly || takeawayBlocked}
                              checked={activity.orderTypes.includes(ot.id)}
                              onChange={() => toggleOrderType(ot.id)}
                            />
                            {ot.label}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </FormRow>
              </Section>

              <Section title="基础信息">
                <DeliveryFeeBasicInfoFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </Section>

              <Section title="活动规则">
                <DeliveryFeeRuleFields
                  activity={activity}
                  readOnly={readOnly}
                  onChange={onChange}
                  onToast={onToast}
                />
              </Section>

              <DeliveryFeeAdvancedOptionsFields activity={activity} readOnly={readOnly} onChange={onChange} />
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
              <Section title="参与商品">
                <FormRow label="商品范围">
                  <RadioGroup
                    disabled={readOnly}
                    value={activity.productScope}
                    options={[
                      { value: 'all', label: '全部商品' },
                      { value: 'partial', label: '指定商品' },
                    ]}
                    onChange={(v) => update('productScope', v as DeliveryFeeActivityForm['productScope'])}
                  />
                </FormRow>
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
              </Section>
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

      <div className="wizard-footer">
        {isView ? (
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
        )}
      </div>

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
