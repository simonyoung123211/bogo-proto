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
import { CHANNELS, ORDER_TYPES, STATUS_LABELS, createEmptyCouponGift, createEmptyGiftGroup, DEFAULT_PHYSICAL_GIFT_DISPLAY_TITLE, DEFAULT_STORAGE_COUPON_DISPLAY_TITLE } from '../mockData'
import type { ActivityForm, WizardMode } from '../types'
import { validateStep, withClampedMaxDiscountItemsPerOrder } from '../utils/activity'

interface ActivityWizardProps {
  activity: ActivityForm
  mode: WizardMode
  onChange: (activity: ActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
  onSwitchToEdit?: () => void
  onToast?: (message: string) => void
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
  onToast,
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
          <div className={`wizard-content ${showPreviewLayout ? 'wizard-content--preview' : ''}`}>
          {error && (
            <div ref={errorRef} className="form-error" role="alert">
              {error}
            </div>
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
                <PromoFormRow label="参与订单类型">
                  <SceneTickChoices
                    options={ORDER_TYPES}
                    selectedIds={activity.orderTypes}
                    disabled={readOnly}
                    onToggle={toggleOrderType}
                  />
                </PromoFormRow>
              </PromoSection>

              <PromoSection title="基础信息">
                <BasicInfoFields
                  activity={activity}
                  readOnly={readOnly}
                  onChange={onChange}
                />
              </PromoSection>

              <PromoSection title="赠送规则">
                <PromoFormRow label="规则类型">
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
                </PromoFormRow>
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
                      giftDiscountCapByMainSku={!!activity.giftDiscountCapByMainSku}
                      onGiftDiscountCapChange={(enabled) => update('giftDiscountCapByMainSku', enabled)}
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
              </PromoSection>

              <AdvancedOptionsFields
                activity={activity}
                readOnly={readOnly}
                onChange={onChange}
              />
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
                      { value: 'partial', label: '部分商品' },
                    ]}
                    onChange={(v) => update('productScope', v as ActivityForm['productScope'])}
                  />
                </PromoFormRow>
                {activity.productScope === 'partial' && !readOnly && (
                  <div className="section-toolbar">
                    <button type="button" className="btn btn--primary" onClick={() => setShowProductPicker(true)}>
                      添加商品
                    </button>
                  </div>
                )}
                {activity.productScope === 'partial' && (
                  <SelectedProductTable
                    productIds={activity.productIds}
                    readOnly={readOnly}
                    onChange={(ids) => update('productIds', ids)}
                    onToast={onToast}
                    emptyText="暂无数据，请点击「添加商品」选择参与商品"
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
                      { key: 'code', header: '编码', render: (p) => p.code },
                      { key: 'barcode', header: '条码', render: (p) => p.barcode },
                      { key: 'price', header: '销售价', render: (p) => `¥${p.price}` },
                    ]}
                  />
                )}
              </PromoSection>
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
