import { useState } from 'react'
import { formatMultiItemAdvancedPreview } from './MultiItemAdvancedOptionsFields'
import { formatMultiItemBasicPreview } from './MultiItemBasicInfoFields'
import { formatMultiItemRulePreview } from './MultiItemRuleFields'
import { formatMultiItemLimitsSummary } from './MultiItemRuleLimitFields'
import { CHANNELS, ORDER_TYPES } from '../mockData'
import type { MultiItemActivityForm } from '../types'
import {
  buildActivityPreviewTags,
  formatRuleSummary,
  getActivityProducts,
  getActivityStores,
  getMultiItemRuleTypeLabel,
  getRuleExample,
  getStoreScopeLabel,
  getProductScopeLabel,
} from '../utils/multiItemActivity'

const PREVIEW_SECTIONS = [
  { id: 'mi-preview-scope', title: '适用范围', step: 0 },
  { id: 'mi-preview-basic', title: '基础信息', step: 0 },
  { id: 'mi-preview-rules', title: '活动规则', step: 0 },
  { id: 'mi-preview-advanced', title: '高级选项', step: 0 },
  { id: 'mi-preview-stores', title: '参与门店', step: 1 },
  { id: 'mi-preview-products', title: '参与商品', step: 2 },
] as const

interface MultiItemActivityPreviewProps {
  activity: MultiItemActivityForm
  showAnchorNav?: boolean
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function MultiItemActivityPreview({
  activity,
  showAnchorNav = true,
  showEditLinks = false,
  onEditSection,
}: MultiItemActivityPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(PREVIEW_SECTIONS[0].id)
  const selectedProducts = getActivityProducts(activity)
  const selectedStores = getActivityStores(activity)
  const summaryTags = buildActivityPreviewTags(activity)
  const basic = formatMultiItemBasicPreview(activity)
  const adv = formatMultiItemAdvancedPreview(activity)
  const limits = formatMultiItemLimitsSummary(activity)
  const rule = formatMultiItemRulePreview(activity)

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
        <PreviewSection id="mi-preview-scope" title="适用范围" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="参与渠道" value={activity.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join('、') || '-'} />
          <PreviewItem label="订单类型" value={activity.orderTypes.map((c) => ORDER_TYPES.find((x) => x.id === c)?.label).join('、') || '-'} />
        </PreviewSection>

        <PreviewSection id="mi-preview-basic" title="基础信息" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="活动名称" value={activity.name || '-'} />
          <PreviewItem label="点单页展示标题" value={activity.title || '-'} />
          <PreviewItem label="商品卡片展示标签" value={activity.tag || '-'} />
          <PreviewItem label="活动时间" value={`${activity.startTime} 至 ${activity.endTime}`} />
          <PreviewItem label="活动周期" value={basic.cycle} />
          <PreviewItem label="活动时段" value={basic.timeSlot} />
          <PreviewItem label="活动说明" value={activity.description || '-'} />
        </PreviewSection>

        <PreviewSection id="mi-preview-rules" title="活动规则" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="规则类型" value={getMultiItemRuleTypeLabel(activity.ruleType)} />
          <PreviewItem label="活动商品" value={rule.skuMode} />
          <PreviewItem label="优惠规则" value={formatRuleSummary(activity)} />
          <PreviewItem label="优惠方式" value={rule.discountMethod} />
          <PreviewItem label="规则示例" value={getRuleExample(activity)} />
          <PreviewItem label="加料费用" value={limits.toppings} />
          <PreviewItem label="套餐加价" value={limits.combo} />
          <PreviewItem label="做法加价" value={limits.preparation} />
          <PreviewItem label="参与总次数" value={limits.totalLimit} />
          <PreviewItem label="参与频次" value={limits.frequency} />
          <PreviewItem label="件数限制(活动期)" value={limits.itemsTotal} />
          <PreviewItem label="件数限制(每天)" value={limits.itemsDaily} />
          <PreviewItem label="件数限制(每单)" value={limits.perOrder} />
          <PreviewItem label="优惠商品命中规则" value={limits.hitRule} />
        </PreviewSection>

        <PreviewSection id="mi-preview-advanced" title="高级选项" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="共享互斥" value={adv.shareLabel} />
          <PreviewItem label="参与用户" value={adv.userLabel} />
          <PreviewItem label="打标签" value={adv.tagLabel} />
          <PreviewItem label="活动编码" value={activity.activityCode || '-'} />
          <PreviewItem label="点单页展示标题可见" value={adv.display(activity.titleDisplay)} />
          <PreviewItem label="商品卡片展示标签可见" value={adv.display(activity.tagDisplay)} />
        </PreviewSection>

        <PreviewSection id="mi-preview-stores" title="参与门店" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="门店范围" value={getStoreScopeLabel(activity)} />
          {activity.storeScope !== 'all' && (
            <div className="preview-table-wrap">
              <table className="table table--compact">
                <thead><tr><th>门店名称</th><th>区域</th><th>编码</th></tr></thead>
                <tbody>
                  {selectedStores.length === 0 ? (
                    <tr><td colSpan={3} className="table-empty">未选择门店</td></tr>
                  ) : selectedStores.map((s) => (
                    <tr key={s.id}><td>{s.name}</td><td>{s.regionName}</td><td>{s.code}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PreviewSection>

        <PreviewSection id="mi-preview-products" title="参与商品" step={2} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="商品范围" value={getProductScopeLabel(activity)} />
          <PreviewItem label="选择方式" value={activity.productSelectionMode === 'include' ? '参与商品(正选)' : '不参与商品(反选)'} />
          {activity.productScope === 'partial' && (
            <div className="preview-table-wrap">
              <table className="table table--compact">
                <thead><tr><th>商品名称</th><th>规格</th><th>销售价</th></tr></thead>
                <tbody>
                  {selectedProducts.length === 0 ? (
                    <tr><td colSpan={3} className="table-empty">未选择商品</td></tr>
                  ) : selectedProducts.map((p) => (
                    <tr key={p.id}><td>{p.name}</td><td>{p.spec}</td><td>¥{p.price}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PreviewSection>
      </div>
    </div>
  )
}

function PreviewSection({ id, title, step, showEdit, onEdit, children }: {
  id: string; title: string; step: number; showEdit?: boolean; onEdit?: (step: number) => void; children: React.ReactNode
}) {
  return (
    <section id={id} className="preview-section">
      <div className="preview-section__header">
        <h3 className="preview-section__title">{title}</h3>
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
      <span className="preview-item__label">{label}</span>
      <span className="preview-item__value">{value}</span>
    </div>
  )
}
