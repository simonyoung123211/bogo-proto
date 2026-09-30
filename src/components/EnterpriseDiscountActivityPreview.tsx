import { CHANNELS, ORDER_TYPES } from '../mockData'
import type { EnterpriseDiscountActivityForm } from '../types'
import { formatParticipationLimits, getEnterprise } from '../utils/enterpriseDiscountActivity'

interface EnterpriseDiscountActivityPreviewProps {
  activity: EnterpriseDiscountActivityForm
  showEditLinks?: boolean
  onEditSection?: (step: number) => void
}

export function EnterpriseDiscountActivityPreview({
  activity,
  showEditLinks,
  onEditSection,
}: EnterpriseDiscountActivityPreviewProps) {
  const channelText = activity.channels
    .map((id) => CHANNELS.find((item) => item.id === id)?.label ?? id)
    .join('、') || '-'
  const sceneText = activity.orderTypes
    .map((id) => ORDER_TYPES.find((item) => item.id === id)?.label ?? id)
    .join('、') || '-'
  const limits = formatParticipationLimits(activity)

  return (
    <div className="preview-sections">
      <PreviewSection title="基础信息与规则" onEdit={showEditLinks ? () => onEditSection?.(0) : undefined}>
        <PreviewItem label="活动名称" value={activity.name || '-'} />
        <PreviewItem label="活动描述" value={activity.description || '-'} />
        <PreviewItem label="活动时间" value={`${activity.startTime} 至 ${activity.endTime}`} />
        <PreviewItem label="活动周期" value={activity.cycleType === 'daily' ? '每天' : activity.cycleType === 'weekly' ? '每周' : '每月'} />
        <PreviewItem label="活动时段" value={activity.timeSlotType === 'all_day' ? '全天' : '指定时间段'} />
        <PreviewItem label="参与渠道" value={channelText} />
        <PreviewItem label="业务场景" value={sceneText} />
        <PreviewItem label="活动期间优惠单数" value={limits.totalOrders} />
        <PreviewItem label="优惠单数频次" value={limits.frequency} />
        <PreviewItem label="活动期间优惠件数" value={limits.itemsTotal} />
        <PreviewItem label="优惠件数频次" value={limits.itemsPeriod} />
        <PreviewItem label="每单优惠件数" value={limits.itemsPerOrder} />
        <PreviewItem label="优惠商品命中规则" value={limits.hitRule} />
        <PreviewItem
          label="企业折扣"
          value={activity.enterprises.length === 0
            ? '未选择'
            : activity.enterprises.map((item) => {
              const name = getEnterprise(item.enterpriseId)?.name ?? item.enterpriseId
              return `${name} ${item.discount}折（${item.displayTag || '无标签'}）`
            }).join('；')}
        />
      </PreviewSection>
      <PreviewSection title="参与门店" onEdit={showEditLinks ? () => onEditSection?.(1) : undefined}>
        <PreviewItem
          label="门店范围"
          value={activity.storeScope === 'all'
            ? '全部门店'
            : activity.storeScope === 'partial_exclude'
              ? `指定 ${activity.storeIds.length} 家不参与`
              : `指定 ${activity.storeIds.length} 家参与`}
        />
      </PreviewSection>
      <PreviewSection title="参与商品" onEdit={showEditLinks ? () => onEditSection?.(2) : undefined}>
        <PreviewItem
          label="商品范围"
          value={activity.productScope === 'all'
            ? '全部商品'
            : `${activity.productSelectionMode === 'exclude' ? '不参与' : '指定'} ${activity.productIds.length} 个商品`}
        />
      </PreviewSection>
    </div>
  )
}

function PreviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="preview-section">
      <div className="preview-section__head">
        <h3 className="preview-section__title">{title}</h3>
        {onEdit && <button type="button" className="link-btn" onClick={onEdit}>修改</button>}
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
