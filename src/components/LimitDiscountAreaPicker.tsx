import { useEffect, useRef, useState } from 'react'
import { getDiscountAreas } from '../mockLimitDiscountAreas'
import type { LimitDiscountActivityForm } from '../types'
import { eligibleDiscountStores, updateAreaSelection, type DiscountAreaRows } from '../utils/limitDiscountScope'

type AreaSelection = LimitDiscountActivityForm['areaIdsByStore']

interface Props {
  activity: LimitDiscountActivityForm
  onConfirm: (value: AreaSelection) => void
  onClose: () => void
}

export function AreaBatchCheckbox({ selected, total, label, onChange }: {
  selected: number; total: number; label: string; onChange: (checked: boolean) => void
}) {
  return (
    <input type="checkbox" className="ld-area-batch-check" aria-label={label} disabled={total === 0}
      checked={total > 0 && selected === total}
      ref={(element) => { if (element) element.indeterminate = selected > 0 && selected < total }}
      onChange={(event) => onChange(event.target.checked)} />
  )
}

export function LimitDiscountAreaPicker({ activity, onConfirm, onClose }: Props) {
  const [draft, setDraft] = useState<AreaSelection>(activity.areaIdsByStore)
  const [keyword, setKeyword] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
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
  const catalog = eligibleDiscountStores(activity).map((store) => ({ store, areas: getDiscountAreas(store.id) }))
  const visible = catalog.flatMap(({ store, areas }) => {
    if ([store.name, store.code, store.id].some((value) => value.toLowerCase().includes(term))) return [{ store, areas }]
    const matches = areas.filter((area) => area.name.toLowerCase().includes(term))
    return matches.length ? [{ store, areas: matches }] : []
  })
  const isSelected = (storeId: string, area: ReturnType<typeof getDiscountAreas>[number]) =>
    area.allowsDiscount && !!draft[storeId]?.includes(area.id)
  const chosen = catalog.map(({ store, areas }) => ({
    store, areas: areas.filter((area) => isSelected(store.id, area)),
  })).filter(({ areas }) => areas.length > 0)
  const chosenCount = chosen.reduce((total, group) => total + group.areas.length, 0)
  const matchCount = visible.reduce((total, group) => total + group.areas.filter((area) => area.allowsDiscount).length, 0)
  const checkedMatches = visible.reduce((total, group) => total + group.areas.filter((area) => isSelected(group.store.id, area)).length, 0)

  function setChecked(groups: DiscountAreaRows, checked: boolean) {
    setDraft((previous) => updateAreaSelection(previous, groups, checked))
  }

  return (
    <dialog className="modal modal--xl ld-area-dialog" ref={dialogRef} aria-labelledby="ld-area-picker-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }
      }}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <header className="modal__header">
        <h3 id="ld-area-picker-title">选择点餐区域</h3>
        <button type="button" className="modal__close" aria-label="关闭区域选择" onClick={onClose}>×</button>
      </header>
      <div className="ld-area-dialog__body">
        <section className="ld-area-dialog__available" aria-label="可选区域">
          <div className="ld-area-dialog__search">
            <input ref={searchRef} className="input" type="search" aria-label="搜索门店或点餐区域"
              placeholder="搜索区域名称、门店名称或编码" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
          <label className="checkbox ld-area-dialog__bulk">
            <AreaBatchCheckbox selected={checkedMatches} total={matchCount} label={term ? '全选搜索结果' : '全选可选区域'}
              onChange={(checked) => setChecked(visible, checked)} />
            {term ? '全选搜索结果' : '全选可选区域'}（{matchCount}）
          </label>
          <div className="ld-area-dialog__scroll">
            {visible.map(({ store, areas }) => {
              const available = areas.filter((area) => area.allowsDiscount)
              const checked = available.filter((area) => isSelected(store.id, area))
              return (
                <div key={store.id} className="ld-area-dialog__store" role="group" aria-label={store.name}>
                  <label className="checkbox ld-area-dialog__store-name">
                    <AreaBatchCheckbox selected={checked.length} total={available.length} label={`全选${store.name}的${term ? '匹配' : '可选'}区域`}
                      onChange={(value) => setChecked([{ store, areas }], value)} />
                    <strong>{store.name}</strong><small>{store.code}</small>
                  </label>
                  <div className="ld-area-dialog__options">
                    {areas.map((area) => (
                      <label key={area.id} className="checkbox ld-area-dialog__option">
                        <input type="checkbox" disabled={!area.allowsDiscount} checked={isSelected(store.id, area)}
                          onChange={(event) => setChecked([{ store, areas: [area] }], event.target.checked)} />
                        {area.name}{!area.allowsDiscount && <small>未开放限时折扣</small>}
                      </label>
                    ))}
                    {!areas.length && <small>暂无点餐区域</small>}
                  </div>
                </div>
              )
            })}
            {!visible.length && <p className="ld-area-dialog__empty">{catalog.length ? '没有匹配的门店或区域' : '请先选择参与门店'}</p>}
          </div>
        </section>
        <aside className="ld-area-dialog__selected" aria-label="已选区域">
          <div className="ld-area-dialog__selection-head">
            <strong aria-live="polite">已选区域（{chosenCount}）</strong>
            <button type="button" className="link-btn" disabled={!chosenCount} onClick={() => setChecked(chosen, false)}>清空已选</button>
          </div>
          <div className="ld-area-dialog__scroll">
            {chosen.map(({ store, areas }) => (
              <div className="ld-area-dialog__picked" key={store.id}>
                <strong>{store.name}</strong>
                <div className="ld-area-dialog__tags">
                  {areas.map((area) => (
                    <button type="button" key={area.id} aria-label={`移除${store.name}的${area.name}`}
                      onClick={() => setChecked([{ store, areas: [area] }], false)}>
                      {area.name}<span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!chosenCount && <p className="ld-area-dialog__empty">尚未选择区域</p>}
          </div>
        </aside>
      </div>
      <footer className="modal__footer">
        <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
        <button type="button" className="btn btn--primary" onClick={() => onConfirm(draft)}>确定</button>
      </footer>
    </dialog>
  )
}
