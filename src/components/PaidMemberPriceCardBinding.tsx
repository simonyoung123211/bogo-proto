import type { PaidMemberCardTemplate, PaidMemberPriceActivityForm } from '../types'
import { PAID_MEMBER_CARD_STATUS_LABELS } from '../mockPaidMemberPriceData'
import { findBenefit, findCard, formatBenefitQuota } from '../utils/paidMemberPriceActivity'

interface PaidMemberPriceCardBindingProps {
  activity: PaidMemberPriceActivityForm
  cards: PaidMemberCardTemplate[]
  /** 绑定关系创建后不可更换 */
  locked: boolean
  readOnly?: boolean
  onChange: (activity: PaidMemberPriceActivityForm) => void
  onGoToCards: () => void
}

export function PaidMemberPriceCardBinding({
  activity,
  cards,
  locked,
  readOnly,
  onChange,
  onGoToCards,
}: PaidMemberPriceCardBindingProps) {
  const disabled = readOnly || locked
  const card = findCard(cards, activity.cardTemplateId)
  const benefit = findBenefit(cards, activity.cardTemplateId, activity.benefitId)
  const availableBenefits = card?.benefits ?? []

  const selectCard = (cardTemplateId: string) => {
    // 换卡时清空已选权益，避免残留跨卡的权益 ID
    onChange({ ...activity, cardTemplateId, benefitId: '' })
  }

  return (
    <>
      {locked && !readOnly && (
        <div className="alert-banner alert-banner--info">
          <span className="alert-banner__icon">i</span>
          <span>关联的付费会员卡与权益在活动创建后不可更换。如需更换，请作废本活动后重新创建。</span>
        </div>
      )}

      <FormRow label="付费会员卡" required>
        <div>
          <select
            className="input input--wide"
            disabled={disabled}
            value={activity.cardTemplateId}
            onChange={(e) => selectCard(e.target.value)}
          >
            <option value="">请选择付费会员卡</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}（{PAID_MEMBER_CARD_STATUS_LABELS[c.status]}）
              </option>
            ))}
          </select>
          {card && (
            <p className="field-hint">
              卡模版 ID：{card.id} · 规格：{card.specs.map((s) => s.label).join(' / ')} ·
              有效期内持卡人 {card.holderCount.toLocaleString()} 人
              {card.status !== 'on_sale' && '（该卡当前未在售，活动保存后为「待发布」，卡上架后自动生效）'}
            </p>
          )}
        </div>
      </FormRow>

      <FormRow label="付费会员价权益" required>
        <div>
          {!activity.cardTemplateId ? (
            <p className="field-hint">请先选择付费会员卡</p>
          ) : availableBenefits.length === 0 ? (
            <div className="inline-empty">
              该权益卡未配置付费会员价权益，请先到会员管理中添加。
              <button type="button" className="link-btn" onClick={onGoToCards}>去添加权益</button>
            </div>
          ) : (
            <>
              <select
                className="input input--wide"
                disabled={disabled}
                value={activity.benefitId}
                onChange={(e) => onChange({ ...activity, benefitId: e.target.value })}
              >
                <option value="">请选择权益</option>
                {availableBenefits.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {benefit && <p className="field-hint">权益 ID：{benefit.id}</p>}
            </>
          )}
        </div>
      </FormRow>

      {benefit && card && (
        <FormRow label="权益额度">
          <div className="quota-panel">
            <p className="quota-panel__desc">
              以下额度在付费权益卡中配置，按卡有效期与卡规格结算，并跨该权益下的所有活动累计。
              本活动只配置参与门店、参与商品与优惠力度。
            </p>
            <div className="table-wrap table-wrap--inline">
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
            </div>
            <p className="quota-panel__foot">
              体验卡：{benefit.experienceCardEnabled ? '享受本权益' : '不享受本权益'}
              {benefit.description && ` · 权益描述：${benefit.description}`}
            </p>
          </div>
        </FormRow>
      )}
    </>
  )
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{required && <span className="required">*</span>}{label}</label>
      <div className="form-control">{children}</div>
    </div>
  )
}
