import { useEffect, useRef, useState } from 'react'
import { MultiItemActivityPreview } from '../components/MultiItemActivityPreview'
import { MultiItemAdvancedOptionsFields } from '../components/MultiItemAdvancedOptionsFields'
import { MultiItemBasicInfoFields } from '../components/MultiItemBasicInfoFields'
import { MultiItemRuleFields } from '../components/MultiItemRuleFields'
import { MultiItemRuleLimitFields } from '../components/MultiItemRuleLimitFields'
import { ProductPicker } from '../components/ProductPicker'
import { StorePicker } from '../components/StorePicker'
import { CHANNELS, ORDER_TYPES, STATUS_LABELS } from '../mockData'
import type { MultiItemActivityForm, WizardMode } from '../types'
import { getActivityProducts, validateStep } from '../utils/multiItemActivity'

interface MultiItemActivityWizardProps {
  activity: MultiItemActivityForm
  mode: WizardMode
  onChange: (activity: MultiItemActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
}

const STEPS = ['活动基础规则', '选择参与门店', '选择参与商品', '预览并保存']
const PREVIEW_STEP = STEPS.length - 1

export function MultiItemActivityWizard({
  activity,
  mode,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
}: MultiItemActivityWizardProps) {
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

  const update = <K extends keyof MultiItemActivityForm>(key: K, value: MultiItemActivityForm[K]) => {
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

  const selectedProducts = getActivityProducts(activity)

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
                      <button key={ch.id} type="button" disabled={readOnly} className={`channel-btn ${activity.channels.includes(ch.id) ? 'is-active' : ''}`} onClick={() => toggleChannel(ch.id)}>
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
                        <input type="checkbox" disabled={readOnly} checked={activity.orderTypes.includes(ot.id)} onChange={() => toggleOrderType(ot.id)} />
                        {ot.label}
                      </label>
                    ))}
                  </div>
                </FormRow>
              </Section>

              <Section title="基础信息">
                <MultiItemBasicInfoFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </Section>

              <Section title="活动规则">
                <MultiItemRuleFields activity={activity} readOnly={readOnly} onChange={onChange} />
                <MultiItemRuleLimitFields activity={activity} readOnly={readOnly} onChange={onChange} />
              </Section>

              <MultiItemAdvancedOptionsFields activity={activity} readOnly={readOnly} onChange={onChange} />
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
                <FormRow label="商品选择方式">
                  <RadioGroup
                    disabled={readOnly}
                    value={activity.productSelectionMode}
                    options={[
                      { value: 'include', label: '参与商品(正选)' },
                      { value: 'exclude', label: '不参与商品(反选)' },
                    ]}
                    onChange={(v) => update('productSelectionMode', v as MultiItemActivityForm['productSelectionMode'])}
                  />
                </FormRow>
                <FormRow label="商品范围">
                  <RadioGroup
                    disabled={readOnly}
                    value={activity.productScope}
                    options={[
                      { value: 'all', label: '全部商品' },
                      { value: 'partial', label: '指定商品' },
                    ]}
                    onChange={(v) => update('productScope', v as MultiItemActivityForm['productScope'])}
                  />
                </FormRow>
                {activity.productScope === 'partial' && !readOnly && (
                  <div className="section-toolbar">
                    <button type="button" className="btn btn--primary" onClick={() => setShowProductPicker(true)}>添加商品</button>
                  </div>
                )}
                {activity.productScope === 'partial' && (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>商品名称</th>
                        <th>规格</th>
                        <th>类目</th>
                        <th>销售价</th>
                        {!readOnly && <th>操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.length === 0 ? (
                        <tr><td colSpan={readOnly ? 4 : 5} className="table-empty">暂无数据</td></tr>
                      ) : selectedProducts.map((p) => (
                        <tr key={p.id}>
                          <td><div>{p.name}</div><div className="text-secondary mono">{p.id}</div></td>
                          <td>{p.spec}</td>
                          <td>{p.categoryName}</td>
                          <td>¥{p.price}</td>
                          {!readOnly && (
                            <td>
                              <button type="button" className="link-btn" onClick={() => update('productIds', activity.productIds.filter((id) => id !== p.id))}>移除</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Section>
            </div>
          )}

          {step === PREVIEW_STEP && (
            <div className="wizard-step wizard-step--animate">
              <MultiItemActivityPreview
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

function RadioGroup({ value, options, onChange, disabled }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
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
