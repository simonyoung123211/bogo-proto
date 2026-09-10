import { useEffect, useMemo, useState } from 'react'
import { MEMBER_LEVELS, products } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS } from '../mockMemberPriceData'
import type { MemberLevelId, MemberPriceMethod, MemberPriceProductCoreFields } from '../types'
import { defaultValueForMethod, syncProductItems } from '../utils/memberPriceActivity'
import { filterProductsByKeyword } from '../utils/productSearch'
import { ProductPicker } from './ProductPicker'
import {
  BatchRemoveConfirmModal,
  SelectedProductPager,
  SelectedProductSearchBar,
} from './SelectedProductTools'
import { TableSelectHeader } from './TableSelectHeader'

const PAGE_SIZE = 20

interface MemberPriceProductConfigProps<T extends MemberPriceProductCoreFields> {
  activity: T
  readOnly?: boolean
  onChange: (activity: T) => void
  onToast?: (message: string) => void
  /**
   * 是否展示会员等级选择。付费会员价的资格来自权益卡，
   * 不需要选择等级，传 false 隐藏该区块。
   */
  showMemberLevels?: boolean
}

export function MemberPriceProductConfig<T extends MemberPriceProductCoreFields>({
  activity,
  readOnly,
  onChange,
  onToast,
  showMemberLevels = true,
}: MemberPriceProductConfigProps<T>) {
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [batchValue, setBatchValue] = useState('')
  const [page, setPage] = useState(1)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  /** 勾选了当前筛选结果的全部条目（含未展示的其他页） */
  const [selectAllVisible, setSelectAllVisible] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [showBatchRemove, setShowBatchRemove] = useState(false)

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    onChange({ ...activity, [key]: value })
  }

  const memberLevels = activity.memberLevels ?? []

  const toggleLevel = (id: MemberLevelId) => {
    const next = memberLevels.includes(id)
      ? memberLevels.filter((x) => x !== id)
      : [...memberLevels, id]
    onChange({ ...activity, memberLevels: next })
  }

  const toggleAllLevels = () => {
    const next = memberLevels.length === MEMBER_LEVELS.length ? [] : MEMBER_LEVELS.map((l) => l.id)
    onChange({ ...activity, memberLevels: next })
  }

  const changePriceMethod = (method: MemberPriceMethod) => {
    const next = syncProductItems(
      { ...activity, priceMethod: method, allProductsValue: defaultValueForMethod(method) },
      activity.productIds,
      true,
    )
    onChange(next)
  }

  const changeSelectionMode = (mode: MemberPriceProductCoreFields['productSelectionMode']) => {
    if (mode === activity.productSelectionMode) return
    resetListState()
    onChange({
      ...activity,
      productSelectionMode: mode,
      productScope: mode === 'exclude' ? 'partial' : activity.productScope,
      productIds: [],
      productItems: [],
    })
  }

  const changeProductScope = (scope: MemberPriceProductCoreFields['productScope']) => {
    resetListState()
    if (scope === 'all') {
      onChange({ ...activity, productScope: 'all', productIds: [], productItems: [] })
    } else {
      onChange({ ...activity, productScope: 'partial' })
    }
  }

  /** 清空列表内的检索、分页与勾选状态 */
  const resetListState = () => {
    setKeyword('')
    setPage(1)
    setCheckedIds([])
    setSelectAllVisible(false)
  }

  const applyProductIds = (ids: string[]) => {
    if (isExclude) {
      onChange({ ...activity, productIds: ids, productItems: [] })
    } else {
      onChange(syncProductItems(activity, ids))
    }
  }

  /** 从「选择商品」弹窗返回：清掉检索条件，否则新加的商品可能被关键词挡住 */
  const setProductIds = (ids: string[]) => {
    resetListState()
    applyProductIds(ids)
  }

  const changeKeyword = (next: string) => {
    setKeyword(next)
    setPage(1)
    // 筛选范围变了，勾选一并清空，避免批量操作误伤筛选外的商品
    setCheckedIds([])
    setSelectAllVisible(false)
  }

  const updateItemValue = (productId: string, value: number) => {
    update(
      'productItems',
      activity.productItems.map((item) => (item.productId === productId ? { ...item, value } : item)),
    )
  }

  /** 单条移除：保留当前检索条件与页码，方便连续处理同一批商品 */
  const removeProduct = (productId: string) => {
    setCheckedIds((prev) => prev.filter((id) => id !== productId))
    setSelectAllVisible(false)
    applyProductIds(activity.productIds.filter((id) => id !== productId))
  }

  const unitLabel = activity.priceMethod === 'discount' ? '折' : '元'
  const isExclude = activity.productSelectionMode === 'exclude'
  const itemLabel = isExclude ? '不参与商品' : '商品'
  const showUniformValue = activity.productScope === 'all' || (activity.productScope === 'partial' && isExclude)
  const selectedProducts = useMemo(
    () => products.filter((p) => activity.productIds.includes(p.id)),
    [activity.productIds],
  )
  const valueMap = new Map(activity.productItems.map((i) => [i.productId, i.value]))

  const filtering = keyword.trim().length > 0
  /** 关键词命中的已选商品，分页、勾选与批量操作都以这一批为作用域 */
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

  const clearSelection = () => {
    setSelectAllVisible(false)
    setCheckedIds([])
  }

  const keepCurrentPageOnly = () => {
    setSelectAllVisible(false)
    setCheckedIds([...pageIds])
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

  const checkedTargets = () => (selectAllVisible ? visibleProducts.map((p) => p.id) : checkedIds)

  const removeChecked = () => {
    const targets = checkedTargets()
    if (targets.length === 0) return
    const targetSet = new Set(targets)
    applyProductIds(activity.productIds.filter((id) => !targetSet.has(id)))
    setCheckedIds([])
    setSelectAllVisible(false)
    setShowBatchRemove(false)
    onToast?.(`已移除 ${targets.length} 个${itemLabel}`)
  }

  const applyBatchValue = () => {
    const num = Number(batchValue)
    if (!Number.isFinite(num) || batchValue.trim() === '') {
      onToast?.('请输入有效的批量设置数值')
      return
    }
    if (activity.priceMethod === 'discount' && (num <= 0 || num > 9.9)) {
      onToast?.('折扣须在 0.1～9.9 折之间')
      return
    }
    if (activity.priceMethod !== 'discount' && num < 0) {
      onToast?.('金额不能为负数')
      return
    }
    const targets = checkedTargets()
    if (targets.length === 0) {
      onToast?.('请先勾选要批量设置的商品')
      return
    }
    const targetSet = new Set(targets)
    update(
      'productItems',
      activity.productItems.map((item) => (targetSet.has(item.productId) ? { ...item, value: num } : item)),
    )
    setBatchValue('')
    setCheckedIds([])
    setSelectAllVisible(false)
    onToast?.(`已为 ${targets.length} 个商品批量设置`)
  }

  // 勾选列 + 商品/规格/价格 + 折扣价（正选）+ 操作
  const colSpan = (isExclude ? 3 : 4) + (readOnly ? 0 : 2)

  return (
    <>
      {showMemberLevels && (
        <FormRow label="选择会员卡" required>
          <div className="member-level-group">
            <label className="checkbox member-level-group__all">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={memberLevels.length === MEMBER_LEVELS.length}
                onChange={toggleAllLevels}
              />
              全选
            </label>
            <div className="checkbox-group checkbox-group--wrap">
              {MEMBER_LEVELS.map((level) => (
                <label key={level.id} className="checkbox">
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={memberLevels.includes(level.id)}
                    onChange={() => toggleLevel(level.id)}
                  />
                  {level.label}
                </label>
              ))}
            </div>
            <p className="field-hint">至少选择一个会员等级；选中的等级会员购买参与商品时可享受会员价。</p>
          </div>
        </FormRow>
      )}

      <FormRow label="会员折扣方式" required>
        <div>
          <RadioGroup
            disabled={readOnly}
            value={activity.priceMethod}
            options={[
              { value: 'discount', label: '折扣' },
              { value: 'fixed_reduction', label: '减价' },
              { value: 'special_price', label: '固定价格' },
            ]}
            onChange={(v) => changePriceMethod(v as MemberPriceMethod)}
          />
          <p className="field-hint">切换优惠方式后，已填写的会员价数值将按默认值重置。</p>
        </div>
      </FormRow>

      <FormRow label="商品加入方式">
        <RadioGroup
          disabled={readOnly}
          value={activity.productSelectionMode}
          options={[
            { value: 'include', label: '参与商品(正选)' },
            { value: 'exclude', label: '不参与商品(反选)' },
          ]}
          onChange={(v) => changeSelectionMode(v as MemberPriceProductCoreFields['productSelectionMode'])}
        />
      </FormRow>

      <FormRow label="商品范围" required>
        <RadioGroup
          disabled={readOnly || isExclude}
          value={activity.productScope}
          options={[
            { value: 'all', label: '全部商品' },
            { value: 'partial', label: '部分商品' },
          ]}
          onChange={(v) => changeProductScope(v as MemberPriceProductCoreFields['productScope'])}
        />
      </FormRow>

      {showUniformValue && (
        <FormRow label="优惠设置" required>
          <div>
            <div className="member-price-input">
              <span>{MEMBER_PRICE_METHOD_LABELS[activity.priceMethod]}</span>
              <input
                type="number"
                className="input input--num"
                disabled={readOnly}
                value={activity.allProductsValue}
                step={activity.priceMethod === 'discount' ? 0.1 : 0.01}
                min={0}
                max={activity.priceMethod === 'discount' ? 9.9 : undefined}
                onChange={(e) => update('allProductsValue', Number(e.target.value))}
              />
              <span>{unitLabel}</span>
            </div>
            <p className="field-hint">
              {isExclude
                ? '除下方所选不参与商品外，其余商品统一按该优惠值结算。'
                : '全部商品将统一按该优惠值结算；列表页不逐商品配置单价。'}
            </p>
          </div>
        </FormRow>
      )}

      {activity.productScope === 'partial' && (
        <>
          {!readOnly && (
            <div className="section-toolbar member-price-toolbar">
              <button type="button" className="btn btn--primary" onClick={() => setShowProductPicker(true)}>
                {isExclude ? '选择不参与商品' : '选择商品'}
              </button>
            </div>
          )}

          {selectedProducts.length > 0 && (
            <SelectedProductSearchBar
              keyword={keyword}
              onChange={changeKeyword}
              filteredCount={visibleProducts.length}
              totalCount={selectedProducts.length}
              itemLabel={itemLabel}
              scopeHint={
                readOnly
                  ? undefined
                  : isExclude
                    ? '筛选期间的勾选与移除仅对筛选结果生效。'
                    : '筛选期间的勾选、批量设置与移除仅对筛选结果生效，不会影响筛选外的商品。'
              }
            />
          )}

          {!readOnly && hasSelection && (
            <div className="table-selection-bar">
              <div className="table-selection-bar__meta">
                {selectAllVisible ? (
                  <span>
                    已选{filtering ? '筛选结果全部' : '全部'} <strong>{selectedCount}</strong> 条
                  </span>
                ) : (
                  <span>
                    已选 <strong>{selectedCount}</strong> 条
                    {allPageChecked && checkedIds.length === pageIds.length ? '（当前页）' : ''}
                  </span>
                )}
                {hasMultiplePages && !selectAllVisible && (
                  <button type="button" className="link-btn" onClick={selectAllAcrossPages}>
                    {filtering ? '全选筛选结果' : '全选全部'} {visibleProducts.length} 条
                  </button>
                )}
                {selectAllVisible && (
                  <button type="button" className="link-btn" onClick={keepCurrentPageOnly}>
                    仅保留当前页
                  </button>
                )}
                <button type="button" className="link-btn" onClick={clearSelection}>清空</button>
                <button
                  type="button"
                  className="link-btn link-btn--danger"
                  onClick={() => setShowBatchRemove(true)}
                >
                  批量移除
                </button>
              </div>
              {!isExclude && activity.productItems.length > 0 && (
                <div className="member-price-batch">
                  <span>批量设置</span>
                  <input
                    type="number"
                    className="input input--num"
                    value={batchValue}
                    placeholder={activity.priceMethod === 'discount' ? '如 8.5' : '如 9.9'}
                    onChange={(e) => setBatchValue(e.target.value)}
                    step={activity.priceMethod === 'discount' ? 0.1 : 0.01}
                    min={0}
                    max={activity.priceMethod === 'discount' ? 9.9 : undefined}
                  />
                  <span>{unitLabel}</span>
                  <button type="button" className="btn btn--default btn--sm" onClick={applyBatchValue}>
                    应用
                  </button>
                </div>
              )}
            </div>
          )}

          <table className="table member-price-table">
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
                <th>商品</th>
                <th>规格</th>
                <th>价格</th>
                {!isExclude && <th>折扣/价</th>}
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
                    ) : isExclude ? (
                      '暂无不参与商品，请点击「选择不参与商品」添加'
                    ) : (
                      '暂无商品，请点击「选择商品」添加'
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
                    <td>
                      <div className="order-product">
                        <div className="order-product__img order-product__img--sm" aria-hidden>
                          {p.image
                            ? <img src={p.image} alt="" />
                            : <span className="order-product__placeholder">QM</span>}
                        </div>
                        <div className="order-product__meta">
                          <div>{p.name}</div>
                          <div className="text-secondary mono">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.spec}</td>
                    <td>¥{p.price}</td>
                    {!isExclude && (
                      <td>
                        <div className="member-price-input">
                          <input
                            type="number"
                            className="input input--num"
                            disabled={readOnly}
                            value={valueMap.get(p.id) ?? ''}
                            step={activity.priceMethod === 'discount' ? 0.1 : 0.01}
                            min={0}
                            max={activity.priceMethod === 'discount' ? 9.9 : undefined}
                            onChange={(e) => updateItemValue(p.id, Number(e.target.value))}
                          />
                          <span>{unitLabel}</span>
                        </div>
                      </td>
                    )}
                    {!readOnly && (
                      <td>
                        <button type="button" className="link-btn" onClick={() => removeProduct(p.id)}>
                          删除
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
        </>
      )}

      {showBatchRemove && (
        <BatchRemoveConfirmModal
          count={selectedCount}
          filtering={filtering}
          itemLabel={itemLabel}
          extraNote={isExclude ? undefined : '已填写的会员价优惠值会一并清除。'}
          onCancel={() => setShowBatchRemove(false)}
          onConfirm={removeChecked}
        />
      )}

      {showProductPicker && (
        <ProductPicker
          selectedIds={activity.productIds}
          onChange={setProductIds}
          onClose={() => setShowProductPicker(false)}
          title={isExclude ? '选择不参与商品' : '选择商品'}
        />
      )}
    </>
  )
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{required && <span className="required">*</span>}{label}</label>
      <div className="form-control">{children}</div>
    </div>
  )
}

function RadioGroup({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input type="radio" disabled={disabled} checked={value === opt.value} onChange={() => onChange(opt.value)} />
          {opt.label}
        </label>
      ))}
    </div>
  )
}
