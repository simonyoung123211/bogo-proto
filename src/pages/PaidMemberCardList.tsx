import { useState } from 'react'
import { PaidMemberBenefitModal } from '../components/PaidMemberBenefitModal'
import type {
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
  PaidMemberPriceBenefit,
} from '../types'
import { PAID_MEMBER_PRICE_STATUS_LABELS } from '../mockPaidMemberPriceData'
import {
  checkCardOnSale,
  findBenefitBoundActivities,
  formatBenefitQuota,
  getCardStatusLabel,
  hasActiveBoundActivity,
} from '../utils/paidMemberPriceActivity'

interface PaidMemberCardListProps {
  cards: PaidMemberCardTemplate[]
  activities: PaidMemberPriceActivityForm[]
  onToggleCardStatus: (cardId: string, next: 'on_sale' | 'off_shelf') => void
  onSaveBenefit: (cardId: string, benefit: PaidMemberPriceBenefit) => void
  onDeleteBenefit: (cardId: string, benefitId: string) => void
  onViewActivity: (activityId: string) => void
  /** 从权益直接建活动：预填卡与权益绑定，免去再选一次 */
  onCreateActivityFromBenefit: (cardId: string, benefitId: string) => void
  onGoToActivities: () => void
  onToast?: (message: string) => void
}

