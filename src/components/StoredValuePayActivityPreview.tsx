import { useState } from 'react'
import { formatStoredValuePayAdvancedPreview } from './StoredValuePayAdvancedOptionsFields'
import { formatStoredValuePayBasicPreview } from './StoredValuePayBasicInfoFields'
import { formatMemberPriceLimitsSummary } from './MemberPriceRuleLimitFields'
import { CHANNELS, ORDER_TYPES, products } from '../mockData'
import { STORED_VALUE_PAY_METHOD_LABELS, STORED_VALUE_PAY_RULE_LABELS } from '../mockStoredValuePayData'
import type { MemberPriceActivityForm, StoredValuePayActivityForm } from '../types'
import {
  formatPriceMethodValue,
  formatProductOnlyRuleSummary,
  getActivityProducts,
  getActivityStores,
  getChannelSummary,
  getPayRuleLabel,
  getProductScopeLabel,
  getProductSummary,
  getStoreScopeLabel,
  getStoreSummary,
  isUniformPricing,
} from '../utils/storedValuePayActivity'

const PREVIEW_SECTIONS = [
  { id: 'sv-preview-scope', title: '适用范围', step: 0 },
  { id: 'sv-preview-basic', title: '基础信息', step: 0 },
  { id: 'sv-preview-rules', title: '活动规则', step: 0 },
  { id: 'sv-preview-advanced', title: '高级选项', step: 0 },
  { id: 'sv-preview-stores', title: '参与门店', step: 1 },
  { id: 'sv-preview-products', title: '参与商品及优惠', step: 2 },
] as const

interface StoredValuePayActivityPreviewProps {
  activity: StoredValuePayActivityForm
  showAnchorNav?: boolean
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function StoredValuePayActivityPreview({
  activity,
  showAnchorNav = true,
  showEditLinks = false,
  onEditSection,
}: StoredValuePayActivityPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(PREVIEW_SECTIONS[0].id)
  const selectedProducts = getActivityProducts(activity)
  const selectedStores = getActivityStores(activity)
  const summaryTags = [
    getPayRuleLabel(activity.payRule, true),
    STORED_VALUE_PAY_METHOD_LABELS[activity.priceMethod],
    getProductSummary(activity),
    getStoreSummary(activity),
    getChannelSummary(activity),
  ]
  const basic = formatStoredValuePayBasicPreview(activity)
  const adv = formatStoredValuePayAdvancedPreview(activity)
  const limits = formatMemberPriceLimitsSummary(activity as unknown as MemberPriceActivityForm)
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
        <PreviewSection id="sv-preview-scope" title="适用范围" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="参与渠道" value={activity.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join('、') || '-'} />
          <PreviewItem label="业务类型" value={activity.orderTypes.map((c) => ORDER_TYPES.find((x) => x.id === c)?.label).join('、') || '-'} />
        </PreviewSection>

        <PreviewSection id="sv-preview-basic" title="基础信息" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="活动名称" value={activity.name || '-'} />
          <PreviewItem label="点单页展示标题" value={activity.title || '-'} />
          <PreviewItem label="商品促销标签" value={activity.tag || '-'} />
          <PreviewItem label="活动备注" value={activity.remark || '-'} />
          <PreviewItem label="活动时间" value={`${activity.startTime} 至 ${activity.endTime}`} />
          <PreviewItem label="活动周期" value={basic.cycle} />
          <PreviewItem label="活动时段" value={basic.timeSlot} />
          <PreviewItem label="活动说明" value={activity.description || '-'} />
        </PreviewSection>

        <PreviewSection id="sv-preview-rules" title="活动规则" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="支付参与规则" value={STORED_VALUE_PAY_RULE_LABELS[activity.payRule]} />
          <PreviewItem label="支付限制" value="仅储值余额支付可享" />
          <PreviewItem label="商品优惠形式" value={formatProductOnlyRuleSummary(activity)} />
          <PreviewItem label="加料费用" value={limits.toppings} />
          <PreviewItem label="套餐加价" value={limits.combo} />
          <PreviewItem label="做法加价" value={limits.preparation} />
        </PreviewSection>

        <PreviewSection id="sv-preview-advanced" title="高级选项" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="共享互斥" value={adv.shareLabel} />
          <PreviewItem label="参与用户" value={adv.userLabel} />
          <PreviewItem label="活动权重" value={String(adv.priority)} />
          <PreviewItem label="打标签" value={adv.tagLabel} />
          <PreviewItem label="活动编码" value={activity.activityCode || '-'} />
          <PreviewItem label="标题展示" value={adv.display(activity.titleDisplay)} />
          <PreviewItem label="储值优惠标签" value={adv.display(activity.memberPriceTagDisplay)} />
          <PreviewItem label="商品标签" value={adv.display(activity.tagDisplay)} />
        </PreviewSection>

        <PreviewSection id="sv-preview-stores" title="参与门店" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="门店范围" value={getStoreScopeLabel(activity)} />
          {activity.storeScope !== 'all' && (
            <PreviewItem
              label="已选门店"
              value={selectedStores.length === 0 ? '-' : selectedStores.map((s) => s.name).join('、')}
            />
          )}
        </PreviewSection>

        <PreviewSection id="sv-preview-products" title="参与商品及优惠" step={2} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="商品范围" value={getProductScopeLabel(activity)} />
          <PreviewItem
            label="优惠形式"
            value={
              isUniformPricing(activity)
                ? `${STORED_VALUE_PAY_METHOD_LABELS[activity.priceMethod]}（参与商品统一${formatPriceMethodValue(activity.priceMethod, activity.allProductsValue)}）`
                : STORED_VALUE_PAY_METHOD_LABELS[activity.priceMethod]
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
                  <th>活动价</th>
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
