import { useEffect, useMemo, useState } from 'react'
import { categories, products } from '../mockData'
import { TableSelectHeader } from './TableSelectHeader'

const PAGE_SIZE = 20

interface ProductPickerProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onClose: () => void
  title?: string
  maxCount?: number
}

export function ProductPicker({
  selectedIds,
  onChange,
  onClose,
  title = '选择商品',
  maxCount,
}: ProductPickerProps) {
  const [categoryId, setCategoryId] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds)
  const [page, setPage] = useState(1)
  const [selectAllFiltered, setSelectAllFiltered] = useState(false)

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryId !== 'all' && p.categoryId !== categoryId) return false
      if (keyword && !p.name.includes(keyword) && !p.code.includes(keyword) && !p.id.includes(keyword)) return false
      return true
    })
  }, [categoryId, keyword])

  useEffect(() => {
    setPage(1)
    setSelectAllFiltered(false)
  }, [categoryId, keyword])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageIds = pageRows.map((p) => p.id)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)

  const selectedSet = useMemo(() => new Set(localSelected), [localSelected])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id))
  const somePageSelected = pageIds.some((id) => selectedSet.has(id))
  const pageCheckState: 'none' | 'some' | 'all' = selectAllFiltered || allPageSelected
    ? 'all'
    : somePageSelected
      ? 'some'
      : 'none'
  const hasMultiplePages = filtered.length > PAGE_SIZE
  const hasSelection = localSelected.length > 0

  const clampAdd = (prev: string[], ids: string[]) => {
    const next = new Set(prev)
    for (const id of ids) {
      if (maxCount !== undefined && next.size >= maxCount) break
      next.add(id)
    }
    return [...next]
  }

  const toggle = (id: string) => {
    setSelectAllFiltered(false)
    setLocalSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (maxCount !== undefined && prev.length >= maxCount) return prev
      return [...prev, id]
    })
  }

  const selectCurrentPage = () => {
    setSelectAllFiltered(false)
    setLocalSelected((prev) => clampAdd(
      prev.filter((id) => !pageIds.includes(id)),
      pageIds,
    ))
  }

  const selectAllFilteredRows = () => {
    const ids = filtered.map((p) => p.id)
    const next = maxCount !== undefined ? ids.slice(0, maxCount) : ids
    setLocalSelected(next)
    setSelectAllFiltered(next.length === filtered.length || (maxCount !== undefined && next.length >= maxCount && next.length === ids.slice(0, maxCount).length))
  }

  const togglePageAll = () => {
    if (selectAllFiltered || allPageSelected) {
      setSelectAllFiltered(false)
      setLocalSelected((prev) => prev.filter((id) => !pageIds.includes(id)))
      return
    }
    selectCurrentPage()
  }

  const clearSelection = () => {
    setLocalSelected([])
    setSelectAllFiltered(false)
  }

  const keepCurrentPageOnly = () => {
    setSelectAllFiltered(false)
    setLocalSelected([...pageIds])
  }

  const selectedProducts = products.filter((p) => selectedSet.has(p.id))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="picker-layout">
          <aside className="picker-sidebar">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`picker-sidebar__item ${categoryId === c.id ? 'is-active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </aside>
          <div className="picker-main">
            <div className="picker-toolbar">
              <input
                className="input"
                placeholder="请输入商品名称/编码"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            {hasSelection && (
              <div className="table-selection-bar table-selection-bar--compact">
                <div className="table-selection-bar__meta">
                  {selectAllFiltered ? (
                    <span>已选全部 <strong>{localSelected.length}</strong> 条结果</span>
                  ) : (
                    <span>
                      已选 <strong>{localSelected.length}</strong> 条
                      {allPageSelected && localSelected.length === pageIds.length ? '（当前页）' : ''}
                    </span>
                  )}
                  {hasMultiplePages && !selectAllFiltered && (
                    <button type="button" className="link-btn" onClick={selectAllFilteredRows}>
                      全选全部 {filtered.length} 条
                    </button>
                  )}
                  {selectAllFiltered && (
                    <button type="button" className="link-btn" onClick={keepCurrentPageOnly}>仅保留当前页</button>
                  )}
                  <button type="button" className="link-btn" onClick={clearSelection}>清空</button>
                </div>
              </div>
            )}
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 88 }}>
                    <TableSelectHeader
                      checkState={pageCheckState}
                      disabled={pageIds.length === 0}
                      pageCount={pageIds.length}
                      totalCount={filtered.length}
                      hasMultiplePages={hasMultiplePages}
                      onTogglePage={togglePageAll}
                      onSelectPage={selectCurrentPage}
                      onSelectAll={selectAllFilteredRows}
                    />
                  </th>
                  <th>商品名称</th>
                  <th>规格</th>
                  <th>类目</th>
                  <th>编码</th>
                  <th>销售价</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty">暂无商品</td>
                  </tr>
                ) : (
                  pageRows.map((p) => (
                    <tr key={p.id} onClick={() => toggle(p.id)} className="table-row--clickable">
                      <td>
                        <input type="checkbox" checked={selectedSet.has(p.id)} readOnly />
                      </td>
                      <td>{p.name}</td>
                      <td>{p.spec}</td>
                      <td>{p.categoryName}</td>
                      <td>{p.code}</td>
                      <td>¥{p.price}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div className="pagination pagination--full">
                <span>共 {filtered.length} 条，当前第 {rangeStart}–{rangeEnd} 条</span>
                {filtered.length > PAGE_SIZE && (
                  <div className="pagination__pages">
                    <button type="button" className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
                    <span className="page-indicator">{currentPage} / {totalPages}</span>
                    <button type="button" className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className="picker-selected">
            <div className="picker-selected__title">
              已选 ({localSelected.length}{maxCount !== undefined ? `/${maxCount}` : ''})
            </div>
            <div className="picker-selected__list">
              {selectedProducts.map((p) => (
                <div key={p.id} className="picker-selected__item">
                  <span>{p.name}</span>
                  <button type="button" onClick={() => toggle(p.id)}>×</button>
                </div>
              ))}
            </div>
          </aside>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onChange(localSelected)
              onClose()
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
