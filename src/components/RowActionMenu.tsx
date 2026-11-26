import { useEffectEvent, useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface RowActionMenuProps {
  open: boolean
  onToggle: () => void
  onClose: () => void
  children: ReactNode
}

export function RowActionMenu({ open, onToggle, onClose, children }: RowActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const closeMenu = useEffectEvent(onClose)

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!open || !trigger || !menu) return

    const anchor = trigger.getBoundingClientRect()
    const { clientWidth, clientHeight } = document.documentElement
    const gap = 4
    const edge = 8
    const above = anchor.top - gap - edge
    const below = clientHeight - anchor.bottom - gap - edge
    const opensAbove = menu.offsetHeight > below && above > below
    const maxHeight = Math.max(0, opensAbove ? above : below)
    const left = Math.max(edge, Math.min(anchor.right - menu.offsetWidth, clientWidth - menu.offsetWidth - edge))
    const top = opensAbove ? anchor.top - gap - Math.min(menu.offsetHeight, maxHeight) : anchor.bottom + gap
    Object.assign(menu.style, { left: `${left}px`, top: `${top}px`, maxHeight: `${maxHeight}px` })
    menu.querySelector('button')?.focus({ preventScroll: true })

    const handleOutsidePress = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && !trigger.contains(target) && !menu.contains(target)) closeMenu()
    }
    const handleScroll = (event: Event) => {
      const target = event.target
      if (target !== window && !(target instanceof Node && target.contains(trigger))) return
      const position = trigger.getBoundingClientRect()
      if (Math.abs(position.top - anchor.top) > 0.5 || Math.abs(position.right - anchor.right) > 0.5) closeMenu()
    }
    const handleResize = () => closeMenu()

    document.addEventListener('pointerdown', handleOutsidePress)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePress)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

  return (
    <div className="row-action-menu" onKeyDown={(event) => {
      if (!open || event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      triggerRef.current?.focus({ preventScroll: true })
      onClose()
    }}>
      <button ref={triggerRef} type="button" className="row-action-menu__trigger" aria-expanded={open}
        aria-controls={open ? menuId : undefined} onClick={onToggle}>更多</button>
      {open && createPortal(
        <div id={menuId} ref={menuRef} className="row-action-menu__dropdown row-action-menu__dropdown--floating" role="group" aria-label="活动操作"
          onBlur={(event) => {
            const next = event.relatedTarget
            if (next && next !== triggerRef.current && !event.currentTarget.contains(next)) onClose()
          }}>{children}</div>,
        document.body,
      )}
    </div>
  )
}
