import { useEffect, useRef, useState } from 'react'
import { EnterpriseDiscountActivityPreview } from '../components/EnterpriseDiscountActivityPreview'
import { EnterpriseDiscountRuleFields } from '../components/EnterpriseDiscountRuleFields'
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
import { CHANNELS, ORDER_TYPES, STATUS_LABELS } from '../mockData'
import type { EnterpriseDiscountActivityForm, WizardMode } from '../types'
import { validateStep } from '../utils/enterpriseDiscountActivity'

interface EnterpriseDiscountActivityWizardProps {
  activity: EnterpriseDiscountActivityForm
  mode: WizardMode
  onChange: (activity: EnterpriseDiscountActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
  onToast?: (message: string) => void
}

const STEPS = ['活动基础规则', '选择参与门店', '选择参与商品', '预览并保存']
const PREVIEW_STEP = STEPS.length - 1
const NAME_MAX = 20
const DESC_MAX = 30

export function EnterpriseDiscountActivityWizard({
  activity,
  mode,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
  onToast,
}: EnterpriseDiscountActivityWizardProps) {
  const isView = mode === 'view'
  const readOnly = isView
  const [step, setStep] = useState(isView ? PREVIEW_STEP : 0)
  const [error, setError] = useState<string | null>(null)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isView) setStep(PREVIEW_STEP)
  }, [isView])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])

  const update = <K extends keyof EnterpriseDiscountActivityForm>(
    key: K,
    value: EnterpriseDiscountActivityForm[K],
  ) => {
    onChange({ ...activity, [key]: value })
  }

  const toggleChannel = (id: string) => {
    const next = activity.channels.includes(id)
      ? activity.channels.filter((item) => item !== id)
      : [...activity.channels, id]
    update('channels', next)
  }

  const toggleOrderType = (id: string) => {
    const next = activity.orderTypes.includes(id)
      ? activity.orderTypes.filter((item) => item !== id)
      : [...activity.orderTypes, id]
    update('orderTypes', next)
  }

  const goToStep = (target: number) => {
    if (isView) return
    if (target <= step) {
      setError(null)
      setStep(target)
      return
    }
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
    setStep((current) => Math.min(current + 1, PREVIEW_STEP))
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
            {error && <div ref={errorRef} className="form-error" role="alert">{error}</div>}

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
                  <PromoFormRow label="活动名称" required>
                    <div className="char-input-wrap">
                      <input
                        className="input input--wide input--count"
                        disabled={readOnly}
                        maxLength={NAME_MAX}
                        value={activity.name}
                        placeholder="请输入活动名称"
                        onChange={(event) => update('name', event.target.value.slice(0, NAME_MAX))}
                      />
                      <span className="char-count">{activity.name.length}/{NAME_MAX}</span>
                    </div>
                  </PromoFormRow>
                  <PromoFormRow label="活动描述">
                    <div className="char-textarea-wrap">
                      <textarea
                        className="textarea textarea--count"
                        disabled={readOnly}
                        rows={3}
                        maxLength={DESC_MAX}
                        value={activity.description}
                        placeholder="请输入活动描述，非必填"
                        onChange={(event) => update('description', event.target.value.slice(0, DESC_MAX))}
                      />
                      <span className="char-count">{activity.description.length}/{DESC_MAX}</span>
                    </div>
                    <p className="field-hint">最多 30 个字，非必填。</p>
                  </PromoFormRow>
                  <PromoFormRow label="活动时间" required>
                    <div className="date-range">
                      <input
                        type="datetime-local"
                        className="input input--time"
                        disabled={readOnly}
                        value={activity.startTime.slice(0, 16)}
                        onChange={(event) => update('startTime', event.target.value.replace('T', ' ') + ':00')}
                      />
                      <span className="date-range__sep">至</span>
                      <input
                        type="datetime-local"
                        className="input input--time"
                        disabled={readOnly}
                        value={activity.endTime.slice(0, 16)}
                        onChange={(event) => update('endTime', event.target.value.replace('T', ' ') + ':00')}
                      />
                    </div>
                  </PromoFormRow>
                  <PromoFormRow label="活动周期" required>
                    <RadioGroup
                      disabled={readOnly}
                      value={activity.cycleType}
                      options={[
                        { value: 'daily', label: '每天' },
                        { value: 'weekly', label: '每周' },
                        { value: 'monthly', label: '每月' },
                      ]}
                      onChange={(value) => update('cycleType', value as EnterpriseDiscountActivityForm['cycleType'])}
                    />
                  </PromoFormRow>
                  <PromoFormRow label="活动时段" required>
                    <RadioGroup
                      disabled={readOnly}
                      value={activity.timeSlotType}
                      options={[
                        { value: 'all_day', label: '全天' },
                        { value: 'specific', label: '指定时间段' },
                      ]}
                      onChange={(value) => update('timeSlotType', value as EnterpriseDiscountActivityForm['timeSlotType'])}
                    />
                  </PromoFormRow>
                </PromoSection>

                <PromoSection title="活动规则">
                  <EnterpriseDiscountRuleFields activity={activity} readOnly={readOnly} onChange={onChange} />
                </PromoSection>
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
                  <PromoFormRow label="商品选择方式">
                    <RadioGroup
                      disabled={readOnly}
                      value={activity.productSelectionMode}
                      options={[
                        { value: 'include', label: '参与商品(正选)' },
                        { value: 'exclude', label: '不参与商品(反选)' },
                      ]}
                      onChange={(value) => update('productSelectionMode', value as EnterpriseDiscountActivityForm['productSelectionMode'])}
                    />
                  </PromoFormRow>
                  <PromoFormRow label="商品范围" required>
                    <RadioGroup
                      disabled={readOnly}
                      value={activity.productScope}
                      options={[
                        { value: 'all', label: '全部商品' },
                        { value: 'partial', label: '指定商品' },
                      ]}
                      onChange={(value) => update('productScope', value as EnterpriseDiscountActivityForm['productScope'])}
                    />
                  </PromoFormRow>
                  {activity.productScope === 'partial' && !readOnly && (
                    <div className="section-toolbar">
                      <button type="button" className="btn btn--primary" onClick={() => setShowProductPicker(true)}>选择商品</button>
                    </div>
                  )}
                  {activity.productScope === 'partial' && (
                    <SelectedProductTable
                      productIds={activity.productIds}
                      readOnly={readOnly}
                      onChange={(ids) => update('productIds', ids)}
                      onToast={onToast}
                      itemLabel={activity.productSelectionMode === 'exclude' ? '不参与商品' : '商品'}
                      emptyText="暂无商品，请点击「选择商品」添加"
                      columns={[
                        {
                          key: 'name',
                          header: '商品',
                          render: (product) => (
                            <>
                              <div>{product.name}</div>
                              <div className="text-secondary mono">{product.id}</div>
                            </>
                          ),
                        },
                        { key: 'spec', header: '规格', render: (product) => product.spec },
                        { key: 'price', header: '价格', render: (product) => product.price },
                      ]}
                    />
                  )}
                </PromoSection>
              </div>
            )}

            {step === PREVIEW_STEP && (
              <div className="wizard-step wizard-step--animate">
                <EnterpriseDiscountActivityPreview
                  activity={activity}
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
              {step > 0 && (
                <button type="button" className="btn btn--default" onClick={() => { setError(null); setStep((current) => current - 1) }}>
                  上一步
                </button>
              )}
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
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="radio-group">
      {options.map((option) => (
        <label key={option.value} className="radio">
          <input type="radio" disabled={disabled} checked={value === option.value} onChange={() => onChange(option.value)} />
          {option.label}
        </label>
      ))}
    </div>
  )
}
