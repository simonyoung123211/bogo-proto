import { useEffect, useId, useRef, useState } from 'react'
import type { Store } from '../types'
import { AreaBatchCheckbox } from './LimitDiscountAreaPicker'

export interface StoreTagOption {
  id: string
  label: string
  linkedStores: Store[]
}

interface Props {
  tags: StoreTagOption[]
  selectedIds: string[]
  excluding: boolean
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

export function LimitDiscountStoreTagPicker({ tags, selectedIds, excluding, onConfirm, onClose }: Props) {
  const [draft, setDraft] = useState(() => new Set(selectedIds))
  const [keyword, setKeyword] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const trigger = document.activeElement
    dialog?.showModal()
    searchRef.current?.focus()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  const term = keyword.trim().toLowerCase()
  const filtered = tags.filter(({ label }) => label.toLowerCase().includes(term))
  const selected = tags.filter(({ id }) => draft.has(id))
  const checkedMatches = filtered.filter(({ id }) => draft.has(id)).length
  const matchedStoreCount = new Set(selected.flatMap(({ linkedStores }) => linkedStores.map(({ id }) => id))).size
  const batchLabel = term ? '全选搜索结果' : '全选标签'

  function setChecked(ids: string[], checked: boolean) {
    setDraft((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  return (
    <dialog className="modal modal--lg ld-area-dialog ld-tag-picker" ref={dialogRef} aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <header className="modal__header">
        <h3 id={titleId}>{excluding ? '选择不参与门店标签' : '选择参与门店标签'}</h3>
        <button type="button" className="modal__close" aria-label="关闭标签选择" onClick={onClose}>×</button>
      </header>
      <div className="ld-area-dialog__body">
        <section className="ld-area-dialog__available" aria-label="可选标签">
          <div className="ld-area-dialog__search">
            <input ref={searchRef} type="search" className="input" aria-label="搜索标签名称"
              placeholder="搜索标签名称" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <div className="ld-area-dialog__bulk ld-tag-picker__row">
            <label className="checkbox">
              <AreaBatchCheckbox selected={checkedMatches} total={filtered.length} label={batchLabel}
                onChange={(checked) => setChecked(filtered.map(({ id }) => id), checked)} />
              {batchLabel}（{filtered.length}）
            </label>
            <span>关联营业门店</span>
          </div>
          <div className="ld-area-dialog__scroll">
            {filtered.length === 0 && <p className="ld-area-dialog__empty">没有匹配的标签</p>}
            {filtered.map(({ id, label, linkedStores }) => (
              <label className="checkbox ld-tag-picker__row ld-tag-picker__option" key={id}>
                <input type="checkbox" checked={draft.has(id)} aria-label={label}
                  onChange={(event) => setChecked([id], event.target.checked)} />
                <span>{label}</span>
                <small>{linkedStores.length} 家</small>
              </label>
            ))}
          </div>
        </section>
        <aside className="ld-area-dialog__selected" aria-label="已选标签">
          <div className="ld-area-dialog__selection-head">
            <strong>已选标签（{selected.length}）</strong>
            <button type="button" className="link-btn" disabled={selected.length === 0}
              onClick={() => setDraft(new Set())}>清空</button>
          </div>
          <div className="ld-area-dialog__scroll">
            {selected.length === 0 && <p className="ld-area-dialog__empty">尚未选择标签</p>}
            {selected.map(({ id, label }) => (
              <div className="ld-tag-picker__row ld-tag-picker__picked" key={id}>
                <span>{label}</span>
                <button type="button" className="link-btn" aria-label={`移除${label}`}
                  onClick={() => setChecked([id], false)}>移除</button>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <footer className="modal__footer ld-tag-picker__footer">
        <span role="status">{excluding ? '预计排除' : '预计命中'} {matchedStoreCount} 家营业门店（已去重）</span>
        <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
        <button type="button" className="btn btn--primary" onClick={() => onConfirm([...draft])}>确定</button>
      </footer>
    </dialog>
  )
}
