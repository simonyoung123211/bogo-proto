import type { ReactNode } from 'react'

/** 促销编辑器区块卡（对齐会员价 promo-card） */
export function PromoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="promo-card">
      <div className="promo-card__head">{title}</div>
      <div className="promo-card__body">{children}</div>
    </div>
  )
}

export function PromoFormRow({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="form-row">
      <label className="form-label">
        {required && <span className="required">*</span>}
        {label}
      </label>
      <div className="form-control">{children}</div>
    </div>
  )
}

export interface PromoChoiceOption {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  title?: string
}

/** 渠道：corner 卡片多选 */
export function ChannelCornerChoices({
  options,
  selectedIds,
  disabled,
  onToggle,
}: {
  options: PromoChoiceOption[]
  selectedIds: string[]
  disabled?: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="choices">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled || opt.disabled}
          title={opt.title}
          className={`choice channel corner ${selectedIds.includes(opt.id) ? 'selected' : ''}`}
          onClick={() => onToggle(opt.id)}
        >
          {opt.icon != null && <span className="channel-icon">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** 业务场景：tick 卡片多选 */
export function SceneTickChoices({
  options,
  selectedIds,
  disabled,
  onToggle,
}: {
  options: PromoChoiceOption[]
  selectedIds: string[]
  disabled?: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="choices">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled || opt.disabled}
          title={opt.title}
          className={`choice tick ${selectedIds.includes(opt.id) ? 'selected' : ''}`}
          onClick={() => onToggle(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** 紧凑步骤条（对齐会员价 step-shell） */
export function WizardStepCards({
  steps,
  step,
  previewStep,
  pendingCounts,
  onGoToStep,
}: {
  steps: string[]
  step: number
  previewStep: number
  /** 各配置步待填数；长度通常为 previewStep，末步忽略 */
  pendingCounts?: number[]
  onGoToStep: (index: number) => void
}) {
  return (
    <div className="step-shell">
      <div className="step-full">
        {steps.map((label, i) => {
          const pending = pendingCounts?.[i] ?? 0
          const done = i < step
          const active = i === step
          const available = i <= step
          return (
            <button
              key={label}
              type="button"
              className={`step-card ${done ? 'done' : ''} ${active ? 'active' : ''} ${available ? 'available' : ''}`}
              onClick={() => onGoToStep(i)}
              disabled={!available}
            >
              <div className="step-circle">{done ? '✓' : i + 1}</div>
              <div className="step-words">
                <b>{label}</b>
                <small className={pending > 0 && i !== previewStep ? 'pending' : ''}>
                  {i === previewStep
                    ? '复核并保存'
                    : pending > 0
                      ? `待填 ${pending} 项`
                      : done || active
                        ? '已完成'
                        : '未开始'}
                </small>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 页脚操作区布局；可选配置体检摘要 */
export function WizardFooterBar({
  isView,
  health,
  actions,
}: {
  isView?: boolean
  health?: ReactNode
  actions: ReactNode
}) {
  return (
    <div className="wizard-footer">
      {isView ? (
        <div className="wizard-footer__actions">{actions}</div>
      ) : (
        <>
          {health != null && (
            <div className="wizard-footer__health" aria-live="polite">
              {health}
            </div>
          )}
          <div className="wizard-footer__actions">{actions}</div>
        </>
      )}
    </div>
  )
}

/** 将各步 validateStep 结果汇总为待填数（有错记 1，便于角标） */
export function countStepPendings(
  stepCount: number,
  validate: (step: number) => string | null,
): number[] {
  return Array.from({ length: stepCount }, (_, i) => (validate(i) ? 1 : 0))
}
