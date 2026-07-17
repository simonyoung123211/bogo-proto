import { useState } from 'react'
import { formatMemberPriceAdvancedPreview } from './MemberPriceAdvancedOptionsFields'
import { formatMemberPriceBasicPreview } from './MemberPriceBasicInfoFields'
import { formatMemberPriceLimitsSummary } from './MemberPriceRuleLimitFields'
import { CHANNELS, ORDER_TYPES, products } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS } from '../mockMemberPriceData'
import type { MemberPriceActivityForm } from '../types'
import {
  formatPriceMethodValue,
  formatRuleSummary,
  getActivityProducts,
  isUniformPricing,
  getActivityStores,
  getChannelSummary,
  getMemberLevelsSummary,
  getProductScopeLabel,
  getProductSummary,
  getStoreScopeLabel,
  getStoreSummary,
} from '../utils/memberPriceActivity'

const PREVIEW_SECTIONS = [
  { id: 'mp-preview-scope', title: '适用范围', step: 0 },
  { id: 'mp-preview-basic', title: '基础信息', step: 0 },
  { id: 'mp-preview-rules', title: '活动规则', step: 0 },
  { id: 'mp-preview-advanced', title: '高级选项', step: 0 },
  { id: 'mp-preview-stores', title: '参与门店', step: 1 },
  { id: 'mp-preview-products', title: '参与商品及优惠', step: 2 },
] as const

interface MemberPriceActivityPreviewProps {
  activity: MemberPriceActivityForm
  showAnchorNav?: boolean
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function MemberPriceActivityPreview({
  activity,
  showAnchorNav = true,
  showEditLinks = false,
  onEditSection,
}: MemberPriceActivityPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(PREVIEW_SECTIONS[0].id)
  const selectedProducts = getActivityProducts(activity)
  const selectedStores = getActivityStores(activity)
  const summaryTags = [
    MEMBER_PRICE_METHOD_LABELS[activity.priceMethod],
    getMemberLevelsSummary(activity),
    getProductSummary(activity),
    getStoreSummary(activity),
    getChannelSummary(activity),
  ]
  const basic = formatMemberPriceBasicPreview(activity)
  const adv = formatMemberPriceAdvancedPreview(activity)
  const limits = formatMemberPriceLimitsSummary(activity)
  const valueMap = new Map(activity.productItems.map((i) => [i.productId, i.value]))

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
        <PreviewSection id="mp-preview-scope" title="适用范围" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="参与渠道" value={activity.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join('、') || '-'} />
          <PreviewItem label="订单类型" value={activity.orderTypes.map((c) => ORDER_TYPES.find((x) => x.id === c)?.label).join('、') || '-'} />
        </PreviewSection>

        <PreviewSection id="mp-preview-basic" title="基础信息" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="活动名称" value={activity.name || '-'} />
          <PreviewItem label="点单页展示标题" value={activity.title || '-'} />
          <PreviewItem label="商品卡片展示标签" value={activity.tag || '-'} />
          <PreviewItem label="活动时间" value={`${activity.startTime} 至 ${activity.endTime}`} />
          <PreviewItem label="活动周期" value={basic.cycle} />
          <PreviewItem label="活动时段" value={basic.timeSlot} />
          <PreviewItem label="活动说明" value={activity.description || '-'} />
        </PreviewSection>

        <PreviewSection id="mp-preview-rules" title="活动规则" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="会员等级" value={getMemberLevelsSummary(activity)} />
          <PreviewItem label="会员价形式" value={formatRuleSummary(activity)} />
          <PreviewItem label="加料费用" value={limits.toppings} />
          <PreviewItem label="套餐加价" value={limits.combo} />
          <PreviewItem label="做法加价" value={limits.preparation} />
        </PreviewSection>

        <PreviewSection id="mp-preview-advanced" title="高级选项" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="共享互斥" value={adv.shareLabel} />
          <PreviewItem label="打标签" value={adv.tagLabel} />
          <PreviewItem label="活动编码" value={activity.activityCode || '-'} />
          <PreviewItem label="标题展示" value={adv.display(activity.titleDisplay)} />
          <PreviewItem label="会员价标签" value={adv.display(activity.memberPriceTagDisplay)} />
          <PreviewItem label="商品标签" value={adv.display(activity.tagDisplay)} />
        </PreviewSection>

        <PreviewSection id="mp-preview-stores" title="参与门店" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="门店范围" value={getStoreScopeLabel(activity)} />
          {activity.storeScope !== 'all' && (
            <PreviewItem
              label="已选门店"
              value={selectedStores.length === 0 ? '-' : selectedStores.map((s) => s.name).join('、')}
            />
          )}
        </PreviewSection>

        <PreviewSection id="mp-preview-products" title="参与商品及优惠" step={2} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="商品范围" value={getProductScopeLabel(activity)} />
          <PreviewItem label="会员等级" value={getMemberLevelsSummary(activity)} />
          <PreviewItem
            label="优惠形式"
            value={
              isUniformPricing(activity)
                ? `${MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]}（参与商品统一${formatPriceMethodValue(activity.priceMethod, activity.allProductsValue)}）`
                : MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]
            }
          />
          {activity.productScope === 'partial' && activity.productSelectionMode === 'exclude' && (
            <PreviewItem
              label="不参与商品"
              value={
                products
                  .filter((p) => activity.productIds.includes(p.id))
                  .map((p) => p.name)
                  .join('、') || '-'
              }
            />
          )}
          {activity.productScope === 'partial' && selectedProducts.length > 0 && (
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>规格</th>
                  <th>原价</th>
                  <th>会员价</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.spec}</td>
                    <td>¥{p.price}</td>
                    <td>
                      {formatPriceMethodValue(
                        activity.priceMethod,
                        isUniformPricing(activity) ? activity.allProductsValue : valueMap.get(p.id) ?? 0,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
