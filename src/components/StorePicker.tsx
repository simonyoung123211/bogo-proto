import { useMemo, useState } from 'react'
import { regions } from '../mockData'
import type { StoreScope } from '../types'
import { getResolvedStores } from '../utils/storeRegistry'

interface StorePickerProps {
  scope: StoreScope
  selectedIds: string[]
  onScopeChange: (scope: StoreScope) => void
  onChange: (ids: string[]) => void
  readOnly?: boolean
}

export function StorePicker({ scope, selectedIds, onScopeChange, onChange, readOnly }: StorePickerProps) {
  const [regionId, setRegionId] = useState('all')
  const [keyword, setKeyword] = useState('')
  const allStores = getResolvedStores()

  const filtered = useMemo(() => {
    return allStores.filter((s) => {
      if (regionId !== 'all' && s.regionId !== regionId) return false
      if (keyword && !s.name.includes(keyword) && !s.code.includes(keyword)) return false
      if (!readOnly && s.status === 'closed' && !selectedIds.includes(s.id)) return false
      return true
    })
  }, [allStores, regionId, keyword, readOnly, selectedIds])

  const toggle = (id: string) => {
    if (readOnly) return
    const store = allStores.find((s) => s.id === id)
    if (store?.status === 'closed' && !selectedIds.includes(id)) return
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  const selectedStores = allStores.filter((s) => selectedIds.includes(s.id))

  return (
    <div className="store-picker">
      {!readOnly && (
        <div className="form-row">
          <label className="form-label">门店选择方式</label>
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
          <p className="form-hint" style={{ margin: '6px 0 0' }}>已停业门店不可选入参与/不参与名单。</p>
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
                  placeholder="请输入门店名称/编码"
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
                    return (
                      <tr
                        key={s.id}
                        className={!readOnly && !closedLocked ? 'table-row--clickable' : ''}
                        onClick={() => !closedLocked && toggle(s.id)}
                      >
                        {!readOnly && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(s.id)}
                              disabled={closedLocked && !selectedIds.includes(s.id)}
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
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <aside className="picker-selected">
            <div className="picker-selected__title">已选门店 ({selectedIds.length})</div>
            <div className="picker-selected__list">
              {selectedStores.map((s) => (
                <div key={s.id} className="picker-selected__item">
                  <span>
                    {s.name}
                    {s.status === 'closed' ? '（已停业）' : ''}
                  </span>
                  {!readOnly && (
                    <button type="button" onClick={() => toggle(s.id)}>×</button>
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
