import { useEffect, useMemo, useState } from 'react'
import { MEMBER_LEVELS, products } from '../mockData'
import { MEMBER_PRICE_METHOD_LABELS } from '../mockMemberPriceData'
import type { MemberLevelId, MemberPriceActivityForm, MemberPriceMethod } from '../types'
import { defaultValueForMethod, syncProductItems } from '../utils/memberPriceActivity'
import { ProductPicker } from './ProductPicker'
import { TableSelectHeader } from './TableSelectHeader'

const PAGE_SIZE = 20

interface MemberPriceProductConfigProps {
  activity: MemberPriceActivityForm
  readOnly?: boolean
  onChange: (activity: MemberPriceActivityForm) => void
  onToast?: (message: string) => void
}

export function MemberPriceProductConfig({ activity, readOnly, onChange, onToast }: MemberPriceProductConfigProps) {
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [batchValue, setBatchValue] = useState('')
  const [page, setPage] = useState(1)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [selectAllProducts, setSelectAllProducts] = useState(false)

  const update = <K extends keyof MemberPriceActivityForm>(key: K, value: MemberPriceActivityForm[K]) => {
    onChange({ ...activity, [key]: value })
  }

  const toggleLevel = (id: MemberLevelId) => {
    const next = activity.memberLevels.includes(id)
      ? activity.memberLevels.filter((x) => x !== id)
      : [...activity.memberLevels, id]
    update('memberLevels', next)
  }

  const toggleAllLevels = () => {
    if (activity.memberLevels.length === MEMBER_LEVELS.length) {
      update('memberLevels', [])
    } else {
      update('memberLevels', MEMBER_LEVELS.map((l) => l.id))
    }
  }

  const changePriceMethod = (method: MemberPriceMethod) => {
    const next = syncProductItems(
      { ...activity, priceMethod: method, allProductsValue: defaultValueForMethod(method) },
      activity.productIds,
      true,
    )
    onChange(next)
  }

  const changeSelectionMode = (mode: MemberPriceActivityForm['productSelectionMode']) => {
    if (mode === activity.productSelectionMode) return
    setPage(1)
    setCheckedIds([])
    setSelectAllProducts(false)
    onChange({
      ...activity,
      productSelectionMode: mode,
      productScope: mode === 'exclude' ? 'partial' : activity.productScope,
      productIds: [],
      productItems: [],
    })
  }

  const changeProductScope = (scope: MemberPriceActivityForm['productScope']) => {
    setPage(1)
    setCheckedIds([])
    setSelectAllProducts(false)
    if (scope === 'all') {
      onChange({ ...activity, productScope: 'all', productIds: [], productItems: [] })
    } else {
      onChange({ ...activity, productScope: 'partial' })
    }
  }

  const setProductIds = (ids: string[]) => {
    setPage(1)
    setCheckedIds([])
    setSelectAllProducts(false)
    if (isExclude) {
      onChange({ ...activity, productIds: ids, productItems: [] })
    } else {
      onChange(syncProductItems(activity, ids))
    }
  }

  const updateItemValue = (productId: string, value: number) => {
    update(
      'productItems',
      activity.productItems.map((item) => (item.productId === productId ? { ...item, value } : item)),
    )
  }

  const removeProduct = (productId: string) => {
    setProductIds(activity.productIds.filter((id) => id !== productId))
  }

  const unitLabel = activity.priceMethod === 'discount' ? '折' : '元'
  const isExclude = activity.productSelectionMode === 'exclude'
  const showUniformValue = activity.productScope === 'all' || (activity.productScope === 'partial' && isExclude)
  const selectedProducts = useMemo(
    () => products.filter((p) => activity.productIds.includes(p.id)),
    [activity.productIds],
  )
  const valueMap = new Map(activity.productItems.map((i) => [i.productId, i.value]))

  const totalPages = Math.max(1, Math.ceil(selectedProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = selectedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const pageIds = pageRows.map((p) => p.id)
  const rangeStart = selectedProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, selectedProducts.length)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const allPageChecked = pageIds.length > 0 && pageIds.every((id) => checkedIds.includes(id) || selectAllProducts)
  const somePageChecked = pageIds.some((id) => checkedIds.includes(id) || selectAllProducts)
  const pageCheckState: 'none' | 'some' | 'all' = selectAllProducts || allPageChecked
    ? 'all'
    : somePageChecked
      ? 'some'
      : 'none'
  const hasSelection = selectAllProducts || checkedIds.length > 0
  const selectedCount = selectAllProducts ? selectedProducts.length : checkedIds.length
  const hasMultiplePages = selectedProducts.length > PAGE_SIZE

  const selectCurrentPage = () => {
    setSelectAllProducts(false)
    setCheckedIds((prev) => [...new Set([...prev.filter((id) => !pageIds.includes(id)), ...pageIds])])
  }

  const selectAllAcrossPages = () => {
    setSelectAllProducts(true)
    setCheckedIds(selectedProducts.map((p) => p.id))
  }

  const clearSelection = () => {
    setSelectAllProducts(false)
    setCheckedIds([])
  }

  const keepCurrentPageOnly = () => {
    setSelectAllProducts(false)
    setCheckedIds([...pageIds])
  }

  const togglePageCheck = () => {
    if (selectAllProducts || allPageChecked) {
      setSelectAllProducts(false)
      setCheckedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
      return
    }
    selectCurrentPage()
  }

  const toggleOneCheck = (id: string) => {
    setSelectAllProducts(false)
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
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
    const targets = selectAllProducts
      ? selectedProducts.map((p) => p.id)
      : checkedIds
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
    setSelectAllProducts(false)
    onToast?.(`已为 ${targets.length} 个商品批量设置`)
  }

  const colSpan = (isExclude ? 3 : 4) + (readOnly ? 0 : 1) + (!readOnly && !isExclude ? 1 : 0)

  return (
    <>
      <FormRow label="选择会员卡" required>
        <div className="member-level-group">
          <label className="checkbox member-level-group__all">
            <input
              type="checkbox"
              disabled={readOnly}
              checked={activity.memberLevels.length === MEMBER_LEVELS.length}
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
                  checked={activity.memberLevels.includes(level.id)}
                  onChange={() => toggleLevel(level.id)}
                />
                {level.label}
              </label>
            ))}
          </div>
          <p className="field-hint">至少选择一个会员等级；选中的等级会员购买参与商品时可享受会员价。</p>
        </div>
      </FormRow>

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
          onChange={(v) => changeSelectionMode(v as MemberPriceActivityForm['productSelectionMode'])}
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
          onChange={(v) => changeProductScope(v as MemberPriceActivityForm['productScope'])}
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

          {!readOnly && !isExclude && hasSelection && (
            <div className="table-selection-bar">
              <div className="table-selection-bar__meta">
                {selectAllProducts ? (
                  <span>已选全部 <strong>{selectedCount}</strong> 条</span>
                ) : (
                  <span>
                    已选 <strong>{selectedCount}</strong> 条
                    {allPageChecked && checkedIds.length === pageIds.length ? '（当前页）' : ''}
                  </span>
                )}
                {hasMultiplePages && !selectAllProducts && (
                  <button type="button" className="link-btn" onClick={selectAllAcrossPages}>
                    全选全部 {selectedProducts.length} 条
                  </button>
                )}
                {selectAllProducts && (
                  <button type="button" className="link-btn" onClick={keepCurrentPageOnly}>
                    仅保留当前页
                  </button>
                )}
                <button type="button" className="link-btn" onClick={clearSelection}>清空</button>
              </div>
              {activity.productItems.length > 0 && (
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
                {!readOnly && !isExclude && (
                  <th style={{ width: 88 }}>
                    <TableSelectHeader
                      checkState={pageCheckState}
                      disabled={pageIds.length === 0}
                      pageCount={pageIds.length}
                      totalCount={selectedProducts.length}
                      hasMultiplePages={hasMultiplePages}
                      onTogglePage={togglePageCheck}
                      onSelectPage={selectCurrentPage}
                      onSelectAll={selectAllAcrossPages}
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
              {selectedProducts.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="table-empty">
                    {isExclude
                      ? '暂无不参与商品，请点击「选择不参与商品」添加'
                      : '暂无商品，请点击「选择商品」添加'}
                  </td>
                </tr>
              ) : (
                pageRows.map((p) => (
                  <tr key={p.id}>
                    {!readOnly && !isExclude && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectAllProducts || checkedIds.includes(p.id)}
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

          {selectedProducts.length > 0 && (
            <div className="pagination pagination--full">
              <span>共 {selectedProducts.length} 条，当前第 {rangeStart}–{rangeEnd} 条</span>
              {selectedProducts.length > PAGE_SIZE && (
                <div className="pagination__pages">
                  <button type="button" className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
                  <span className="page-indicator">{currentPage} / {totalPages}</span>
                  <button type="button" className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
                </div>
              )}
            </div>
          )}
        </>
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
