import { useEffect, useId, useRef, type ReactNode } from 'react'
import { sceneLabel } from '../utils/limitDiscountActivity'

export function LimitDiscountRuleDialog({ title, description, children, footer, onClose, onApply }: {
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
  onApply?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog className="modal ld-rule-dialog" ref={ref} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="ld-rule-dialog__form" noValidate onSubmit={(event) => { event.preventDefault(); onApply?.() }}>
        <header className="modal__header">
          <div>
            <h3 id={titleId}>{title}</h3>
            {description && <p className="modal__subtitle">{description}</p>}
          </div>
          <button type="button" className="modal__close" aria-label={`关闭${title}`} onClick={onClose}>×</button>
        </header>
        <div className="modal__body">{children}</div>
        <footer className="modal__footer">{footer}</footer>
      </form>
    </dialog>
  )
}

export function LimitDiscountRuleSummary({ label, values, empty, attention, businessLabel, business, expandBusiness }: {
  label: string
  values: string[]
  empty: string
  attention?: boolean
  businessLabel: string
  business: { scene: string; value: string; invalid?: boolean }[]
  expandBusiness?: boolean
}) {
  return (
    <div className="ld-rule-summary">
      <div className="ld-rule-summary__values">
        {values.length > 0 ? (
          <>
            <span className="ld-rule-summary__label">{label}</span>
            {values.map((text) => <span className="ld-rule-summary__value" key={text}>{text}</span>)}
          </>
        ) : <span className={attention ? 'ld-rule-summary__invalid' : 'ld-rule-summary__label'}>{empty}</span>}
      </div>
      {business.length > 0 && (
        <details className="ld-rule-breakdown" open={expandBusiness || undefined}>
          <summary>{businessLabel} <span>{business.length} 项</span></summary>
          <dl>
            {business.map(({ scene, value, invalid }) => (
              <div key={scene}><dt>{sceneLabel(scene)}</dt><dd className={invalid ? 'ld-rule-summary__invalid' : undefined}>{value}</dd></div>
            ))}
          </dl>
        </details>
      )}
    </div>
  )
}

export function LimitDiscountBusinessSelect({ scenes, label, onAdd }: { scenes: string[]; label: string; onAdd: (scene: string) => void }) {
  return (
    <select className="input select" aria-label={label} value="" disabled={scenes.length === 0}
      onChange={(event) => onAdd(event.currentTarget.value)}>
      <option value="" disabled>{scenes.length ? '添加业务' : '已添加全部业务'}</option>
      {scenes.map((scene) => <option key={scene} value={scene}>{sceneLabel(scene)}</option>)}
    </select>
  )
}
