import { useState } from 'react'
import { formatPaidAdvancedPreview } from './PaidMemberPriceAdvancedOptionsFields'
import { formatPaidBasicPreview } from './PaidMemberPriceBasicInfoFields'
import { CHANNELS, ORDER_TYPES, products } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS } from '../mockMemberPriceData'
import { PAID_MEMBER_CARD_STATUS_LABELS } from '../mockPaidMemberPriceData'
import type { PaidMemberCardTemplate, PaidMemberPriceActivityForm } from '../types'
import {
  formatPriceMethodValue,
  getActivityProducts,
  getActivityStores,
  getChannelSummary,
  getProductScopeLabel,
  getProductSummary,
  getStoreScopeLabel,
  getStoreSummary,
  isUniformPricing,
} from '../utils/memberPriceActivity'
import {
  findBenefit,
  findCard,
  formatBenefitQuota,
  formatPaidRuleSummary,
} from '../utils/paidMemberPriceActivity'

const PREVIEW_SECTIONS = [
  { id: 'pmp-preview-binding', title: '关联权益卡', step: 0 },
  { id: 'pmp-preview-scope', title: '适用范围', step: 1 },
  { id: 'pmp-preview-basic', title: '基础信息', step: 1 },
  { id: 'pmp-preview-rules', title: '活动规则', step: 1 },
  { id: 'pmp-preview-advanced', title: '高级选项', step: 1 },
  { id: 'pmp-preview-stores', title: '参与门店', step: 2 },
  { id: 'pmp-preview-products', title: '参与商品及优惠', step: 3 },
] as const

interface PaidMemberPriceActivityPreviewProps {
  activity: PaidMemberPriceActivityForm
  cards: PaidMemberCardTemplate[]
  showAnchorNav?: boolean
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function PaidMemberPriceActivityPreview({
  activity,
  cards,
  showAnchorNav = true,
  showEditLinks = false,
  onEditSection,
}: PaidMemberPriceActivityPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(PREVIEW_SECTIONS[0].id)
  const selectedProducts = getActivityProducts(activity)
  const selectedStores = getActivityStores(activity)
  const card = findCard(cards, activity.cardTemplateId)
  const benefit = findBenefit(cards, activity.cardTemplateId, activity.benefitId)
  const summaryTags = [
    card ? `${card.name} · ${benefit?.name ?? '未选权益'}` : '未关联权益卡',
    MEMBER_PRICE_METHOD_LABELS[activity.priceMethod],
    getProductSummary(activity),
    getStoreSummary(activity),
    getChannelSummary(activity),
  ]
  const basic = formatPaidBasicPreview(activity)
  const adv = formatPaidAdvancedPreview(activity)
  const valueMap = new Map(activity.productItems.map((i) => [i.productId, i.value]))

  const scrollToSection = (id: string) => {
    setActiveAnchor(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const yn = (v: boolean) => (v ? '参与' : '不参与')

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
        <PreviewSection id="pmp-preview-binding" title="关联权益卡" step={0} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="付费会员卡" value={card ? `${card.name}（${PAID_MEMBER_CARD_STATUS_LABELS[card.status]}）` : '未关联'} />
          <PreviewItem label="卡模版 ID" value={activity.cardTemplateId || '-'} />
          <PreviewItem label="付费会员价权益" value={benefit?.name ?? '未关联'} />
          <PreviewItem label="权益 ID" value={activity.benefitId || '-'} />
          <PreviewItem label="体验卡" value={benefit ? (benefit.experienceCardEnabled ? '享受本权益' : '不享受本权益') : '-'} />
          {benefit && card && (
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>规格</th>
                  <th>优惠权益次数</th>
                  <th>优惠商品件数</th>
                </tr>
              </thead>
              <tbody>
                {formatBenefitQuota(benefit, card).map((q) => (
                  <tr key={q.specLabel}>
                    <td>{q.specLabel}</td>
                    <td>{q.count}</td>
                    <td>{q.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PreviewSection>

        <PreviewSection id="pmp-preview-scope" title="适用范围" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="参与渠道" value={activity.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join('、') || '-'} />
          <PreviewItem label="订单类型" value={activity.orderTypes.map((c) => ORDER_TYPES.find((x) => x.id === c)?.label).join('、') || '-'} />
        </PreviewSection>

        <PreviewSection id="pmp-preview-basic" title="基础信息" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="活动名称" value={activity.name || '-'} />
          <PreviewItem label="点单页展示标题" value={activity.title || '-'} />
          <PreviewItem label="商品卡片展示标签" value={activity.tag || '-'} />
          <PreviewItem label="活动时间" value="无起止时间，跟随关联的付费会员卡" />
          <PreviewItem label="权益使用周期" value={basic.cycle} />
          <PreviewItem label="权益使用时段" value={basic.timeSlot} />
          <PreviewItem label="活动说明" value={activity.description || '-'} />
        </PreviewSection>

        <PreviewSection id="pmp-preview-rules" title="活动规则" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="优惠形式" value={formatPaidRuleSummary(activity)} />
          <PreviewItem label="加料费用" value={yn(activity.toppingsDiscount)} />
          <PreviewItem label="套餐加价" value={yn(activity.comboSurchargeDiscount)} />
          <PreviewItem label="做法加价" value={yn(activity.preparationSurchargeDiscount)} />
          <PreviewItem
            label="每天优惠件数"
            value={activity.maxDiscountItemsDailyType === 'limited' ? `每人每天最多 ${activity.maxDiscountItemsDaily} 件` : '不限'}
          />
          <PreviewItem
            label="每单优惠件数"
            value={activity.maxDiscountItemsPerOrderType === 'limited' ? `每人每单最多 ${activity.maxDiscountItemsPerOrder} 件` : '不限'}
          />
        </PreviewSection>

        <PreviewSection id="pmp-preview-advanced" title="高级选项" step={1} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="共享互斥" value={adv.shareLabel} />
          <PreviewItem label="活动编码" value={activity.activityCode || '-'} />
          <PreviewItem label="标题展示" value={adv.display(activity.titleDisplay)} />
          <PreviewItem label="付费会员价标签" value={adv.display(activity.memberPriceTagDisplay)} />
          <PreviewItem label="商品标签" value={adv.display(activity.tagDisplay)} />
        </PreviewSection>

        <PreviewSection id="pmp-preview-stores" title="参与门店" step={2} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="门店范围" value={getStoreScopeLabel(activity)} />
          {activity.storeScope !== 'all' && (
            <PreviewItem
              label="已选门店"
              value={selectedStores.length === 0 ? '-' : selectedStores.map((s) => s.name).join('、')}
            />
          )}
        </PreviewSection>

        <PreviewSection id="pmp-preview-products" title="参与商品及优惠" step={3} showEdit={showEditLinks} onEdit={onEditSection}>
          <PreviewItem label="商品范围" value={getProductScopeLabel(activity)} />
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
                  <th>付费会员价</th>
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
