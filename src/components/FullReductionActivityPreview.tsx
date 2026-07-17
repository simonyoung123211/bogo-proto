import { useState } from 'react'
import { formatFullReductionAdvancedPreview } from './FullReductionAdvancedOptionsFields'
import { formatFullReductionBasicPreview } from './FullReductionBasicInfoFields'
import { formatFullReductionLimitsSummary } from './FullReductionRuleLimitFields'
import { CHANNELS, ORDER_TYPES } from '../mockData'
import type { FullReductionActivityForm } from '../types'
import {
  FULL_REDUCTION_DINER_ORDER_TYPES,
  formatRuleSummary,
  getActivityProducts,
  getActivityStores,
  getChannelSummary,
  getProductScopeLabel,
  getProductSummary,
  getStoreScopeLabel,
  getStoreSummary,
  getThresholdTypeLabel,
} from '../utils/fullReductionActivity'

const PREVIEW_SECTIONS = [
  { id: 'fr-preview-scope', title: '适用范围', step: 0 },
  { id: 'fr-preview-basic', title: '基础信息', step: 0 },
  { id: 'fr-preview-rules', title: '活动规则', step: 0 },
  { id: 'fr-preview-advanced', title: '高级选项', step: 0 },
  { id: 'fr-preview-stores', title: '参与门店', step: 1 },
  { id: 'fr-preview-products', title: '参与商品', step: 2 },
] as const

interface FullReductionActivityPreviewProps {
  activity: FullReductionActivityForm
  showAnchorNav?: boolean
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function FullReductionActivityPreview({
  activity,
  showAnchorNav = true,
  showEditLinks = false,
  onEditSection,
}: FullReductionActivityPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(PREVIEW_SECTIONS[0].id)
  const selectedProducts = getActivityProducts(activity)
  const selectedStores = getActivityStores(activity)
  const basic = formatFullReductionBasicPreview(activity)
  const adv = formatFullReductionAdvancedPreview(activity)
  const limits = formatFullReductionLimitsSummary(activity)
  const summaryTags = [
    getThresholdTypeLabel(activity.thresholdType),
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
            <button key={s.id} type="button" className={`preview-nav__item ${activeAnchor === s.id ? 'is-active' : ''}`} onClick={() => scrollToSection(s.id)}>
              {s.title}
            </button>
          ))}
        </nav>
      )}

      <div className="preview-sections">
        <PreviewSection id="fr-preview-scope" title="适用范围" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="参与渠道" value={activity.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join('、') || '-'} />
          <PreviewItem
            label="业务场景"
            value={
              activity.orderTypes
                .map((c) => {
                  const diner = activity.thresholdType === 'diner_count'
                    ? FULL_REDUCTION_DINER_ORDER_TYPES.find((x) => x.id === c)
                    : undefined
                  return diner?.label ?? ORDER_TYPES.find((x) => x.id === c)?.label
                })
                .filter(Boolean)
                .join('、') || '-'
            }
          />
        </PreviewSection>

        <PreviewSection id="fr-preview-basic" title="基础信息" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="活动名称" value={activity.name || '-'} />
          <PreviewItem label="点单页展示标题" value={activity.title || '-'} />
          <PreviewItem label="活动时间" value={`${activity.startTime} 至 ${activity.endTime}`} />
          <PreviewItem label="活动周期" value={basic.cycle} />
          <PreviewItem label="活动时段" value={basic.timeSlot} />
          <PreviewItem label="活动说明" value={activity.description || '-'} />
        </PreviewSection>

        <PreviewSection id="fr-preview-rules" title="活动规则" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="门槛类型" value={getThresholdTypeLabel(activity.thresholdType)} />
          <PreviewItem label="优惠设置" value={formatRuleSummary(activity)} />
          <PreviewItem label="加料商品" value={limits.toppings} />
          <PreviewItem label="包装费" value={limits.packaging} />
          <PreviewItem label="套餐加价" value={limits.combo} />
          <PreviewItem label="做法加价" value={limits.preparation} />
          <PreviewItem label="参与总次数" value={limits.totalLimit} />
          <PreviewItem label="参与频次" value={limits.frequency} />
        </PreviewSection>

        <PreviewSection id="fr-preview-advanced" title="高级选项" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="共享互斥" value={adv.shareLabel} />
          <PreviewItem label="参与用户" value={adv.userLabel} />
          <PreviewItem label="打标签" value={adv.tagLabel} />
          <PreviewItem label="活动编码" value={activity.activityCode || '-'} />
          <PreviewItem label="点单页展示标题可见" value={adv.display(activity.titleDisplay)} />
        </PreviewSection>

        <PreviewSection id="fr-preview-stores" title="参与门店" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="门店范围" value={getStoreScopeLabel(activity)} />
          {activity.storeScope !== 'all' && (
            <PreviewItem
              label="已选门店"
              value={selectedStores.length ? selectedStores.map((s) => s.name).join('、') : '未选择'}
            />
          )}
        </PreviewSection>

        <PreviewSection id="fr-preview-products" title="参与商品" step={2} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="商品范围" value={getProductScopeLabel(activity)} />
          <PreviewItem label="选择方式" value={activity.productSelectionMode === 'include' ? '正选' : '反选'} />
          {activity.productScope === 'partial' && (
            <PreviewItem
              label="已选商品"
              value={selectedProducts.length ? selectedProducts.map((p) => p.name).join('、') : '未选择'}
            />
          )}
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
        <h3>{title}</h3>
        {showEdit && onEdit && (
          <button type="button" className="link-btn" onClick={() => onEdit(step)}>编辑</button>
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
