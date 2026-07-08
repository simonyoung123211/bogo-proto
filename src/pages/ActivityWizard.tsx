import { useEffect, useRef, useState } from 'react'
import { ActivityPreview } from '../components/ActivityPreview'
import { AdvancedOptionsFields } from '../components/AdvancedOptionsFields'
import { BasicInfoFields } from '../components/BasicInfoFields'
import { CouponGiftConfigPanel } from '../components/CouponGiftConfigPanel'
import { GiftGroupsEditor, GiftDisplayTitleField, GiftGroupImagePicker, GIFT_PRODUCT_MAX } from '../components/GiftGroupsEditor'
import { MaxStorageCouponsField } from '../components/MaxStorageCouponsField'
import { StorageCouponDescriptionField } from '../components/StorageCouponDescriptionField'
import { ProductPicker } from '../components/ProductPicker'
import { RuleLimitFields } from '../components/RuleLimitFields'
import { StorePicker } from '../components/StorePicker'
import { CHANNELS, ORDER_TYPES, STATUS_LABELS, createEmptyCouponGift, createEmptyGiftGroup, DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE, DEFAULT_STORAGE_COUPON_DISPLAY_TITLE } from '../mockData'
import type { ActivityForm, WizardMode } from '../types'
import { getActivityProducts, validateStep, withClampedMaxDiscountItemsPerOrder } from '../utils/activity'

