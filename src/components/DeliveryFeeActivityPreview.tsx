import { useState } from 'react'
import { formatDeliveryFeeAdvancedPreview } from './DeliveryFeeAdvancedOptionsFields'
import { formatDeliveryFeeBasicPreview } from './DeliveryFeeBasicInfoFields'
import { CHANNELS } from '../mockData'
import { DELIVERY_FEE_ORDER_TYPES } from '../mockDeliveryFeeData'
import type { DeliveryFeeActivityForm } from '../types'
import {
  formatRuleSummary,
  formatTierLine,
  getChannelSummary,
  getCityNames,
  getProductSummary,
  getRuleModeLabel,
  getStoreSummary,
  getThresholdTypeLabel,
  hasExpress,
} from '../utils/deliveryFeeActivity'

const PREVIEW_SECTIONS = [
  { id: 'df-preview-scope', title: '适用范围', step: 0 },
  { id: 'df-preview-basic', title: '基础信息', step: 0 },
  { id: 'df-preview-rules', title: '活动规则', step: 0 },
  { id: 'df-preview-advanced', title: '高级选项', step: 0 },
  { id: 'df-preview-stores', title: '参与门店', step: 1 },
  { id: 'df-preview-products', title: '参与商品', step: 2 },
] as const

interface DeliveryFeeActivityPreviewProps {
  activity: DeliveryFeeActivityForm
  showAnchorNav?: boolean
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function DeliveryFeeActivityPreview({
  activity,
  showAnchorNav = true,
  showEditLinks = false,
  onEditSection,
}: DeliveryFeeActivityPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(PREVIEW_SECTIONS[0].id)
  const basic = formatDeliveryFeeBasicPreview(activity)
  const adv = formatDeliveryFeeAdvancedPreview(activity)
  const byCity = activity.ruleMode === 'by_city' && hasExpress(activity)
  const summaryTags = [
    ...(hasExpress(activity) ? [`收货城市·${getRuleModeLabel(activity.ruleMode)}`] : []),
    formatRuleSummary(activity),
    getProductSummary(activity),
    getStoreSummary(activity),
    getChannelSummary(activity),
  ]

  const scrollToSection = (id: string) => {
    setActiveAnchor(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="activity-preview">
      <div className="preview-summary">
        <div className="preview-summary__title">配置摘要</div>
        <div className="preview-summary__tags">
          {summaryTags.map((tag) => (
            <span key={tag} className="preview-summary__tag">{tag}</span>
          ))}
        </div>
      </div>

      {showAnchorNav && (
        <nav className="preview-nav" aria-label="预览导航">
          {PREVIEW_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`preview-nav__item ${activeAnchor === s.id ? 'is-active' : ''}`}
              onClick={() => scrollToSection(s.id)}
            >
              {s.title}
            </button>
          ))}
        </nav>
      )}

      <div className="preview-sections">
        <PreviewSection id="df-preview-scope" title="适用范围" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="参与渠道" value={activity.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join('、') || '-'} />
          <PreviewItem
            label="适用业务"
            value={activity.orderTypes.map((id) => DELIVERY_FEE_ORDER_TYPES.find((o) => o.id === id)?.label ?? id).join('、') || '-'}
          />
        </PreviewSection>

        <PreviewSection id="df-preview-basic" title="基础信息" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="活动名称" value={activity.name || '-'} />
          <PreviewItem label="点单页标题" value={activity.title || '-'} />
          <PreviewItem label="活动时间" value={`${activity.startTime} ~ ${activity.endTime}`} />
          <PreviewItem label="活动周期" value={basic.cycle} />
          <PreviewItem label="活动时段" value={basic.timeSlot} />
          <PreviewItem label="活动说明" value={activity.description || '-'} />
        </PreviewSection>

        <PreviewSection id="df-preview-rules" title="活动规则" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          {hasExpress(activity) && (
            <PreviewItem label="收货城市" value={getRuleModeLabel(activity.ruleMode)} />
          )}
          <PreviewItem label="活动门槛" value={getThresholdTypeLabel(activity.thresholdType)} />
          {byCity && (
            <PreviewItem
              label="适用城市"
              value={activity.cityIds.length ? getCityNames(activity.cityIds) : '尚未选择'}
            />
          )}
          <PreviewItem
            label="优惠阶梯"
            value={activity.tiers.map((t) => formatTierLine(t, activity.thresholdType)).join('；') || '-'}
          />
          {byCity && (
            <PreviewItem label="未命中城市" value="本活动不减免配送费" />
          )}
          {activity.thresholdType === 'amount' && (
            <PreviewItem
              label="门槛口径"
              value={[
                activity.thresholdBase === 'sale_price' ? '商品售价小计' : '活动价小计',
                activity.includeToppings ? '含加料' : null,
                activity.includePackagingFee ? '含打包费/餐盒费' : null,
                activity.includePreparationSurcharge ? '含做法加价' : null,
              ].filter(Boolean).join('；')}
            />
          )}
          <PreviewItem
            label="参与总次数"
            value={
              activity.totalParticipationLimitType === 'unlimited'
                ? '不限制'
                : `最多${activity.totalParticipationLimit}单`
            }
          />
          <PreviewItem
            label="参与频次"
            value={
              activity.participationFrequencyType === 'unlimited'
                ? '不限制'
                : `${{ daily: '每天', weekly: '每周', monthly: '每月' }[activity.participationFrequencyPeriod]}最多${activity.participationFrequencyLimit}单`
            }
          />
        </PreviewSection>

        <PreviewSection id="df-preview-advanced" title="高级选项" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="共享互斥" value={adv.mutex} />
          <PreviewItem label="参与用户" value={adv.participant} />
          <PreviewItem label="活动编码" value={adv.activityCode} />
          <PreviewItem label="标题展示" value={adv.titleDisplay} />
        </PreviewSection>

        <PreviewSection id="df-preview-stores" title="参与门店" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="门店范围" value={getStoreSummary(activity)} />
        </PreviewSection>

        <PreviewSection id="df-preview-products" title="参与商品" step={2} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="商品范围" value={getProductSummary(activity)} />
        </PreviewSection>
      </div>
    </div>
  )
}

function PreviewSection({
  id,
  title,
  step,
  showEdit,
  onEdit,
  children,
}: {
  id: string
  title: string
  step: number
  showEdit?: boolean
  onEdit?: (step: number) => void
  children: React.ReactNode
}) {
  return (
    <section id={id} className="preview-section">
      <div className="preview-section__head">
        <h3 className="preview-section__title">{title}</h3>
        {showEdit && onEdit && (
          <button type="button" className="btn-link" onClick={() => onEdit(step)}>编辑</button>
        )}
      </div>
      <div className="preview-section__body">{children}</div>
    </section>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="preview-item">
      <div className="preview-item__label">{label}</div>
      <div className="preview-item__value">{value}</div>
    </div>
  )
}
