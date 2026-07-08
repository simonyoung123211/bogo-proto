import { useState } from 'react'
import { GIFT_TAG_LABELS, ORDER_STATUS_LABELS, orders } from '../orderData'
import type { GiftType, IssuedCoupon, OrderDiscount, OrderItem } from '../types'
import { calcPhysicalGiftDiscountAmount, formatMoney } from '../utils/order'

interface OrderDetailProps {
  orderId: string
  backLabel?: string
  onBack: () => void
  onViewActivity: (activityId: string) => void
}

export function OrderDetail({ orderId, backLabel = '← 返回订单列表', onBack, onViewActivity }: OrderDetailProps) {
  const order = orders.find((o) => o.id === orderId)
  const [couponModal, setCouponModal] = useState<IssuedCoupon[] | null>(null)

  if (!order) {
    return (
      <div className="page-card">
        <div className="table-empty">未找到订单</div>
        <button type="button" className="btn btn--default" onClick={onBack}>返回</button>
      </div>
    )
  }

  const steps = [...order.timeline].reverse()
  const refunds = order.refunds ?? []
  const physicalGiftDiscount = calcPhysicalGiftDiscountAmount(order.items)

  return (
    <div className="order-detail">
      <div className="order-detail__topbar">
        <button type="button" className="link-btn" onClick={onBack}>{backLabel}</button>
        <span className="order-detail__no mono">订单编号：{order.id}</span>
      </div>

      <section className="order-hero">
        <div className="order-hero__head">
          <div className="order-hero__status-group">
            <span className={`order-hero__status order-status-text--${order.status}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            {order.hasBogo && <span className="order-tag order-tag--bogo">买一送一</span>}
            {order.hasMultiItem && <span className="order-tag order-tag--multi-item">第N件优惠</span>}
          </div>
          <div className="order-hero__meta">
            <span><i>取餐号</i>{order.pickupNo}</span>
            <span><i>取餐方式</i>{order.pickupMethod}</span>
            <span><i>下单人</i>{order.buyerName}</span>
            <span><i>售后</i>{order.afterSale}</span>
          </div>
        </div>
        <ol className="order-steps">
          {steps.map((node, i) => {
            const isLast = i === steps.length - 1
            return (
              <li
                key={`${node.label}-${i}`}
                className={`order-steps__item ${node.done ? 'is-done' : ''} ${isLast ? 'is-current' : ''}`}
              >
                <div className="order-steps__marker">
                  <span className="order-steps__dot" aria-hidden />
                  {i < steps.length - 1 && <span className="order-steps__line" aria-hidden />}
                </div>
                <div className="order-steps__content">
                  <div className="order-steps__label">{node.label}</div>
                  <div className="order-steps__time">{node.time}</div>
                  {node.operator && <div className="order-steps__op">操作人：{node.operator}</div>}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="order-card">
        <h3 className="order-card__title">门店 &amp; 顾客</h3>
        <div className="order-two-col">
          <div className="order-two-col__block">
            <div className="order-two-col__subtitle">门店信息</div>
            <div className="order-info-grid order-info-grid--2">
              <InfoItem label="所属门店" value={order.storeName} />
              <InfoItem label="门店编码" value={order.storeCode ?? '-'} mono />
              <InfoItem label="取餐方式" value={order.pickupMethod} />
              <InfoItem label="营业日" value={order.businessDay} />
            </div>
          </div>
          <div className="order-two-col__block">
            <div className="order-two-col__subtitle">下单人</div>
            <div className="order-info-grid order-info-grid--2">
              <InfoItem label="下单人" value={order.buyerName} />
              <InfoItem label="手机号" value={order.buyerPhone} mono />
              <InfoItem label="渠道" value={order.channel} />
              <InfoItem label="用餐人数" value={`${order.diners}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="order-card">
        <h3 className="order-card__title">订单信息</h3>
        <div className="order-info-block">
          <div className="order-info-grid">
            <InfoItem label="订单来源" value={order.source} />
            <InfoItem label="订单类型" value={order.orderType} />
            <InfoItem label="下单时间" value={order.createdAt} />
            <InfoItem label="取餐号" value={order.pickupNo} />
            <InfoItem label="制作号" value={order.makeNo} />
            <InfoItem label="渠道订单号" value={order.channelOrderNo} mono />
            <InfoItem label="备注" value={order.remark} />
          </div>
          <aside className="order-pay-summary">
            <div className="order-pay-summary__title">支付明细</div>
            <div className="order-pay-summary__row">
              <span>应付金额</span>
              <span>¥{formatMoney(order.payable)}</span>
            </div>
            <div className="order-pay-summary__row">
              <span>优惠金额</span>
              <span className="order-pay-summary__discount">-¥{formatMoney(order.discountAmount)}</span>
            </div>
            <div className="order-pay-summary__row order-pay-summary__row--total">
              <span>实付金额</span>
              <span>¥{formatMoney(order.paid)}</span>
            </div>
            <div className="order-pay-summary__row order-pay-summary__row--sub">
              <span>发票</span>
              <span>{order.invoiceStatus ?? '未开票'}</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="order-card">
        <h3 className="order-card__title">商品明细</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>商品</th>
                <th>商品原价(元)</th>
                <th>数量</th>
                <th>优惠(元)</th>
                <th>预计收入(元)</th>
                <th>售后</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const itemDiscount = item.originalPrice * item.quantity - item.paid
                return (
                  <tr key={item.id}>
                    <td>
                      <ProductCell item={item} />
                    </td>
                    <td>{formatMoney(item.originalPrice)}</td>
                    <td>{item.quantity}</td>
                    <td className={itemDiscount > 0 ? 'order-discount-cell' : ''}>
                      {itemDiscount > 0 ? `-${formatMoney(itemDiscount)}` : '-'}
                    </td>
                    <td className="order-income-cell">{formatMoney(item.paid)}</td>
                    <td>{item.afterSale}</td>
                    <td>{item.statusLabel}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {order.discounts.length > 0 && (
        <section className="order-card">
          <h3 className="order-card__title">优惠信息</h3>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>活动ID/券码 ID（优惠源）</th>
                  <th>优惠类型</th>
                  <th>优惠名称</th>
                  <th>优惠详情</th>
                </tr>
              </thead>
              <tbody>
                {order.discounts.map((d, i) => (
                  <tr key={`${d.refId}-${i}`}>
                    <td className="mono">
                      {d.activityId ? (
                        <button type="button" className="link-btn" onClick={() => onViewActivity(d.activityId!)}>
                          {d.refId}
                        </button>
                      ) : (
                        d.refId
                      )}
                    </td>
                    <td>{d.type}</td>
                    <td>{d.name}</td>
                    <td>
                      <div className="order-discount-detail">
                        <span className="order-discount-amount">
                          优惠金额：{formatMoney(getDiscountRowAmount(d, physicalGiftDiscount))}
                        </span>
                        {d.coupons && d.coupons.length > 0 && (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setCouponModal(d.coupons!)}
                          >
                            查看寄存券明细（{d.coupons.length}）
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="order-card">
        <h3 className="order-card__title">退款信息</h3>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>退款单号</th>
                <th>退款类型</th>
                <th>退款金额(元)</th>
                <th>申请时间</th>
                <th>退款原因</th>
                <th>审核人</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">暂无数据</td></tr>
              ) : (
                refunds.map((r) => (
                  <tr key={r.refundNo}>
                    <td className="mono">{r.refundNo}</td>
                    <td>{r.type}</td>
                    <td className="order-discount-cell">{formatMoney(r.amount)}</td>
                    <td className="table-time">{r.appliedAt}</td>
                    <td>{r.reason}</td>
                    <td>{r.auditor}</td>
                    <td><span className="coupon-status">{r.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {couponModal && (
        <div className="modal-overlay" onClick={() => setCouponModal(null)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>寄存券明细</h3>
              <button type="button" className="modal__close" onClick={() => setCouponModal(null)}>×</button>
            </div>
            <div className="modal__body">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>券名称</th>
                    <th>券码</th>
                    <th>券模版ID</th>
                    <th>有效期</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {couponModal.map((c) => (
                    <tr key={c.code}>
                      <td>{c.name}</td>
                      <td className="mono">{c.code}</td>
                      <td className="mono">{c.templateId}</td>
                      <td>{c.validity}</td>
                      <td><span className="coupon-status">{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setCouponModal(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCell({ item }: { item: OrderItem }) {
  return (
    <div className="order-product">
      <div className="order-product__img" aria-hidden>
        {item.image ? <img src={item.image} alt="" /> : <span className="order-product__placeholder">QM</span>}
      </div>
      <div className="order-product__meta">
        <div className="order-product__name">
          {item.name}
          {item.isGift && item.giftType && <GiftTag type={item.giftType} />}
          {!item.isGift && item.promotionLabel && <MultiItemTag label={item.promotionLabel} />}
        </div>
        {item.spec && <div className="order-product__spec">{item.spec}</div>}
      </div>
    </div>
  )
}

function GiftTag({ type }: { type: GiftType }) {
  return (
    <span className={`gift-tag gift-tag--${type === 'physical' ? 'physical' : 'coupon'}`}>
      {GIFT_TAG_LABELS[type]}
    </span>
  )
}

function MultiItemTag({ label }: { label: string }) {
  return <span className="gift-tag gift-tag--multi-item">{label}</span>
}

function getDiscountRowAmount(d: OrderDiscount, physicalGiftDiscount: number): number {
  if (d.kind === 'multi_item') return d.discountAmount ?? 0
  if (d.discountAmount != null) return d.discountAmount
  return d.giftTypes.includes('physical') ? physicalGiftDiscount : 0
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="order-info-item">
      <span className="order-info-item__label">{label}</span>
      <span className={`order-info-item__value ${mono ? 'mono' : ''}`}>{value || '-'}</span>
    </div>
  )
}
