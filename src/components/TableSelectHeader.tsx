import { useEffect, useRef, useState } from 'react'

type CheckState = 'none' | 'some' | 'all'

interface TableSelectHeaderProps {
  checkState: CheckState
  disabled?: boolean
  pageCount: number
  totalCount: number
  hasMultiplePages: boolean
  /** 点击勾选框：当前页全选/取消 */
  onTogglePage: () => void
  onSelectPage: () => void
  onSelectAll: () => void
}

/** 表头：勾选当前页 + 下拉（全选当前页 / 全选全部） */
export function TableSelectHeader({
  checkState,
  disabled,
  pageCount,
  totalCount,
  hasMultiplePages,
  onTogglePage,
  onSelectPage,
  onSelectAll,
}: TableSelectHeaderProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = checkboxRef.current
    if (el) el.indeterminate = checkState === 'some'
  }, [checkState])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="table-select-header" ref={rootRef}>
      <input
        ref={checkboxRef}
        type="checkbox"
        disabled={disabled || pageCount === 0}
        checked={checkState === 'all'}
        onChange={onTogglePage}
        aria-label="全选当前页"
      />
      {hasMultiplePages && (
        <>
          <button
            type="button"
            className={`table-select-header__trigger ${open ? 'is-open' : ''}`}
            disabled={disabled || totalCount === 0}
            aria-label="选择范围"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
          >
            <span>全选</span>
            <span className="table-select-header__caret" aria-hidden>▾</span>
          </button>
          {open && (
            <div className="table-select-header__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelectPage()
                  setOpen(false)
                }}
              >
                全选当前页（{pageCount}）
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelectAll()
                  setOpen(false)
                }}
              >
                全选全部（{totalCount}）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