interface ActivityWizardProps {
  activity: ActivityForm
  mode: WizardMode
  onChange: (activity: ActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
}

const STEPS = ['活动基础规则', '选择参与门店', '选择参与商品', '预览并保存']
const PREVIEW_STEP = STEPS.length - 1

export function ActivityWizard({
  activity,
  mode,
  onChange,
  onCancel,
  onSaveDraft,
  onSave,
  onSwitchToEdit,
}: ActivityWizardProps) {
  const isView = mode === 'view'
  const readOnly = isView
  const [step, setStep] = useState(isView ? PREVIEW_STEP : 0)
  const [error, setError] = useState<string | null>(null)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showGiftProductPicker, setShowGiftProductPicker] = useState(false)
  const [giftPickerGroupIndex, setGiftPickerGroupIndex] = useState(0)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isView) setStep(PREVIEW_STEP)
  }, [isView])

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [error])

  const update = <K extends keyof ActivityForm>(key: K, value: ActivityForm[K]) => {
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

  const handleEditSection = (targetStep: number) => {
    setError(null)
    setStep(targetStep)
  }

  const selectedProducts = getActivityProducts(activity)

  const handleRuleTypeChange = (v: ActivityForm['ruleType']) => {
    if (v === 'buyA_getA') {
      onChange({
        ...activity,
        ruleType: v,
        giftGroups: [],
        buyAStorageGift: activity.buyAStorageGift ?? createEmptyCouponGift(),
      })
    } else {
      const groups = activity.giftGroups.length > 0 ? activity.giftGroups : [createEmptyGiftGroup()]
      onChange(withClampedMaxDiscountItemsPerOrder({ ...activity, ruleType: v, giftGroups: groups }))
    }
  }

  const showPreviewLayout = step === PREVIEW_STEP

  return (
    <div className={`wizard ${isView ? 'wizard--view' : ''}`}>
      <div className="wizard-header">
        <div className="wizard-header__main">
          <h2 className="wizard-header__title">{activity.name || '未命名活动'}</h2>
          <span className={`status-badge status-badge--${activity.status}`}>
            {STATUS_LABELS[activity.status]}
          </span>
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
        <div className={`wizard-content ${showPreviewLayout ? 'wizard-content--preview' : ''}`}>
          {error && (
            <div ref={errorRef} className="form-error" role="alert">
              {error}
            </div>
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
                <FormRow label="参与订单类型">
                  <div className="checkbox-group">
                    {ORDER_TYPES.map((ot) => (
                      <label key={ot.id} className="checkbox">
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={activity.orderTypes.includes(ot.id)}
                          onChange={() => toggleOrderType(ot.id)}
                        />
                        {ot.label}
                      </label>
                    ))}
                  </div>
                </FormRow>
              </Section>

              <Section title="基础信息">
                <BasicInfoFields
                  activity={activity}
                  readOnly={readOnly}
                  onChange={onChange}
                />
              </Section>

              <Section title="赠送规则">
                <FormRow label="规则类型">
                  <div>
                    <RadioGroup
                      disabled={readOnly}
                      value={activity.ruleType}
                      options={[
                        { value: 'buyA_getA', label: '买A送A' },
                        { value: 'buyA_getB', label: '买A送B' },
                      ]}
                      onChange={(v) => handleRuleTypeChange(v as ActivityForm['ruleType'])}
                    />
                    <p className="field-hint">
                      {activity.ruleType === 'buyA_getA'
                        ? '买A送A：赠品与活动商品为同一 SKU，同一活动 SKU 无论购买多少件，最多赠送 1 件。'
                        : '买A送B：赠品与活动商品不同，同一活动 SKU 无论购买多少件，最多赠送 2 件赠品。'}
                    </p>
                  </div>
                </FormRow>
                {activity.ruleType === 'buyA_getA' && (
                  <div className="form-row form-row--top">
                    <label className="form-label">赠品配置</label>
                    <div className="form-control gift-groups-v2">
                      <div className="gift-group-card">
                        <div className="gift-group-card__body">
                          <div className="gift-group-card__section">
                            <div className="gift-group-card__section-title">
                              <span className="gift-group-card__section-dot" />
                              实物赠品
                            </div>
                            <GiftDisplayTitleField
                              label="小程序展示标题"
                              hint="买A送A 实物赠品为同款 SKU；此标题用于小程序赠品选择页「实物赠品」入口，如：当单立享"
                              value={activity.buyAPhysicalDisplayTitle}
                              defaultValue={DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE}
                              readOnly={readOnly}
                              onChange={(v) => update('buyAPhysicalDisplayTitle', v)}
                            />
                          </div>

                          <div className="gift-group-card__divider" />

                          <div className="gift-group-card__section">
                            <div className="gift-group-card__section-title">
                              <span className="gift-group-card__section-dot gift-group-card__section-dot--blue" />
                              寄存券赠品
                            </div>
                            <CouponGiftConfigPanel
                              mode="buyA"
                              config={activity.buyAStorageGift}
                              maxStoragePerOrder={activity.maxStorageCouponsPerOrder}
                              storageDescription={activity.storageCouponDescription}
                              readOnly={readOnly}
                              onChange={(buyAStorageGift) => update('buyAStorageGift', buyAStorageGift)}
                              onMaxStorageChange={(v) => update('maxStorageCouponsPerOrder', v)}
                              onDescriptionChange={(v) => update('storageCouponDescription', v)}
                            />
                            {activity.buyAStorageGift.storageEnabled && (
                              <GiftDisplayTitleField
                                label="小程序展示标题"
                                hint="用于小程序赠品选择页「寄存券赠品」入口标题，如：我要寄存，下次用"
                                value={activity.buyAStorageGift.displayTitle}
                                defaultValue={DEFAULT_STORAGE_COUPON_DISPLAY_TITLE}
                                readOnly={readOnly}
                                onChange={(displayTitle) =>
                                  update('buyAStorageGift', { ...activity.buyAStorageGift, displayTitle })
                                }
                              />
                            )}
                          </div>

                          <div className="gift-group-card__divider" />

                          <div className="gift-group-card__section">
                            <div className="gift-group-card__section-title">
                              <span className="gift-group-card__section-dot gift-group-card__section-dot--orange" />
                              赠品组说明图片
                            </div>
                            <p className="gift-group-image-desc">
                              用于小程序赠品选择页中本组赠品的标题说明区域。上传图片后将以图片形式展示组说明，便于商家个性化运营；未上传时使用上方配置的标题文案。
                            </p>
                            <GiftGroupImagePicker
                              groupIndex={0}
                              value={activity.buyAGiftImage}
                              physicalTitle={activity.buyAPhysicalDisplayTitle}
                              readOnly={readOnly}
                              onChange={(image) => update('buyAGiftImage', image)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {activity.ruleType === 'buyA_getB' && (
                  <>
                    <GiftGroupsEditor
                      groups={activity.giftGroups}
                      readOnly={readOnly}
                      onChange={(groups) => onChange(withClampedMaxDiscountItemsPerOrder({ ...activity, giftGroups: groups }))}
                      onPickPhysicalProducts={(index) => {
                        setGiftPickerGroupIndex(index)
                        setShowGiftProductPicker(true)
                      }}
                    />
                    {activity.giftGroups.some((g) => g.couponGift.storageEnabled) && (
                      <>
                        <MaxStorageCouponsField
                          value={activity.maxStorageCouponsPerOrder}
                          readOnly={readOnly}
                          onChange={(v) => update('maxStorageCouponsPerOrder', v)}
                        />
                        <StorageCouponDescriptionField
                          value={activity.storageCouponDescription}
                          readOnly={readOnly}
                          onChange={(v) => update('storageCouponDescription', v)}
                        />
                      </>
                    )}
                  </>
                )}
                <RuleLimitFields
                  activity={activity}
                  readOnly={readOnly}
                  onChange={onChange}
                />
              </Section>

              <AdvancedOptionsFields
                activity={activity}
                readOnly={readOnly}
                onChange={onChange}
              />
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
                      { value: 'partial', label: '部分商品' },
                    ]}
                    onChange={(v) => update('productScope', v as ActivityForm['productScope'])}
                  />
                </FormRow>
                {activity.productScope === 'partial' && !readOnly && (
                  <div className="section-toolbar">
                    <button type="button" className="btn btn--primary" onClick={() => setShowProductPicker(true)}>
                      添加商品
                    </button>
                  </div>
                )}
                {activity.productScope === 'partial' && (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>商品名称</th>
                        <th>规格</th>
                        <th>类目</th>
                        <th>编码</th>
                        <th>条码</th>
                        <th>销售价</th>
                        {!readOnly && <th>操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.length === 0 ? (
                        <tr><td colSpan={readOnly ? 6 : 7} className="table-empty">暂无数据</td></tr>
                      ) : (
                        selectedProducts.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div>{p.name}</div>
                              <div className="text-secondary mono">{p.id}</div>
                            </td>
                            <td>{p.spec}</td>
                            <td>{p.categoryName}</td>
                            <td>{p.code}</td>
                            <td>{p.barcode}</td>
                            <td>¥{p.price}</td>
                            {!readOnly && (
                              <td>
                                <button
                                  type="button"
                                  className="link-btn"
                                  onClick={() => update('productIds', activity.productIds.filter((id) => id !== p.id))}
                                >
                                  移除
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </Section>
            </div>
          )}

          {step === PREVIEW_STEP && (
            <div className="wizard-step wizard-step--animate">
              <ActivityPreview
                activity={activity}
                showAnchorNav
                showEditLinks={!isView}
                onEditSection={handleEditSection}
              />
            </div>
          )}
        </div>
      </div>

      <div className="wizard-footer">
        {isView ? (
          <>
            <button type="button" className="btn btn--default" onClick={onCancel}>返回列表</button>
            {onSwitchToEdit && (
              <button type="button" className="btn btn--primary" onClick={onSwitchToEdit}>编辑活动</button>
            )}
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
      {showGiftProductPicker && (
        <ProductPicker
          title="选择赠送商品"
          selectedIds={activity.giftGroups[giftPickerGroupIndex]?.physicalProductIds ?? []}
          maxCount={GIFT_PRODUCT_MAX}
          onChange={(ids) => {
            const groups = activity.giftGroups.map((g, i) =>
              i === giftPickerGroupIndex ? { ...g, physicalProductIds: ids } : g,
            )
            update('giftGroups', groups)
          }}
          onClose={() => setShowGiftProductPicker(false)}
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
      <label className="form-label">
        {required && <span className="required">*</span>}
        {label}
      </label>
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
          <input
            type="radio"
            disabled={disabled}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}
