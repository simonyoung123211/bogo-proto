import { useEffect, useId, useRef, useState } from 'react'
import type { ActivityPerspective } from '../types'

const PERSPECTIVE_LABELS = {
  group: '集团',
  brand: '品牌',
  store_group: '门店组',
  store: '门店',
}

interface ActivityPerspectivePickerProps {
  options: readonly ActivityPerspective[]
  value: ActivityPerspective
  onChange: (perspective: ActivityPerspective) => void
}

interface PerspectiveRow {
  option: ActivityPerspective
  depth: number
  hasChildren: boolean
}

function getPerspectiveRows(options: readonly ActivityPerspective[], query: string, collapsed: ReadonlySet<string>): PerspectiveRow[] {
  const ids = new Set(options.map((option) => option.id))
  const byParent = new Map<string | undefined, ActivityPerspective[]>()
  for (const option of options) {
    const parent = option.parentId && ids.has(option.parentId) ? option.parentId : undefined
    const siblings = byParent.get(parent) ?? []
    siblings.push(option)
    byParent.set(parent, siblings)
  }

  function collect(parent: string | undefined, depth: number): PerspectiveRow[] {
    return (byParent.get(parent) ?? []).flatMap((option) => {
      const children = collect(option.id, depth + 1)
      const matches = [option.name, option.code ?? '', PERSPECTIVE_LABELS[option.type]]
        .some((text) => text.toLowerCase().includes(query))
      if (!matches && children.length === 0) return []

      const row = { option, depth, hasChildren: children.length > 0 }
      return collapsed.has(option.id) ? [row] : [row, ...children]
    })
  }

  return collect(undefined, 0)
}

export function ActivityPerspectivePicker({ options, value, onChange }: ActivityPerspectivePickerProps) {
  const panelId = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value.id)
  const [keyword, setKeyword] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set<string>())

  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const dismissOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [open])

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const selected = options.find((option) => option.id === draft)
  const rows = open ? getPerspectiveRows(options, keyword.trim().toLowerCase(), collapsed) : []

  const toggleBranch = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className="activity-perspective-picker"
      ref={root}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
      }}
    >
      <button
        type="button"
        className="btn btn--default activity-perspective-picker__trigger"
        ref={trigger}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (open) return close()
          setDraft(value.id)
          setKeyword('')
          setCollapsed(new Set())
          setOpen(true)
        }}
      >
        <span className="text-secondary">当前操作视角</span>
        <span>{PERSPECTIVE_LABELS[value.type]} · {value.name}</span>
        <span className="activity-perspective-picker__arrow" aria-hidden="true" />
      </button>
      {open && (
        <div className="activity-perspective-picker__panel" id={panelId} role="group" aria-label="选择活动操作视角">
          <div className="activity-perspective-picker__heading">
            <span>选择活动操作视角</span>
            <span className="activity-perspective-picker__hint">单选</span>
          </div>
          <div className="activity-perspective-picker__search">
            <input
              ref={search}
              type="search"
              className="input"
              aria-label="搜索操作视角"
              placeholder="搜索视角名称或编码"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setCollapsed(new Set())
              }}
            />
          </div>
          <div className="activity-perspective-picker__options" role="radiogroup" aria-label="可用操作视角">
            {rows.map(({ option, depth, hasChildren }) => {
              const expanded = !collapsed.has(option.id)
              return (
                <div
                  key={option.id}
                  className="activity-perspective-picker__row"
                  style={{ paddingInlineStart: 8 + depth * 18 }}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      className="activity-perspective-picker__expand"
                      aria-label={`${expanded ? '收起' : '展开'}${option.name}`}
                      aria-expanded={expanded}
                      onClick={() => toggleBranch(option.id)}
                    >
                      <span className="activity-perspective-picker__arrow" aria-hidden="true" />
                    </button>
                  ) : <span className="activity-perspective-picker__spacer" aria-hidden="true" />}
                  <label className="activity-perspective-picker__option">
                    <span className="activity-perspective-picker__name" title={option.name}>{option.name}</span>
                    <span className="activity-perspective-picker__type">{PERSPECTIVE_LABELS[option.type]}</span>
                    <input
                      type="radio"
                      name={panelId}
                      checked={draft === option.id}
                      onChange={() => setDraft(option.id)}
                    />
                  </label>
                </div>
              )
            })}
            {rows.length === 0 && <p className="activity-perspective-picker__empty">未找到匹配的操作视角</p>}
          </div>
          <div className="activity-perspective-picker__footer">
            <span className="activity-perspective-picker__hint" aria-live="polite">已选 {selected ? 1 : 0} 个视角</span>
            <div className="activity-perspective-picker__actions">
              <button type="button" className="btn btn--default" onClick={close}>取消</button>
              <button type="button" className="btn btn--primary" disabled={!selected} onClick={() => {
                if (selected && selected.id !== value.id) onChange(selected)
                close()
              }}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
