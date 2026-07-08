import type { ReactNode } from 'react'
import { useState } from 'react'
import { formatAdvancedOptionsPreview } from './AdvancedOptionsFields'
import { formatBasicInfoPreview } from './BasicInfoFields'
import { formatRuleLimitsSummary } from './RuleLimitFields'
import { CHANNELS, ORDER_TYPES, products } from '../mockData'
import type { ActivityForm } from '../types'
import {
  buildActivityPreviewTags,
  getActivityProducts,
  getActivityStores,
  getGiftGroupsSummary,
} from '../utils/activity'
import { formatStorageDisplayRule } from '../utils/couponGift'

const PREVIEW_SECTIONS = [
  { id: 'preview-scope', title: '适用范围', step: 0 },
  { id: 'preview-basic', title: '基础信息', step: 0 },
  { id: 'preview-rules', title: '赠送规则', step: 0 },
  { id: 'preview-advanced', title: '高级选项', step: 0 },
  { id: 'preview-stores', title: '参与门店', step: 1 },
  { id: 'preview-products', title: '参与商品', step: 2 },
] as const

interface ActivityPreviewProps {
  activity: ActivityForm
  showAnchorNav?: boolean
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function ActivityPreview({
  activity,
  showAnchorNav = true,
  showEditLinks = false,
  onEditSection,
}: ActivityPreviewProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(PREVIEW_SECTIONS[0].id)
  const selectedProducts = getActivityProducts(activity)
  const selectedStores = getActivityStores(activity)
  const summaryTags = buildActivityPreviewTags(activity)
  const basic = formatBasicInfoPreview(activity)
  const adv = formatAdvancedOptionsPreview(activity)
  const limits = formatRuleLimitsSummary(activity)

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
        <PreviewSection
          id="preview-scope"
          title="适用范围"
          step={0}
          showEdit={showEditLinks}
          onEdit={onEditSection}
        >
          <PreviewItem label="参与渠道" value={activity.channels.map((c) => CHANNELS.find((x) => x.id === c)?.label).join('、') || '-'} />
          <PreviewItem label="订单类型" value={activity.orderTypes.map((c) => ORDER_TYPES.find((x) => x.id === c)?.label).join('、') || '-'} />
        </PreviewSection>

        <PreviewSection
          id="preview-basic"
          title="基础信息"
          step={0}
          showEdit={showEditLinks}
          onEdit={onEditSection}
        >
          <PreviewItem label="活动名称" value={activity.name || '-'} />
          <PreviewItem label="点单页展示标题" value={activity.title || '-'} />
          <PreviewItem label="商品卡片展示标签" value={activity.tag || '-'} />
          <PreviewItem label="活动时间" value={`${activity.startTime} 至 ${activity.endTime}`} />
          <PreviewItem label="活动周期" value={basic.cycle} />
          <PreviewItem label="活动时段" value={basic.timeSlot} />
          <PreviewItem label="活动说明" value={activity.description || '-'} />
        </PreviewSection>

        <PreviewSection
          id="preview-rules"
          title="赠送规则"
          step={0}
          showEdit={showEditLinks}
          onEdit={onEditSection}
        >
          <PreviewItem label="规则类型" value={activity.ruleType === 'buyA_getA' ? '买A送A' : '买A送B'} />
          {activity.ruleType === 'buyA_getA' && (
            <>
              <PreviewItem
                label="实物赠品展示标题"
                value={activity.buyAPhysicalDisplayTitle || '当单立享'}
              />
              {activity.buyAStorageGift.storageEnabled && (
                <PreviewItem
                  label="寄存券展示标题"
                  value={activity.buyAStorageGift.displayTitle || '我要寄存，下次用'}
                />
              )}
              <PreviewItem
                label="赠品组说明图片"
                value={activity.buyAGiftImage ? '已上传（小程序以图片展示组说明）' : '未配置（使用标题文案展示）'}
              />
              {activity.buyAStorageGift.storageEnabled && (
                <>
                  <PreviewItem label="赠品寄存" value="开启" />
                  <PreviewItem label="每单最多发放寄存券" value={`${activity.maxStorageCouponsPerOrder}张`} />
                  {activity.buyAStorageGift.couponTemplate && (
                    <PreviewItem
                      label="寄存券模版"
                      value={`${activity.buyAStorageGift.couponTemplate.name}（${activity.buyAStorageGift.couponTemplate.id}）`}
                    />
                  )}
                  <PreviewItem label="寄存券说明" value={activity.storageCouponDescription || '-'} />
                </>
              )}
            </>
          )}
          {activity.ruleType === 'buyA_getB' && (
            <PreviewItem label="赠品组" value={getGiftGroupsSummary(activity)} />
          )}
          {activity.ruleType === 'buyA_getB' && activity.giftGroups.some((g) => g.couponGift.storageEnabled) && (
            <>
              <PreviewItem label="每单最多发放寄存券" value={`${activity.maxStorageCouponsPerOrder}张`} />
              <PreviewItem label="寄存券说明" value={activity.storageCouponDescription || '-'} />
            </>
          )}
          <PreviewItem label="加料商品参与优惠" value={limits.toppings} />
          <PreviewItem label="做法加价参与优惠" value={limits.preparation} />
          <PreviewItem label="用户参与总次数" value={limits.totalLimit} />
          <PreviewItem label="用户参与频次" value={limits.frequency} />
          <PreviewItem label="每单优惠件数" value={limits.perOrder} />
          <PreviewItem label="优惠命中规则" value={limits.hitRule} />
          {activity.ruleType === 'buyA_getB' && activity.giftGroups.map((group, gi) => (
            <div key={group.id} className="preview-gift-group">
              <div className="preview-gift-group__title">赠品组{gi + 1}</div>
              {gi === 0 && (
                <PreviewItem
                  label="实物赠品展示标题"
                  value={group.physicalDisplayTitle || '当单立享'}
                />
              )}
              <PreviewItem
                label="赠品组说明图片"
                value={group.image
                  ? '已上传（小程序以图片展示组说明）'
                  : gi === 0 ? '未配置（使用标题文案展示）' : '未配置（使用系统默认文案）'}
              />
              {group.physicalProductIds.length > 0 && (
                <>
                  <PreviewItem label="实物赠品" value={`${group.physicalProductIds.length}个SKU`} />
                  <table className="table table--compact">
                    <thead>
                      <tr><th>商品名称</th><th>规格</th><th>销售价</th></tr>
                    </thead>
                    <tbody>
                      {products.filter((p) => group.physicalProductIds.includes(p.id)).map((p) => (
                        <tr key={p.id}><td>{p.name}</td><td>{p.spec}</td><td>¥{p.price}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
                    {group.couponGift.storageEnabled && (
                      <>
                        {gi === 0 && (
                          <PreviewItem
                            label="寄存券展示标题"
                            value={group.couponGift.displayTitle || '我要寄存，下次用'}
                          />
                        )}
                        <PreviewItem label="赠品寄存" value="开启" />
                        {gi === 1 && (
                          <PreviewItem
                            label="寄存券展示规则"
                            value={formatStorageDisplayRule(group.couponGift.storageDisplayRule)}
                          />
                        )}
                  {group.couponGift.couponTemplate && (
                    <PreviewItem
                      label="寄存券模版"
                      value={`${group.couponGift.couponTemplate.name}（${group.couponGift.couponTemplate.id}）`}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </PreviewSection>

        <PreviewSection
          id="preview-advanced"
          title="高级选项"
          step={0}
          showEdit={showEditLinks}
          onEdit={onEditSection}
        >
          <PreviewItem label="共享互斥关系" value={adv.shareLabel} />
          <PreviewItem label="参与用户" value={adv.userLabel} />
          <PreviewItem label="打标签" value={adv.tagLabel} />
          <PreviewItem label="活动编码" value={activity.activityCode || '-'} />
          <PreviewItem label="点单页展示标题可见" value={adv.display(activity.titleDisplay)} />
          <PreviewItem label="商品卡片展示标签可见" value={adv.display(activity.tagDisplay)} />
        </PreviewSection>

        <PreviewSection
          id="preview-stores"
          title="参与门店"
          step={1}
          showEdit={showEditLinks}
          onEdit={onEditSection}
        >
          <PreviewItem
            label="门店范围"
            value={
              activity.storeScope === 'all' ? '全部门店' :
              activity.storeScope === 'partial_include' ? `${selectedStores.length}个门店参与` :
              `${selectedStores.length}个门店不参与`
            }
          />
          {activity.storeScope !== 'all' && selectedStores.length > 0 && (
            <table className="table table--compact">
              <thead>
                <tr><th>门店名称</th><th>门店ID</th><th>门店编码</th></tr>
              </thead>
              <tbody>
                {selectedStores.map((s) => (
                  <tr key={s.id}><td>{s.name}</td><td>{s.id}</td><td>{s.code}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </PreviewSection>

        <PreviewSection
          id="preview-products"
          title="参与商品"
          step={2}
          showEdit={showEditLinks}
          onEdit={onEditSection}
        >
          <PreviewItem
            label="商品范围"
            value={activity.productScope === 'all' ? '全部商品' : `${selectedProducts.length}个商品`}
          />
          {activity.productScope === 'partial' && selectedProducts.length > 0 && (
            <table className="table table--compact">
              <thead>
                <tr><th>商品名称</th><th>规格</th><th>编码</th><th>销售价</th></tr>
              </thead>
              <tbody>
                {selectedProducts.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td>{p.spec}</td><td>{p.code}</td><td>¥{p.price}</td></tr>
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
  children: ReactNode
}) {
  return (
    <section id={id} className="preview-section">
      <div className="preview-section__head">
        <h3 className="preview-section__title">{title}</h3>
        {showEdit && onEdit && (
          <button type="button" className="link-btn preview-section__edit" onClick={() => onEdit(step)}>
            修改
          </button>
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
