/**
 * 已选商品列表的通用工具件：列表内检索、分页、批量移除确认。
 * 五类活动（买1送N / 第N件优惠 / 满减折 / 会员价 / 付费会员价）共用，
 * 避免已选商品过多时只能逐页翻找。
 */

interface SelectedProductSearchBarProps {
  keyword: string
  onChange: (keyword: string) => void
  /** 当前筛选命中的条数 */
  filteredCount: number
  /** 已选商品总条数 */
  totalCount: number
  /** 列表主体名称，反选场景传「不参与商品」 */
  itemLabel?: string
  /**
   * 筛选期间批量操作的作用域说明，如「批量设置与移除仅对筛选结果生效」。
   * 仅在有关键词时展示，防止商家以为动作作用于全部已选商品。
   */
  scopeHint?: string
}

export function SelectedProductSearchBar({
  keyword,
  onChange,
  filteredCount,
  totalCount,
  itemLabel = '商品',
  scopeHint,
}: SelectedProductSearchBarProps) {
  const filtering = keyword.trim().length > 0

  return (
    <div className="selected-product-search">
      <div className="selected-product-search__row">
        <input
          className="input selected-product-search__input"
          value={keyword}
          placeholder={`在已选${itemLabel}中查找：名称 / 编码 / 商品ID`}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="selected-product-search__count">
          {filtering ? (
            <>
              筛选出 <strong>{filteredCount}</strong> 条，共 {totalCount} 条
            </>
          ) : (
            <>共 {totalCount} 条</>
          )}
        </span>
        {filtering && (
          <button type="button" className="link-btn" onClick={() => onChange('')}>
            清除筛选
          </button>
        )}
      </div>
      {filtering && scopeHint && <p className="selected-product-search__hint">{scopeHint}</p>}
    </div>
  )
}

interface SelectedProductPagerProps {
  total: number
  pageSize: number
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
  /** 是否处于筛选态，文案上区分「筛选结果」与「已选商品」 */
  filtering?: boolean
}

export function SelectedProductPager({
  total,
  pageSize,
  currentPage,
  totalPages,
  onChange,
  filtering,
}: SelectedProductPagerProps) {
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, total)

  return (
    <div className="pagination pagination--full">
      <span>
        {filtering ? '筛选结果' : '共'} {total} 条，当前第 {rangeStart}–{rangeEnd} 条
      </span>
      {total > pageSize && (
        <div className="pagination__pages">
          <button
            type="button"
            className="page-btn"
            disabled={currentPage <= 1}
            onClick={() => onChange(currentPage - 1)}
          >
            上一页
          </button>
          <span className="page-indicator">{currentPage} / {totalPages}</span>
          <button
            type="button"
            className="page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => onChange(currentPage + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

interface BatchRemoveConfirmModalProps {
  count: number
  /** 是否在筛选态下发起，用于提示移除范围 */
  filtering?: boolean
  itemLabel?: string
  /** 附加影响说明，如会员价场景的「已填写的优惠值会一并清除」 */
  extraNote?: string
  onCancel: () => void
  onConfirm: () => void
}

export function BatchRemoveConfirmModal({
  count,
  filtering,
  itemLabel = '商品',
  extraNote,
  onCancel,
  onConfirm,
}: BatchRemoveConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header"><h3>移除 {count} 个{itemLabel}？</h3></div>
        <div className="modal__body">
          <p>
            将从活动中移除已勾选的 <strong>{count}</strong> 个{itemLabel}
            {filtering ? '（仅当前筛选结果中勾选的部分）' : ''}。
            {extraNote}
          </p>
          <p>移除后可重新添加，活动保存前不影响线上。</p>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>确认移除</button>
        </div>
      </div>
    </div>
  )
}
