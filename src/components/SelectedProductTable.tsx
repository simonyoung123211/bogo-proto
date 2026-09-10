import { useEffect, useMemo, useState } from 'react'
import { products } from '../mockData'
import type { Product } from '../types'
import { filterProductsByKeyword } from '../utils/productSearch'
import {
  BatchRemoveConfirmModal,
  SelectedProductPager,
  SelectedProductSearchBar,
} from './SelectedProductTools'
import { TableSelectHeader } from './TableSelectHeader'

const PAGE_SIZE = 20

export interface SelectedProductColumn {
  key: string
  header: string
  render: (product: Product) => React.ReactNode
}

interface SelectedProductTableProps {
  productIds: string[]
  /** 各活动类型自定义展示列，勾选列与操作列由组件统一渲染 */
  columns: SelectedProductColumn[]
  readOnly?: boolean
  onChange: (ids: string[]) => void
  onToast?: (message: string) => void
  /** 反选场景传「不参与商品」 */
  itemLabel?: string
  emptyText?: string
}

/**
 * 已选商品列表（买1送N / 第N件优惠 / 满减折共用）。
 * 统一提供列表内关键词检索、分页、勾选与批量移除，
 * 避免商品上百条时只能逐页翻找、逐条移除。
 */
export function SelectedProductTable({
  productIds,
  columns,
  readOnly,
  onChange,
  onToast,
  itemLabel = '商品',
  emptyText,
}: SelectedProductTableProps) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  /** 勾选了当前筛选结果的全部条目（含未展示的其他页） */
  const [selectAllVisible, setSelectAllVisible] = useState(false)
  const [showBatchRemove, setShowBatchRemove] = useState(false)

  const idSet = useMemo(() => new Set(productIds), [productIds])
  const selectedProducts = useMemo(() => products.filter((p) => idSet.has(p.id)), [idSet])

  const filtering = keyword.trim().length > 0
  const visibleProducts = useMemo(
    () => filterProductsByKeyword(selectedProducts, keyword),
    [selectedProducts, keyword],
  )

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = visibleProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageIds = pageRows.map((p) => p.id)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const changeKeyword = (next: string) => {
    setKeyword(next)
    setPage(1)
    // 筛选范围变了，勾选一并清空，避免批量移除误伤筛选外的商品
    setCheckedIds([])
    setSelectAllVisible(false)
  }

  const allPageChecked = pageIds.length > 0 && pageIds.every((id) => checkedIds.includes(id) || selectAllVisible)
  const somePageChecked = pageIds.some((id) => checkedIds.includes(id) || selectAllVisible)
  const pageCheckState: 'none' | 'some' | 'all' = selectAllVisible || allPageChecked
    ? 'all'
    : somePageChecked
      ? 'some'
      : 'none'
  const hasSelection = selectAllVisible || checkedIds.length > 0
  const selectedCount = selectAllVisible ? visibleProducts.length : checkedIds.length
  const hasMultiplePages = visibleProducts.length > PAGE_SIZE

  const selectCurrentPage = () => {
    setSelectAllVisible(false)
    setCheckedIds((prev) => [...new Set([...prev.filter((id) => !pageIds.includes(id)), ...pageIds])])
  }

  const selectAllAcrossPages = () => {
    setSelectAllVisible(true)
    setCheckedIds(visibleProducts.map((p) => p.id))
  }

  const togglePageCheck = () => {
    if (selectAllVisible || allPageChecked) {
      setSelectAllVisible(false)
      setCheckedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
      return
    }
    selectCurrentPage()
  }

  const toggleOneCheck = (id: string) => {
    setSelectAllVisible(false)
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const removeOne = (id: string) => {
    setCheckedIds((prev) => prev.filter((x) => x !== id))
    setSelectAllVisible(false)
    onChange(productIds.filter((x) => x !== id))
  }

  const removeChecked = () => {
    const targets = selectAllVisible ? visibleProducts.map((p) => p.id) : checkedIds
    if (targets.length === 0) return
    const targetSet = new Set(targets)
    onChange(productIds.filter((id) => !targetSet.has(id)))
    setCheckedIds([])
    setSelectAllVisible(false)
    setShowBatchRemove(false)
    onToast?.(`已移除 ${targets.length} 个${itemLabel}`)
  }

  const colSpan = columns.length + (readOnly ? 0 : 2)

  return (
    <>
      {selectedProducts.length > 0 && (
        <SelectedProductSearchBar
          keyword={keyword}
          onChange={changeKeyword}
          filteredCount={visibleProducts.length}
          totalCount={selectedProducts.length}
          itemLabel={itemLabel}
          scopeHint={readOnly ? undefined : '筛选期间的勾选与批量移除仅对筛选结果生效。'}
        />
      )}

      {!readOnly && hasSelection && (
        <div className="table-selection-bar table-selection-bar--compact">
          <div className="table-selection-bar__meta">
            {selectAllVisible ? (
              <span>
                已选{filtering ? '筛选结果全部' : '全部'} <strong>{selectedCount}</strong> 条
              </span>
            ) : (
              <span>已选 <strong>{selectedCount}</strong> 条</span>
            )}
            {hasMultiplePages && !selectAllVisible && (
              <button type="button" className="link-btn" onClick={selectAllAcrossPages}>
                {filtering ? '全选筛选结果' : '全选全部'} {visibleProducts.length} 条
              </button>
            )}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setSelectAllVisible(false)
                setCheckedIds([])
              }}
            >
              清空
            </button>
            <button
              type="button"
              className="link-btn link-btn--danger"
              onClick={() => setShowBatchRemove(true)}
            >
              批量移除
            </button>
          </div>
        </div>
      )}

      <table className="table">
        <thead>
          <tr>
            {!readOnly && (
              <th style={{ width: 88 }}>
                <TableSelectHeader
                  checkState={pageCheckState}
                  disabled={pageIds.length === 0}
                  pageCount={pageIds.length}
                  totalCount={visibleProducts.length}
                  hasMultiplePages={hasMultiplePages}
                  onTogglePage={togglePageCheck}
                  onSelectPage={selectCurrentPage}
                  onSelectAll={selectAllAcrossPages}
                  allOptionLabel={filtering ? '全选筛选结果' : '全选全部'}
                />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key}>{c.header}</th>
            ))}
            {!readOnly && <th>操作</th>}
          </tr>
        </thead>
        <tbody>
          {visibleProducts.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="table-empty">
                {filtering ? (
                  <>
                    没有匹配「{keyword.trim()}」的已选{itemLabel}
                    <button type="button" className="link-btn" onClick={() => changeKeyword('')}>
                      清除筛选
                    </button>
                  </>
                ) : (
                  emptyText ?? '暂无数据'
                )}
              </td>
            </tr>
          ) : (
            pageRows.map((p) => (
              <tr key={p.id}>
                {!readOnly && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectAllVisible || checkedIds.includes(p.id)}
                      onChange={() => toggleOneCheck(p.id)}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key}>{c.render(p)}</td>
                ))}
                {!readOnly && (
                  <td>
                    <button type="button" className="link-btn" onClick={() => removeOne(p.id)}>
                      移除
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {visibleProducts.length > 0 && (
        <SelectedProductPager
          total={visibleProducts.length}
          pageSize={PAGE_SIZE}
          currentPage={currentPage}
          totalPages={totalPages}
          filtering={filtering}
          onChange={setPage}
        />
      )}

      {showBatchRemove && (
        <BatchRemoveConfirmModal
          count={selectedCount}
          filtering={filtering}
          itemLabel={itemLabel}
          onCancel={() => setShowBatchRemove(false)}
          onConfirm={removeChecked}
        />
      )}
    </>
  )
}
