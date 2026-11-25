import { useEffect, useMemo, useRef, useState } from 'react'
import { LimitDiscountConfigReview, limitDiscountTimeSummary } from '../components/LimitDiscountConfigReview'
import { LimitDiscountConflicts, type DiscountConflictActivityActions } from '../components/LimitDiscountConflicts'
import { LimitDiscountGoodsFields } from '../components/LimitDiscountGoodsFields'
import { LimitDiscountRuleFields } from '../components/LimitDiscountRuleFields'
import { LimitDiscountStoreScopeFields } from '../components/LimitDiscountStoreScopeFields'
import { ChannelCornerChoices, PromoFormRow, PromoSection, SceneTickChoices, WizardFooterBar, WizardStepCards } from '../components/promoWizardUi'
import { LIMIT_DISCOUNT_CHANNELS, LIMIT_DISCOUNT_SCENES } from '../mockLimitDiscountData'
import { STATUS_LABELS } from '../mockData'
import type { LimitDiscountActivityForm } from '../types'
import { resolveActivityProducts } from '../utils/activityProductSearch'
import { findDiscountConflicts } from '../utils/limitDiscountConflicts'
import {
  channelSummary, collectStepErrors, discountStrengthSummary, isPublishedLimitDiscount,
  previewPrice, previewSceneHint, publishedLimitDiscountEditError,
} from '../utils/limitDiscountActivity'

interface Props {
  activity: LimitDiscountActivityForm
  activities: LimitDiscountActivityForm[]
  perspectiveName: string
  focusEndTime?: boolean
  startAtStoreScope?: boolean
  returnedFromConflict?: boolean
  conflictOriginName?: string
  conflictActivityActions?: DiscountConflictActivityActions
  onRecheckConflicts: () => void
  onChange: (activity: LimitDiscountActivityForm) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSave: () => void
}

const STEPS = ['基础信息与规则', '参与门店', '商品与优惠', '提交保存']
const PREVIEW_STEP = STEPS.length - 1
type TimeField = 'start' | 'end' | 'cycle'

