import { useMemo, useState } from 'react'
import { regions } from '../mockData'
import type { Store, StoreScope } from '../types'
import { getResolvedStores } from '../utils/storeRegistry'

interface StorePickerProps {
  scope: StoreScope
  selectedIds: string[]
  onScopeChange: (scope: StoreScope) => void
  onChange: (ids: string[]) => void
  readOnly?: boolean
  selectedTitle?: string
  searchById?: boolean
  searchSelected?: boolean
  storeRestrictions?: Readonly<Record<string, string>>
  /** 外层已提供门店方式时，隐藏组件自带的三个选项 */
  hideScopeRadios?: boolean
}

function matchesStoreSearch(store: Store, keyword: string, searchById: boolean) {
  if (!searchById) return store.name.includes(keyword) || store.code.includes(keyword)
  const term = keyword.trim().toLowerCase()
  return [store.name, store.code, store.id].some((value) => value.toLowerCase().includes(term))
}

export function StorePicker({
  scope, selectedIds, onScopeChange, onChange, readOnly, selectedTitle = '已选门店',
  searchById = false, searchSelected = false, storeRestrictions, hideScopeRadios,
}: StorePickerProps) {
  const [regionId, setRegionId] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [selectedKeyword, setSelectedKeyword] = useState('')
  const allStores = getResolvedStores()

  const filtered = useMemo(() => {
    return allStores.filter((s) => {
      if (regionId !== 'all' && s.regionId !== regionId) return false
      if (!matchesStoreSearch(s, keyword, searchById)) return false
      if (!readOnly && s.status === 'closed' && !selectedIds.includes(s.id)) return false
      return true
    })
  }, [allStores, regionId, keyword, readOnly, searchById, selectedIds])

  const toggle = (id: string) => {
    if (readOnly) return
    const store = allStores.find((s) => s.id === id)
    if ((store?.status === 'closed' || storeRestrictions?.[id]) && !selectedIds.includes(id)) return
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  const selectedStores = allStores.filter((s) => selectedIds.includes(s.id))
  const visibleSelected = searchSelected
    ? selectedStores.filter((store) => matchesStoreSearch(store, selectedKeyword, searchById))
    : selectedStores

  return (
    <div className="store-picker">
      {!readOnly && !hideScopeRadios && (
        <div className="form-row">
          <label className="form-label">门店选择方式</label>
          <div className="form-control">
            <div className="radio-group">
              {[
                { value: 'all', label: '全部门店参与' },
                { value: 'partial_include', label: '部分门店参与' },
                { value: 'partial_exclude', label: '部分门店不参与' },
              ].map((opt) => (
                <label key={opt.value} className="radio">
                  <input
                    type="radio"
                    name="storeScope"
                    checked={scope === opt.value}
                    onChange={() => onScopeChange(opt.value as StoreScope)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <p className="field-hint">已停业门店不可选入参与/不参与名单。</p>
          </div>
        </div>
      )}

      {scope !== 'all' && (
        <div className="picker-layout picker-layout--store">
          <aside className="picker-sidebar">
            <button
              type="button"
              className={`picker-sidebar__item ${regionId === 'all' ? 'is-active' : ''}`}
              onClick={() => setRegionId('all')}
            >
              全部区域
            </button>
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`picker-sidebar__item ${regionId === r.id ? 'is-active' : ''}`}
                onClick={() => setRegionId(r.id)}
              >
                {r.name}
              </button>
            ))}
          </aside>
          <div className="picker-main">
            {!readOnly && (
              <div className="picker-toolbar">
                <input
                  className="input"
                  placeholder={searchById ? '搜索门店名称、编码或 ID' : '请输入门店名称/编码'}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            )}
            <table className="table">
              <thead>
                <tr>
                  {!readOnly && <th style={{ width: 40 }} />}
                  <th>门店名称</th>
                  <th>门店ID</th>
                  <th>区域</th>
                  <th>门店编码</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 5 : 6} className="table-empty">暂无可选门店</td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const closedLocked = !readOnly && s.status === 'closed'
                    const restriction = storeRestrictions?.[s.id]
                    const selected = selectedIds.includes(s.id)
                    const rowLocked = closedLocked || Boolean(restriction && !selected)
                    return (
                      <tr
                        key={s.id}
                        className={!readOnly && !rowLocked ? 'table-row--clickable' : ''}
                        onClick={() => !rowLocked && toggle(s.id)}
                      >
                        {!readOnly && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={rowLocked && !selected}
                              readOnly
                            />
                          </td>
                        )}
                        <td>{s.name}</td>
                        <td>{s.id}</td>
                        <td>{s.regionName}</td>
                        <td>{s.code}</td>
                        <td>
                          <span className={`status-dot ${s.status === 'open' ? 'status-dot--green' : 'status-dot--gray'}`}>
                            {s.status === 'open' ? '营业中' : '已停业'}
                          </span>
                          {restriction && <small className="store-picker__restriction">{restriction}</small>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <aside className="picker-selected">
            <div className="picker-selected__title">{selectedTitle} ({selectedIds.length})</div>
            {searchSelected && selectedStores.length > 0 && (
              <div className="store-picker__selected-search">
                <input type="search" className="input" aria-label="搜索已选门店" placeholder="搜索已选门店"
                  value={selectedKeyword} onChange={(event) => setSelectedKeyword(event.target.value)} />
              </div>
            )}
            <div className="picker-selected__list">
              {selectedStores.length > 0 && visibleSelected.length === 0 && <p className="field-hint">没有匹配的已选门店</p>}
              {visibleSelected.map((s) => (
                <div key={s.id} className="picker-selected__item">
                  <span>
                    {s.name}
                    {s.status === 'closed' ? '（已停业）' : ''}
                  </span>
                  {!readOnly && (
                    <button type="button" aria-label={`移除${s.name}`} onClick={() => toggle(s.id)}>×</button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
