import { useMemo, useRef, useState } from 'react'
import type {
  LimitType,
  PaidMemberBenefitSpecLimit,
  PaidMemberCardTemplate,
  PaidMemberPriceBenefit,
} from '../types'
import { PAID_BENEFIT_DESC_MAX, PAID_BENEFIT_NAME_MAX } from '../mockPaidMemberPriceData'

interface PaidMemberBenefitModalProps {
  card: PaidMemberCardTemplate
  /** 传入表示编辑已有权益，不传为新增 */
  benefit?: PaidMemberPriceBenefit
  onClose: () => void
  onSave: (benefit: PaidMemberPriceBenefit) => void
  onToast?: (message: string) => void
}

function createDraft(card: PaidMemberCardTemplate): PaidMemberPriceBenefit {
  return {
    id: '',
    name: '',
    description: '',
    icon: '',
    totalCountLimitType: 'limited',
    totalItemsLimitType: 'limited',
    specLimits: card.specs.map((s) => ({ specId: s.id, count: 1, items: 1 })),
    experienceCardEnabled: false,
    createdAt: '',
  }
}

export function PaidMemberBenefitModal({
  card,
  benefit,
  onClose,
  onSave,
  onToast,
}: PaidMemberBenefitModalProps) {
  const [draft, setDraft] = useState<PaidMemberPriceBenefit>(() => {
    if (!benefit) return createDraft(card)
    // 补齐卡新增规格对应的额度行
    const limits = card.specs.map((s) => {
      const found = benefit.specLimits.find((l) => l.specId === s.id)
      return found ?? { specId: s.id, count: 1, items: 1 }
    })
    return { ...benefit, specLimits: limits }
  })
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isEdit = Boolean(benefit)
  const showSpecTable =
    draft.totalCountLimitType === 'limited' || draft.totalItemsLimitType === 'limited'

  const update = <K extends keyof PaidMemberPriceBenefit>(
    key: K,
    value: PaidMemberPriceBenefit[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const updateSpecLimit = (specId: string, field: keyof Omit<PaidMemberBenefitSpecLimit, 'specId'>, value: number) => {
    setDraft((d) => ({
      ...d,
      specLimits: d.specLimits.map((l) => (l.specId === specId ? { ...l, [field]: value } : l)),
    }))
  }

  const experienceSpecs = useMemo(() => card.specs.filter((s) => s.isExperience), [card.specs])

  const pickIcon = (file: File | undefined) => {
    if (!file) return
    if (file.size > 500 * 1024) {
      onToast?.('图标大小需控制在 500KB 以内')
      return
    }
    const reader = new FileReader()
    reader.onload = () => update('icon', String(reader.result))
    reader.readAsDataURL(file)
  }

  const validate = (): string | null => {
    if (!draft.name.trim()) return '请填写权益名称'
    if (draft.name.length > PAID_BENEFIT_NAME_MAX) return `权益名称不超过${PAID_BENEFIT_NAME_MAX}字`
    if (draft.description.length > PAID_BENEFIT_DESC_MAX) return `权益描述不超过${PAID_BENEFIT_DESC_MAX}字`
    if (draft.totalCountLimitType === 'limited') {
      const bad = draft.specLimits.find((l) => !Number.isFinite(l.count) || l.count < 1)
      if (bad) {
        const spec = card.specs.find((s) => s.id === bad.specId)
        return `「${spec?.label ?? bad.specId}」的优惠权益次数须大于 0`
      }
    }
    if (draft.totalItemsLimitType === 'limited') {
      const bad = draft.specLimits.find((l) => !Number.isFinite(l.items) || l.items < 1)
      if (bad) {
        const spec = card.specs.find((s) => s.id === bad.specId)
        return `「${spec?.label ?? bad.specId}」的优惠商品件数须大于 0`
      }
    }
    return null
  }

  const submit = () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    onSave(draft)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--benefit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{isEdit ? '编辑付费会员价权益' : '新增付费会员价权益'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="modal__body modal__body--scroll">
          {error && <div className="form-error" role="alert">{error}</div>}

          <div className="form-section">
            <div className="form-section__title">基本信息</div>
            <div className="form-section__body">
              <FormRow label="权益名称" required>
                <div className="char-input-wrap">
                  <input
                    className="input input--count"
                    value={draft.name}
                    maxLength={PAID_BENEFIT_NAME_MAX}
                    placeholder="请输入权益名称"
                    onChange={(e) => update('name', e.target.value.slice(0, PAID_BENEFIT_NAME_MAX))}
                  />
                  <span className="char-count">{draft.name.length}/{PAID_BENEFIT_NAME_MAX}</span>
                </div>
              </FormRow>
              <FormRow label="权益描述">
                <div className="char-textarea-wrap">
                  <textarea
                    className="textarea textarea--count"
                    rows={3}
                    value={draft.description}
                    placeholder="请输入权益描述，可以让用户对权益更加清晰"
                    onChange={(e) => update('description', e.target.value.slice(0, PAID_BENEFIT_DESC_MAX))}
                  />
                  <span className="char-count">{draft.description.length}/{PAID_BENEFIT_DESC_MAX}</span>
                </div>
              </FormRow>
              <FormRow label="权益图标">
                <div>
                  <button
                    type="button"
                    className={`icon-upload ${draft.icon ? 'has-image' : ''}`}
                    onClick={() => fileRef.current?.click()}
                  >
                    {draft.icon ? <img src={draft.icon} alt="权益图标" /> : <span>+</span>}
                  </button>
                  {draft.icon && (
                    <button type="button" className="link-btn link-btn--danger" onClick={() => update('icon', '')}>
                      移除
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    hidden
                    onChange={(e) => pickIcon(e.target.files?.[0])}
                  />
                  <p className="field-hint">支持 jpg、png、gif，建议设计图片尺寸为 80px*80px，大小控制在 500KB 以内</p>
                </div>
              </FormRow>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section__title">设置权益</div>
            <div className="form-section__body">
              <div className="benefit-intro">
                <p className="benefit-intro__title">付费会员价权益</p>
                <p className="benefit-intro__text">
                  付费会员价权益只定义「每人可优惠多少次、多少件」的额度，具体哪些门店、哪些商品、优惠多少，
                  需在营销管理的「付费会员价」活动中配置。额度按卡有效期与卡规格结算，跨该权益下的所有活动累计。
                </p>
              </div>

              {isEdit && (
                <div className="alert-banner alert-banner--warning">
                  <span className="alert-banner__icon">!</span>
                  <span>
                    修改额度仅对修改后新开通 / 新续费的卡生效，已开通的卡按开通时的额度执行，避免对已付费顾客追溯性减配。
                  </span>
                </div>
              )}

              <FormRow label="付费会员有效期内，每人优惠总次数" required>
                <LimitRadio
                  value={draft.totalCountLimitType}
                  onChange={(v) => update('totalCountLimitType', v)}
                />
              </FormRow>
              <FormRow label="付费会员有效期内，每人优惠总件数" required>
                <LimitRadio
                  value={draft.totalItemsLimitType}
                  onChange={(v) => update('totalItemsLimitType', v)}
                />
              </FormRow>

              {showSpecTable && (
                <FormRow label="设置权益内容" required>
                  <div className="table-wrap table-wrap--inline">
                    <table className="table table--compact">
                      <thead>
                        <tr>
                          <th>规格</th>
                          <th>设置优惠权益次数（次）</th>
                          <th>设置优惠商品件数（件）</th>
                        </tr>
                      </thead>
                      <tbody>
                        {card.specs.map((spec) => {
                          const limit = draft.specLimits.find((l) => l.specId === spec.id)
                          return (
                            <tr key={spec.id}>
                              <td>
                                {spec.label}
                                {spec.isExperience && <span className="tag tag--muted">体验卡</span>}
                              </td>
                              <td>
                                {draft.totalCountLimitType === 'limited' ? (
                                  <input
                                    type="number"
                                    className="input input--num"
                                    min={1}
                                    value={limit?.count ?? 1}
                                    onChange={(e) => updateSpecLimit(spec.id, 'count', Number(e.target.value))}
                                  />
                                ) : (
                                  <span className="text-secondary">不限</span>
                                )}
                              </td>
                              <td>
                                {draft.totalItemsLimitType === 'limited' ? (
                                  <input
                                    type="number"
                                    className="input input--num"
                                    min={1}
                                    value={limit?.items ?? 1}
                                    onChange={(e) => updateSpecLimit(spec.id, 'items', Number(e.target.value))}
                                  />
                                ) : (
                                  <span className="text-secondary">不限</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </FormRow>
              )}

              <FormRow label="体验卡是否享受付费会员价权益" required>
                <div>
                  <div className="radio-group">
                    <label className="radio">
                      <input
                        type="radio"
                        checked={draft.experienceCardEnabled}
                        onChange={() => update('experienceCardEnabled', true)}
                      />
                      是
                    </label>
                    <label className="radio">
                      <input
                        type="radio"
                        checked={!draft.experienceCardEnabled}
                        onChange={() => update('experienceCardEnabled', false)}
                      />
                      否
                    </label>
                  </div>
                  <p className="field-hint">
                    {experienceSpecs.length > 0
                      ? `本卡含体验规格「${experienceSpecs.map((s) => s.label).join('、')}」，选「否」时体验卡用户不享受本权益。`
                      : '若该卡后续设置了体验卡规格，此处的选择将决定体验卡用户是否享受本权益。'}
                  </p>
                </div>
              </FormRow>
            </div>
          </div>
        </div>

        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button type="button" className="btn btn--primary" onClick={submit}>保存</button>
        </div>
      </div>
    </div>
  )
}

function LimitRadio({ value, onChange }: { value: LimitType; onChange: (v: LimitType) => void }) {
  return (
    <div className="radio-group">
      <label className="radio">
        <input type="radio" checked={value === 'unlimited'} onChange={() => onChange('unlimited')} />
        不限
      </label>
      <label className="radio">
        <input type="radio" checked={value === 'limited'} onChange={() => onChange('limited')} />
        限制
      </label>
    </div>
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