export function LimitDiscountActivityWizard({
  activity, activities, perspectiveName, focusEndTime, startAtStoreScope, returnedFromConflict,
  conflictOriginName, conflictActivityActions, onRecheckConflicts, onChange, onCancel, onSaveDraft, onSave,
}: Props) {
  const [step, setStep] = useState(returnedFromConflict ? PREVIEW_STEP : startAtStoreScope ? 1 : 0)
  const [errors, setErrors] = useState<string[]>([])
  const [focusTime, setFocusTime] = useState<TimeField | null>(focusEndTime ? 'end' : null)
  const [repairMessage, setRepairMessage] = useState(returnedFromConflict ? '已重新校验冲突' : '')
  const wizardRef = useRef<HTMLDivElement>(null)
  const saved = activities.find(({ id }) => id === activity.id)
  const published = saved && isPublishedLimitDiscount(saved.status) ? saved : undefined
  const status = saved?.status ?? activity.status
  const savedChanged = Boolean(saved && (saved.status !== activity.status || saved.updatedAt !== activity.updatedAt))
  const canSaveDraft = status === 'draft' && !savedChanged
  const editingConflict = conflictOriginName !== undefined

  const errorsByStep = [0, 1, 2].map((index) => {
    const current = collectStepErrors(activity, index, saved)
    if (index === 0 && published && activity.endTime && activity.endTime < published.endTime) {
      return ['已发布活动的结束时间只能延后', ...current]
    }
    return current
  })
  const firstIncomplete = errorsByStep.findIndex((list) => list.length > 0)
  const conflicts = useMemo(
    () => step === PREVIEW_STEP ? findDiscountConflicts(activity, activities) : [],
    [activity, activities, step],
  )

  useEffect(() => {
    const root = wizardRef.current
    if (step === 0 && focusTime) {
      const label = focusTime === 'start' ? '开始时间' : '结束时间'
      const selector = focusTime === 'cycle' ? '#ld-activity-cycle input:checked' : `button[aria-label="${label}"]`
      const field = root?.querySelector<HTMLElement>(selector)
      field?.focus({ preventScroll: true })
      field?.scrollIntoView({ block: 'center' })
      if (focusTime !== 'cycle') field?.click()
    } else {
      root?.scrollIntoView({ block: 'start' })
    }
  }, [step, focusTime])

  function toggleList(key: 'channels' | 'orderTypes', id: string) {
    if (published && (key === 'orderTypes' || published.channels.includes(id))) return
    const list = activity[key]
    onChange({ ...activity, [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id] })
  }

  function goTo(target: number, focusDate: TimeField | null = null) {
    setFocusTime(focusDate)
    if (target !== PREVIEW_STEP) setRepairMessage('')
    for (let index = step; index < target; index++) {
      if (errorsByStep[index].length) {
        setStep(index)
        setErrors(errorsByStep[index])
        return
      }
    }
    setErrors([])
    setStep(target)
  }

  function handleSave() {
    if (firstIncomplete !== -1) {
      setStep(firstIncomplete)
      setErrors(errorsByStep[firstIncomplete])
      return
    }
    const editError = published && publishedLimitDiscountEditError(published, activity)
    if (editError) {
      setErrors([editError])
      return
    }
    onSave()
  }

  function showConflictResult(message: string) {
    setRepairMessage(message)
    requestAnimationFrame(() => wizardRef.current?.querySelector<HTMLElement>('#ld-conflict-applied')?.focus({ preventScroll: true }))
  }

  return (
    <div className="wizard" ref={wizardRef}>
      <div className="wizard-header">
        <div className="wizard-header__main">
          <h2 className="wizard-header__title">{activity.name || '新建限时折扣'}</h2>
          <span className={`status-badge status-badge--${status}`}>{STATUS_LABELS[status]}</span>
        </div>
        <div className="wizard-header__meta">
          <span>活动ID：{activity.id}</span>
          <span>当前操作视角：{perspectiveName}</span>
          <span>已选 {activity.channels.length} 个渠道 · {activity.orderTypes.length} 个场景</span>
        </div>
      </div>
      <WizardStepCards steps={STEPS} step={step} previewStep={PREVIEW_STEP}
        pendingCounts={errorsByStep.map(({ length }) => length)} onGoToStep={goTo} />

      <div className="wizard-body">
        {editingConflict && (
          <p className="ld-conflict-origin">
            正在调整冲突活动。保存或取消后会返回「{conflictOriginName || '未命名活动'}」并重新校验。
            {published && '已发布活动可调整门店和点位，也可调整活动周期。'}
          </p>
        )}
        <div className="promo-editor">
          {(step === 0 || step === PREVIEW_STEP) && <DiscountPhonePreview activity={activity} />}
          <div className="wizard-content">
            {savedChanged && <div className="alert-banner alert-banner--warning" role="alert">活动已发生变化，请返回后重新打开</div>}
            {errors.length > 0 && <div className="form-error" role="alert">{errors[0]}</div>}
            {step === 0 && (
              <div className="wizard-step wizard-step--animate">
                {published && <div className="alert-banner alert-banner--info">活动已发布。已投放渠道只能新增，开始时间、业务场景和资格规则已锁定。</div>}
                <PromoSection title="适用渠道">
                  <PromoFormRow label="参与渠道" required>
                    <ChannelCornerChoices
                      options={LIMIT_DISCOUNT_CHANNELS.map(({ id, label, icon }) => ({
                        id, label, icon, disabled: published?.channels.includes(id),
                        title: published?.channels.includes(id) ? '已投放渠道' : undefined,
                      }))}
                      selectedIds={activity.channels}
                      onToggle={(id) => toggleList('channels', id)}
                    />
                  </PromoFormRow>
                  <PromoFormRow label="参与业务/场景" required>
                    <SceneTickChoices options={[...LIMIT_DISCOUNT_SCENES]}
                      selectedIds={activity.orderTypes} disabled={Boolean(published)}
                      onToggle={(id) => toggleList('orderTypes', id)} />
                  </PromoFormRow>
                </PromoSection>
                <PromoSection title="基础信息">
                  <LimitDiscountRuleFields activity={activity} published={published} onChange={onChange} />
                </PromoSection>
              </div>
            )}
            {step === 1 && (
              <div className="wizard-step wizard-step--animate">
                <LimitDiscountStoreScopeFields activity={activity} onChange={onChange} />
              </div>
            )}
            {step === 2 && (
              <div className="wizard-step wizard-step--animate">
                <PromoSection title="参与商品及优惠">
                  <LimitDiscountGoodsFields activity={activity} published={published} onChange={onChange} />
                </PromoSection>
              </div>
            )}
            {step === PREVIEW_STEP && (
              <div className="wizard-step wizard-step--animate">
                {repairMessage && (
                  <p className="ld-conflict-applied" id="ld-conflict-applied" tabIndex={-1} role="status">
                    {repairMessage}。{conflicts.length ? `仍有 ${conflicts.length} 场冲突待处理。` : '当前无冲突，请复核配置后保存。'}
                  </p>
                )}
                {conflicts.length > 0 && <LimitDiscountConflicts conflicts={conflicts} activity={activity} activityIsSaved={Boolean(saved)}
                  activityActions={savedChanged ? undefined : conflictActivityActions}
                  onNavigate={(target) => goTo(target, target === 0 ? published ? 'cycle' : 'start' : null)}
                  onRecheck={() => { onRecheckConflicts(); showConflictResult('已重新校验冲突') }}
                  onApply={(next, message) => {
                    setErrors([])
                    onChange(next)
                    showConflictResult(message)
                  }} />}
                <h2 className="ld-review-title">配置复核</h2>
                <LimitDiscountConfigReview activity={activity} onEdit={goTo} showTrial />
                <div className="ld-submit-note">
                  <h3>保存后</h3>
                  <p>{published ? '按新配置生效，活动状态保持原样。已投放商品的优惠和库存保持锁定。'
                    : '保存后进入待发布。发布后按配置的活动时间开始。'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <WizardFooterBar isView={false}
        health={firstIncomplete >= 0 ? (
          <>
            <span className="wizard-footer__warn">还有配置待完善</span>
            <button type="button" className="link-btn" onClick={() => { setErrors([]); setStep(firstIncomplete) }}>
              {errorsByStep[firstIncomplete][0]}
            </button>
          </>
        ) : conflicts.length ? (
          <>
            <span className="wizard-footer__warn">{conflicts.length} 场冲突待处理</span>
            <button type="button" className="link-btn" onClick={() => {
              const panel = wizardRef.current?.querySelector<HTMLElement>('#ld-submit-conflicts')
              panel?.focus({ preventScroll: true })
              panel?.scrollIntoView({ block: 'start' })
            }}>查看冲突</button>
          </>
        ) : <span className="wizard-footer__ok">配置体检：已完成</span>}
        actions={(
          <>
            <button type="button" className="btn btn--default" onClick={onCancel}>{editingConflict ? '取消并返回' : '取消'}</button>
            {step > 0 && <button type="button" className="btn btn--default" onClick={() => goTo(step - 1)}>上一步</button>}
            {canSaveDraft && <button type="button" className="btn btn--default" onClick={onSaveDraft}>保存至草稿</button>}
            {step < PREVIEW_STEP ? (
              <button type="button" className="btn btn--primary" onClick={() => goTo(step + 1)}>下一步</button>
            ) : (
              <button type="button" className="btn btn--primary" disabled={savedChanged || conflicts.length > 0} onClick={handleSave}>
                {editingConflict ? '保存并返回' : '保存'}
              </button>
            )}
          </>
        )}
      />
    </div>
  )
}

function DiscountPhonePreview({ activity }: { activity: LimitDiscountActivityForm }) {
  const [showOffer, setShowOffer] = useState(false)
  const previewProducts = resolveActivityProducts({
    productScope: activity.goodsScope === 'all' ? 'all' : 'partial',
    productSelectionMode: activity.goodsScope === 'exclude' ? 'exclude' : 'include',
    productIds: activity.productItems.map((item) => item.productId),
  }).slice(0, 3)
  const sceneHint = previewSceneHint(activity)
  const showTitle = activity.titleDisplay === 'show' && Boolean(activity.title || activity.name)
  return (
    <aside className="ld-phone mp-aside" aria-label="点单页预览">
      <div className="ld-phone__bar"><span>10:46</span><span>5G</span></div>
      <div className="ld-phone__store">门店名称<span>距您 1.7km</span></div>
      <div className="ld-phone__tabs">
        <span className={activity.orderTypes.includes('delivery_pickup') || activity.orderTypes.includes('pack') ? 'is-on' : ''}>自取</span>
        <span className={activity.orderTypes.includes('delivery') ? 'is-on' : ''}>外卖</span>
      </div>
      {showTitle && (
        <button type="button" className="ld-phone__banner" aria-expanded={showOffer} onClick={() => setShowOffer(!showOffer)}>
          {activity.title || activity.name}<em>{showOffer ? '收起' : '点击查看'}</em>
        </button>
      )}
      {showTitle && showOffer && (
        <div className="ld-phone__offer">
          <strong>门店优惠活动</strong>
          <p>{discountStrengthSummary(activity)}</p>
          <p>{limitDiscountTimeSummary(activity)}</p>
          {activity.description && <p>{activity.description}</p>}
        </div>
      )}
      <div className="ld-phone__goods">
        {previewProducts.map((product) => (
          <div key={product.id} className="ld-phone__good">
            <div>
              <strong>{product.name}</strong>
              {activity.goodsLabelDisplay === 'show' && activity.goodsLabel && <em>{activity.goodsLabel}</em>}
            </div>
            <span>¥{previewPrice(product, activity, activity.productItems.find((item) => item.productId === product.id))}</span>
          </div>
        ))}
      </div>
      <p className="ld-phone__foot">{sceneHint ? `${sceneHint} · ` : ''}投放到 {channelSummary(activity)}</p>
    </aside>
  )
}