export function PaidMemberCardList({
  cards,
  activities,
  onToggleCardStatus,
  onSaveBenefit,
  onDeleteBenefit,
  onViewActivity,
  onCreateActivityFromBenefit,
  onGoToActivities,
  onToast,
}: PaidMemberCardListProps) {
  const [benefitModal, setBenefitModal] = useState<{
    card: PaidMemberCardTemplate
    benefit?: PaidMemberPriceBenefit
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ cardId: string; benefit: PaidMemberPriceBenefit } | null>(null)
  const [onSaleBlocked, setOnSaleBlocked] = useState<string | null>(null)

  const requestToggle = (card: PaidMemberCardTemplate) => {
    if (card.status === 'on_sale') {
      onToggleCardStatus(card.id, 'off_shelf')
      return
    }
    const check = checkCardOnSale(card, activities)
    if (!check.ok) {
      setOnSaleBlocked(check.reason)
      return
    }
    onToggleCardStatus(card.id, 'on_sale')
  }

  const requestDeleteBenefit = (card: PaidMemberCardTemplate, benefit: PaidMemberPriceBenefit) => {
    const bound = findBenefitBoundActivities(benefit.id, activities)
    if (bound.length > 0) {
      const first = bound[0]
      onToast?.(`该权益已被促销活动「${first.id} · ${first.name}」绑定，请先作废该活动后再删除`)
      return
    }
    setDeleteTarget({ cardId: card.id, benefit })
  }

  return (
    <div className="page-card page-card--list">
      <div className="list-info-banner">
        付费权益卡内的「付费会员价权益」只定义每人可优惠的次数与件数额度；具体参与门店、参与商品与优惠力度，
        需到营销管理的「付费会员价」活动中配置。
        <button type="button" className="link-btn" onClick={onGoToActivities}>前往配置活动</button>
      </div>

      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <div className="list-page-header__title-row">
            <h1 className="list-page-header__title">付费权益卡</h1>
          </div>
          <p className="list-page-header__desc">
            卡上架后，其关联的付费会员价活动会自动从「待发布」变为「进行中」；卡下架仅停止新售，已购卡用户在有效期内继续享受权益。
          </p>
        </div>
      </header>

      <div className="card-grid">
        {cards.map((card) => {
          const priceBenefits = card.benefits
          return (
            <section key={card.id} className="benefit-card">
              <header className="benefit-card__header">
                <div className="benefit-card__title-row">
                  <h2 className="benefit-card__name">{card.name}</h2>
                  <span className={`status-badge status-badge--dot card-status--${card.status}`}>
                    {getCardStatusLabel(card.status)}
                  </span>
                </div>
                <div className="benefit-card__meta">
                  <span>卡模版 ID：{card.id}</span>
                  <span>有效期内持卡人：{card.holderCount.toLocaleString()} 人</span>
                  <span>规格：{card.specs.map((s) => s.label).join(' / ')}</span>
                </div>
              </header>

              <div className="benefit-card__actions">
                <button
                  type="button"
                  className={`btn btn--sm ${card.status === 'on_sale' ? 'btn--default' : 'btn--primary'}`}
                  onClick={() => requestToggle(card)}
                >
                  {card.status === 'on_sale' ? '下架卡' : '上架卡'}
                </button>
                <button
                  type="button"
                  className="btn btn--default btn--sm"
                  onClick={() => setBenefitModal({ card })}
                >
                  新增付费会员价权益
                </button>
              </div>

              {priceBenefits.length === 0 ? (
                <div className="benefit-empty">
                  该卡尚未配置付费会员价权益，点击「新增付费会员价权益」开始配置。
                </div>
              ) : (
                <div className="table-wrap table-wrap--inline">
                  <table className="table table--compact table--benefit">
                    <thead>
                      <tr>
                        <th>权益名称</th>
                        <th>权益 ID</th>
                        <th>权益额度</th>
                        <th>体验卡</th>
                        <th>绑定的活动</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceBenefits.map((benefit) => {
                        const quota = formatBenefitQuota(benefit, card)
                        const bound = findBenefitBoundActivities(benefit.id, activities)
                        const active = hasActiveBoundActivity(benefit.id, activities)
                        return (
                          <tr key={benefit.id}>
                            <td>
                              <div className="benefit-name-cell">
                                {benefit.icon
                                  ? <img className="benefit-name-cell__icon" src={benefit.icon} alt="" />
                                  : <span className="benefit-name-cell__icon benefit-name-cell__icon--placeholder">价</span>}
                                <div>
                                  <div className="benefit-name-cell__name">{benefit.name}</div>
                                  {benefit.description && (
                                    <div className="benefit-name-cell__desc" title={benefit.description}>
                                      {benefit.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-mono">{benefit.id}</td>
                            <td>
                              <div className="quota-list">
                                {quota.map((q) => (
                                  <div key={q.specLabel} className="quota-list__row">
                                    <span className="quota-list__spec">{q.specLabel}</span>
                                    <span>{q.count}</span>
                                    <span className="quota-list__sep">/</span>
                                    <span>{q.items}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td>{benefit.experienceCardEnabled ? '享受' : '不享受'}</td>
                            <td>
                              {bound.length === 0 ? (
                                <span className="text-warning">该权益下无进行中活动</span>
                              ) : (
                                <div className="bound-activity-list">
                                  {bound.map((a) => (
                                    <button
                                      key={a.id}
                                      type="button"
                                      className="snapshot-link"
                                      onClick={() => onViewActivity(a.id)}
                                    >
                                      {a.name}
                                      <span className={`status-badge status-badge--xs status-badge--${a.status}`}>
                                        {PAID_MEMBER_PRICE_STATUS_LABELS[a.status]}
                                      </span>
                                    </button>
                                  ))}
                                  {!active && <span className="text-warning">无进行中活动</span>}
                                </div>
                              )}
                            </td>
                            <td className="table-actions">
                              <button
                                type="button"
                                className="table-actions__view"
                                title={`为「${benefit.name}」创建付费会员价活动，无需再选权益`}
                                onClick={() => onCreateActivityFromBenefit(card.id, benefit.id)}
                              >
                                {bound.length > 0 ? '再建活动' : '创建活动'}
                              </button>
                              <button
                                type="button"
                                className="link-btn"
                                onClick={() => setBenefitModal({ card, benefit })}
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                className="link-btn link-btn--danger"
                                onClick={() => requestDeleteBenefit(card, benefit)}
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {benefitModal && (
        <PaidMemberBenefitModal
          card={benefitModal.card}
          benefit={benefitModal.benefit}
          onClose={() => setBenefitModal(null)}
          onSave={(benefit) => {
            onSaveBenefit(benefitModal.card.id, benefit)
            setBenefitModal(null)
          }}
          onToast={onToast}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>确认删除权益</h3></div>
            <div className="modal__body">
              删除后「{deleteTarget.benefit.name}」将从该卡中移除，确定要删除吗？
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setDeleteTarget(null)}>取消</button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  onDeleteBenefit(deleteTarget.cardId, deleteTarget.benefit.id)
                  setDeleteTarget(null)
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {onSaleBlocked && (
        <div className="modal-overlay" onClick={() => setOnSaleBlocked(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>无法上架</h3></div>
            <div className="modal__body">{onSaleBlocked}</div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setOnSaleBlocked(null)}>我知道了</button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => { setOnSaleBlocked(null); onGoToActivities() }}
              >
                去处理活动
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
