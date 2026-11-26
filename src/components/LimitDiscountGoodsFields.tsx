import { useMemo, useState } from 'react'
import { products } from '../mockData'
import type { LimitDiscountActivityForm, LimitDiscountMethod, LimitDiscountProductItem, LimitDiscountQuotaRule, Product } from '../types'
import { applyDiscountMethod, canRelaxLimitDiscountQuota, isProductDiscountSet, pruneSameAsDefault, sceneOverrides, setSceneOverride, sharedDiscountItem, syncProductItems, writeSharedDiscount } from '../utils/limitDiscountActivity'
import { resolveActivityProducts } from '../utils/activityProductSearch'
import { LimitDiscountProductQuotaDialog, LimitDiscountQuotaEditor, LimitDiscountQuotaSummary } from './LimitDiscountProductQuota'
import { LimitDiscountQuotaAdjustment } from './LimitDiscountQuotaAdjustment'
import { LimitDiscountStrengthControls, LimitDiscountStrengthDialog, type LimitDiscountStrengthChange } from './LimitDiscountProductStrength'
import { ProductPicker } from './ProductPicker'
import { SelectedProductPager } from './SelectedProductTools'
import { matchesProductKeyword } from '../utils/productSearch'
import { commonDiscountQuota, hasDiscountProductQuota, type LimitDiscountQuotaConfig } from '../utils/limitDiscountQuota'

interface LimitDiscountGoodsFieldsProps {
  activity: LimitDiscountActivityForm
  readOnly?: boolean
  published?: LimitDiscountActivityForm
  onChange: (activity: LimitDiscountActivityForm) => void
}

const GOODS_SCOPES = [
  { value: 'all', label: '全部商品', hint: '为全部参与规格统一设置' },
  { value: 'include', label: '指定商品', hint: '为所选规格单独或批量设置' },
  { value: 'exclude', label: '指定商品不参与', hint: '为排除名单外的规格统一设置' },
] as const

type QuotaFilter = 'all' | 'limited' | 'unlimited'
type RuleTarget = { ids?: string[]; businessOnly?: boolean }
type InlineRule = { kind: 'strength' | 'quota'; productId?: string }
const PAGE_SIZE = 20

export function LimitDiscountGoodsFields({ activity, readOnly, published, onChange }: LimitDiscountGoodsFieldsProps) {
  const [picking, setPicking] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [quotaFilter, setQuotaFilter] = useState<QuotaFilter>('all')
  const [onlyUnsetStrength, setOnlyUnsetStrength] = useState(false)
  const [page, setPage] = useState(1)
  const [checked, setChecked] = useState<string[]>([])
  const [quotaTarget, setQuotaTarget] = useState<(RuleTarget & { initialCommon?: LimitDiscountQuotaRule }) | null>(null)
  const [adjustmentTarget, setAdjustmentTarget] = useState<{ productId?: string } | null>(null)
  const [previousDefaultQuota, setPreviousDefaultQuota] = useState<LimitDiscountQuotaRule>()
  const [strengthTarget, setStrengthTarget] = useState<RuleTarget | null>(null)
  const [inlineRule, setInlineRule] = useState<InlineRule | null>(null)
  const { discountMethod } = activity
  const perProduct = activity.goodsScope === 'include'
  const productCount = activity.productItems.length
  const scenes = activity.orderTypes
  const sharedItem = sharedDiscountItem(activity)
  const defaultQuotaHint = activity.goodsScope === 'exclude'
    ? productCount > 0 ? `排除 ${productCount} 个规格后，余下参与规格分别计数。` : '适用于排除名单外的参与规格，各规格分别计数。'
    : '适用于全部参与规格，各规格分别计数。'
  const publishedItems = new Map(published?.productItems.map((item) => [item.productId, item]))
  const fixedIds = published ? [...publishedItems.keys()] : undefined
  const itemLocked = (id: string) => Boolean(readOnly || publishedItems.has(id))
  const sharedLocked = readOnly || Boolean(published)
  const canAdjustQuota = !readOnly && published != null && canRelaxLimitDiscountQuota(published)
  const canPick = !readOnly && (!published || perProduct)
  const pickerLabel = published ? '追加商品' : perProduct ? '选择商品' : '选择排除商品'
  const strengthIds = strengthTarget?.ids
  const quotaIds = quotaTarget?.ids
  const strengthItem = targetItem(strengthIds)
  const quotaItem = targetItem(quotaIds)
  const adjustmentItem = adjustmentTarget && targetItem(adjustmentTarget.productId == null ? undefined : [adjustmentTarget.productId])
  const savedAdjustmentItem = adjustmentTarget && savedQuotaItem(adjustmentTarget.productId)

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return activity.productItems
      .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
      .filter((row) => row.product && (
        matchesProductKeyword(row.product, kw)
        || row.product.identifier.toLowerCase().includes(kw)
        || row.product.barcode.toLowerCase().includes(kw)
        || row.product.specCode.toLowerCase().includes(kw)
      ) && (!perProduct || (
        (!onlyUnsetStrength || !isProductDiscountSet({ discountMethod }, row.item))
        && (quotaFilter === 'all' || hasDiscountProductQuota(row.item, scenes) === (quotaFilter === 'limited'))
      )))
  }, [activity.productItems, discountMethod, keyword, onlyUnsetStrength, perProduct, quotaFilter, scenes])

  const setCount = activity.productItems.filter((item) => isProductDiscountSet(activity, item)).length
  const unsetStrengthCount = productCount - setCount
  const quotaCount = perProduct ? activity.productItems.filter((item) => hasDiscountProductQuota(item, scenes)).length : 0
  const batchQuotaCount = activity.productItems.filter((item) => quotaIds?.includes(item.productId) && hasDiscountProductQuota(item, scenes)).length
  const filtered = Boolean(keyword.trim() || perProduct && (quotaFilter !== 'all' || onlyUnsetStrength))
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectableIds = rows.map(({ item }) => item.productId).filter((id) => !itemLocked(id))
  const pageSelectableIds = pageRows.map(({ item }) => item.productId).filter((id) => !itemLocked(id))
  const checkedIds = new Set(checked)
  const pageCheckedCount = pageSelectableIds.filter((id) => checkedIds.has(id)).length
  const allPageChecked = pageSelectableIds.length > 0 && pageCheckedCount === pageSelectableIds.length
  const matchedCheckedCount = selectableIds.filter((id) => checkedIds.has(id)).length
  const otherPageCount = matchedCheckedCount - pageCheckedCount
  const outsideFilterCount = checked.length - matchedCheckedCount
  const hasSelection = checked.length > 0
  const canSelectAllMatches = matchedCheckedCount < selectableIds.length

  function clearFilters() {
    setKeyword('')
    setQuotaFilter('all')
    setOnlyUnsetStrength(false)
    setPage(1)
    setInlineRule(null)
  }

  function changeScope(goodsScope: LimitDiscountActivityForm['goodsScope']) {
    clearFilters()
    setChecked([])
    onChange({ ...activity, goodsScope })
  }

  function targetItem(ids?: string[]) {
    if (!ids) return sharedItem
    if (ids.length === 1) return activity.productItems.find(({ productId }) => productId === ids[0])
  }

  function savedQuotaItem(productId?: string) {
    return productId != null ? publishedItems.get(productId) : published && sharedDiscountItem(published)
  }

  function updateProducts(ids: string[], update: (item: LimitDiscountProductItem) => LimitDiscountProductItem) {
    if (readOnly) return
    const selectedIds = new Set(ids)
    onChange({
      ...activity,
      productItems: activity.productItems.map((item) => selectedIds.has(item.productId) && !itemLocked(item.productId)
        ? update(item) : item),
    })
    if (ids.length > 1) setChecked([])
  }

  function saveStrength(change: LimitDiscountStrengthChange, ids?: string[]) {
    if (ids) {
      updateProducts(ids, (item) => applyStrengthChange(item, change))
    } else if (!sharedLocked) {
      onChange(writeSharedDiscount(activity, applyStrengthChange(sharedItem, change)))
    }
    setInlineRule(null)
  }

  function saveQuota(config: LimitDiscountQuotaConfig, ids?: string[]) {
    if (ids) {
      updateProducts(ids, (item) => ({ ...item, ...structuredClone(config) }))
    } else if (!sharedLocked) {
      const before = commonDiscountQuota(sharedItem)
      const after = commonDiscountQuota(config)
      if ((before.total != null || before.periodic) && after.total == null && !after.periodic) setPreviousDefaultQuota(before)
      onChange({ ...activity, activityStock: config.stock, activityQuota: config.quota })
    }
    setInlineRule(null)
  }

  function renderStrength(item: LimitDiscountProductItem, locked: boolean, productId?: string) {
    const ids = productId == null ? undefined : [productId]
    return <LimitDiscountStrengthControls activity={activity} item={item} readOnly={locked}
      editing={inlineRule?.kind === 'strength' && inlineRule.productId === productId}
      onEdit={() => setInlineRule({ kind: 'strength', productId })} onCancel={() => setInlineRule(null)}
      onApply={(value) => saveStrength({ defaultValue: value, business: {} }, ids)}
      onOpenBusiness={() => {
        setInlineRule(null)
        setStrengthTarget({ ids, businessOnly: true })
      }} />
  }

  function renderQuota(item: LimitDiscountQuotaConfig, locked: boolean, productId?: string) {
    if (locked) {
      const original = savedQuotaItem(productId)
      return (
        <div className="ld-quota-locked">
          <LimitDiscountQuotaSummary item={item} scenes={scenes} />
          {canAdjustQuota && original && hasDiscountProductQuota(original, scenes) && (
            <button type="button" className="link-btn ld-inline-rule__business" aria-haspopup="dialog"
              onClick={() => { setInlineRule(null); setAdjustmentTarget({ productId }) }}>
              调整限量
            </button>
          )}
        </div>
      )
    }
    const ids = productId == null ? undefined : [productId]
    return <LimitDiscountQuotaEditor item={item} scenes={scenes}
      editorPreset={productId == null ? previousDefaultQuota : undefined}
      editing={inlineRule?.kind === 'quota' && inlineRule.productId === productId}
      onEdit={() => setInlineRule({ kind: 'quota', productId })} onCancel={() => setInlineRule(null)}
      onApply={(config) => saveQuota(config, ids)}
      onOpenBusiness={(initialCommon) => {
        if (!initialCommon) setInlineRule(null)
        setQuotaTarget({ ids, businessOnly: true, initialCommon })
      }} />
  }

  return (
    <>
      <FormRow label="参与商品" required>
        <div className="ld-goods-scope" role="radiogroup" aria-label="参与商品范围">
          {GOODS_SCOPES.map(({ value, label, hint }) => (
            <label className="ld-goods-scope__option" key={value}>
              <input type="radio" name="ld-goods-scope" aria-label={label} disabled={sharedLocked}
                checked={activity.goodsScope === value} onChange={() => changeScope(value)} />
              <span><strong>{label}</strong><small>{hint}</small></span>
            </label>
          ))}
        </div>
        {published && (
          <p className="field-hint">{canAdjustQuota
            ? '进行中可提高或取消已有的商品限量。已投放商品的优惠力度已锁定，指定商品仍可追加。'
            : '已投放商品的优惠和限量已锁定。指定商品仍可追加。'}</p>
        )}
      </FormRow>
      <FormRow label="优惠方式" required>
        <div className="radio-group">
          {([
            ['discount', '折扣'],
            ['reduce', '减价'],
            ['special_price', '指定价格'],
          ] as const).map(([value, label]) => (
            <label key={value} className="radio">
              <input type="radio" disabled={sharedLocked} checked={activity.discountMethod === value} onChange={() => {
                setInlineRule(null)
                onChange(applyDiscountMethod(activity, value as LimitDiscountMethod))
              }} />
              {label}
            </label>
          ))}
        </div>
      </FormRow>
      {!perProduct && (
        <>
          <FormRow label="优惠力度" required>
            <div className="ld-rule-scope">
              <p className="ld-rule-scope__hint">{activity.goodsScope === 'exclude' ? '适用于排除名单外的参与规格。' : '适用于全部参与规格。'}</p>
              {renderStrength(sharedItem, sharedLocked)}
            </div>
          </FormRow>
          <FormRow label="商品优惠限量">
            <div className="ld-rule-scope">
              <p className="ld-rule-scope__hint">{defaultQuotaHint}</p>
              {renderQuota(sharedItem, sharedLocked)}
            </div>
          </FormRow>
        </>
      )}

      {activity.goodsScope !== 'all' && (
        <>
          <div className="ld-goods-list__head">
            <div>
              <h4>{perProduct ? '参与商品清单' : '排除商品清单'}</h4>
              <span>{productCount} 个规格{perProduct && ` · ${setCount} 个已设优惠 · ${quotaCount} 个已设限量`}</span>
            </div>
            {canPick && <button type="button" className="btn btn--primary" onClick={() => setPicking(true)}>{pickerLabel}</button>}
          </div>
          {productCount > 0 && (
            <div className="ld-goods-tools">
              <input className="input input--filter" type="search" aria-label="搜索清单商品" placeholder="搜索名称、ID、编码、标识或条码"
                value={keyword} onChange={(event) => {
                  setKeyword(event.currentTarget.value)
                  setPage(1)
                  setInlineRule(null)
                }} />
              {perProduct && (
                <>
                  <select className="input select" aria-label="筛选限量状态" value={quotaFilter} onChange={(event) => {
                    setQuotaFilter(event.currentTarget.value as QuotaFilter)
                    setPage(1)
                    setInlineRule(null)
                  }}>
                    <option value="all">全部限量状态</option>
                    <option value="limited">已设限量</option>
                    <option value="unlimited">不限量</option>
                  </select>
                  <label className="checkbox" title="显示默认优惠力度未填写或待修正的规格">
                    <input type="checkbox" aria-label="仅看未设置优惠力度" checked={onlyUnsetStrength}
                      onChange={(event) => {
                        setOnlyUnsetStrength(event.currentTarget.checked)
                        setPage(1)
                        setInlineRule(null)
                      }} />
                    <span>仅看未设置优惠力度（{unsetStrengthCount}）</span>
                  </label>
                </>
              )}
            </div>
          )}
          {perProduct && !readOnly && (selectableIds.length > 0 || hasSelection) && (
            <div className={`ld-goods-selection${hasSelection ? ' ld-goods-selection--active' : ''}`}>
              <div className="ld-goods-selection__scope">
                <div className="ld-goods-selection__status" role="status">
                  {hasSelection ? (
                    <>
                      <strong>已选 {checked.length} 个规格</strong>
                      {otherPageCount > 0 && <span className="ld-goods-selection__detail">含其他页 {otherPageCount} 个</span>}
                      {outsideFilterCount > 0 && (
                        <span className="ld-goods-selection__detail ld-goods-selection__detail--warning">
                          筛选外的 {outsideFilterCount} 个已选规格也会应用批量设置
                        </span>
                      )}
                    </>
                  ) : '勾选规格后可批量设置'}
                </div>
                {hasSelection && (
                  <div className="ld-goods-selection__controls">
                    {canSelectAllMatches && (
                      <button type="button" className="link-btn" onClick={() => setChecked((ids) => [...new Set([...ids, ...selectableIds])])}>
                        {filtered ? `全选筛选结果（${selectableIds.length}）` : `全选 ${selectableIds.length} 个规格`}
                      </button>
                    )}
                    <button type="button" className="link-btn ld-goods-selection__clear" onClick={() => setChecked([])}>清空选择</button>
                  </div>
                )}
              </div>
              <div className="ld-goods-selection__actions">
                <button type="button" className="btn btn--default btn--sm" aria-haspopup="dialog" disabled={!hasSelection}
                  onClick={() => setStrengthTarget({ ids: checked })}>
                  批量设置优惠力度
                </button>
                <button type="button" className="btn btn--default btn--sm" aria-haspopup="dialog" disabled={!hasSelection}
                  onClick={() => setQuotaTarget({ ids: checked })}>
                  批量设置优惠限量
                </button>
              </div>
            </div>
          )}
          <div className="table-wrap ld-goods-table">
            <table className="table">
              <thead>
                <tr>
                  {perProduct && !readOnly && (
                    <th style={{ width: 36 }}>
                      <input type="checkbox" aria-label="全选当前页可编辑规格" disabled={pageSelectableIds.length === 0}
                        checked={allPageChecked}
                        ref={(input) => { if (input) input.indeterminate = pageCheckedCount > 0 && !allPageChecked }}
                        onChange={(event) => {
                          const select = event.currentTarget.checked
                          setChecked((ids) => select
                            ? [...new Set([...ids, ...pageSelectableIds])]
                            : ids.filter((id) => !pageSelectableIds.includes(id)))
                        }} />
                    </th>
                  )}
                  <th>商品名称</th>
                  <th>规格</th>
                  <th>商品信息</th>
                  <th>销售价</th>
                  {perProduct && <th className="ld-strength-cell">优惠力度</th>}
                  {perProduct && <th className="ld-quota-cell">商品优惠限量</th>}
                  {!readOnly && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={perProduct ? (readOnly ? 6 : 8) : (readOnly ? 4 : 5)}>
                      <div className="table-empty-state">
                        <p className="table-empty-state__title">{onlyUnsetStrength && productCount > 0 && unsetStrengthCount === 0 ? '优惠力度已全部设置'
                          : filtered ? '未找到匹配商品' : perProduct ? '尚未选择参与商品' : '尚未添加排除商品'}</p>
                        {filtered && <button type="button" className="link-btn" onClick={clearFilters}>清除筛选</button>}
                        {!filtered && canPick && <button type="button" className="link-btn" onClick={() => setPicking(true)}>{perProduct ? '立即选择商品' : '添加排除商品'}</button>}
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map(({ item, product }) => product && (
                  <tr key={item.productId}>
                    {perProduct && !readOnly && (
                      <td>
                        <input type="checkbox" aria-label={`勾选${product.name}`} disabled={itemLocked(item.productId)} checked={checked.includes(item.productId)}
                          onChange={() => setChecked((ids) => ids.includes(item.productId) ? ids.filter((id) => id !== item.productId) : [...ids, item.productId])} />
                      </td>
                    )}
                    <td>
                      <div>{product.name}</div>
                      <div className="text-secondary mono ld-goods-table__id">SPU_ID：{product.id}</div>
                    </td>
                    <td>
                      <div>{!product.spec || product.spec === '--' ? '—' : product.spec}</div>
                      <div className="text-secondary mono ld-goods-table__id">SKU_ID：{product.skuId}</div>
                    </td>
                    <td><ProductInformation product={product} /></td>
                    <td>¥{product.price}</td>
                    {perProduct && (
                      <td className="ld-strength-cell">
                        {renderStrength(item, itemLocked(item.productId), item.productId)}
                        {discountMethod === 'special_price' && overPrice(activity, item, product.price) && (
                          <p className="field-hint">有力度高于门店售价，按门店售价生效</p>
                        )}
                      </td>
                    )}
                    {perProduct && (
                      <td className="ld-quota-cell">
                        {renderQuota(item, itemLocked(item.productId), item.productId)}
                      </td>
                    )}
                    {!readOnly && (
                      <td className="ld-goods-table__action">
                        {itemLocked(item.productId) ? '已锁定' : (
                          <button type="button" className="link-btn" onClick={() => {
                            if (inlineRule?.productId === item.productId) setInlineRule(null)
                            setChecked((ids) => ids.filter((id) => id !== item.productId))
                            onChange(syncProductItems(activity, activity.productItems.filter((row) => row.productId !== item.productId).map((row) => row.productId)))
                          }}>{perProduct ? '取消参与' : '移出名单'}</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {productCount > 0 && (
            <SelectedProductPager total={rows.length} pageSize={PAGE_SIZE} currentPage={currentPage} totalPages={totalPages}
              onChange={(value) => { setInlineRule(null); setPage(value) }} filtering={filtered} />
          )}
        </>
      )}
      {activity.discountMethod === 'special_price' && <p className="field-hint">特价最高按门店售价执行。</p>}
      {picking && (
        <ProductPicker
          title={pickerLabel}
          hiddenProductIds={fixedIds}
          selectedIds={activity.productItems.map((item) => item.productId).filter((id) => !fixedIds?.includes(id))}
          onChange={(ids) => {
            clearFilters()
            setChecked([])
            onChange(syncProductItems(activity, [...(fixedIds ?? []), ...ids]))
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {strengthTarget && (
        <LimitDiscountStrengthDialog
          activity={activity}
          item={strengthItem}
          description={strengthIds ? productDescription(strengthItem) : activity.goodsScope === 'exclude' ? '排除名单外的参与规格' : '全部参与规格'}
          productCount={strengthIds?.length}
          businessOnly={strengthTarget.businessOnly}
          readOnly={strengthIds ? Boolean(readOnly || strengthItem && itemLocked(strengthItem.productId)) : sharedLocked}
          onConfirm={(change) => {
            saveStrength(change, strengthIds)
            setStrengthTarget(null)
          }}
          onClose={() => setStrengthTarget(null)}
        />
      )}
      {quotaTarget && (
        <LimitDiscountProductQuotaDialog
          item={quotaItem}
          goodsScope={activity.goodsScope}
          description={quotaIds ? productDescription(quotaItem) : defaultQuotaHint}
          scenes={scenes}
          productCount={quotaIds?.length}
          configuredCount={batchQuotaCount}
          businessOnly={quotaTarget.businessOnly}
          initialCommon={quotaTarget.initialCommon}
          readOnly={quotaIds ? Boolean(readOnly || quotaItem && itemLocked(quotaItem.productId)) : sharedLocked}
          onConfirm={(config) => {
            saveQuota(config, quotaIds)
            setQuotaTarget(null)
          }}
          onClose={() => setQuotaTarget(null)}
        />
      )}
      {canAdjustQuota && adjustmentTarget && adjustmentItem && savedAdjustmentItem && (
        <LimitDiscountQuotaAdjustment
          item={adjustmentItem}
          saved={savedAdjustmentItem}
          description={adjustmentTarget.productId == null
            ? `${activity.goodsScope === 'exclude' ? '排除名单外的参与规格' : '全部参与规格'} · 当前影响 ${resolveActivityProducts({
                productScope: activity.goodsScope === 'all' ? 'all' : 'partial',
                productSelectionMode: 'exclude',
                productIds: activity.productItems.map(({ productId }) => productId),
              }).length} 个规格`
            : `${productDescription(adjustmentItem) ?? '所选规格'} · 影响 1 个规格`}
          scenes={scenes}
          onApply={(config) => {
            if (adjustmentTarget.productId == null) {
              onChange({ ...activity, activityStock: config.stock, activityQuota: config.quota })
            } else {
              onChange({ ...activity, productItems: activity.productItems.map((item) =>
                item.productId === adjustmentTarget.productId ? { ...item, ...config } : item) })
            }
            setAdjustmentTarget(null)
          }}
          onClose={() => setAdjustmentTarget(null)}
        />
      )}
    </>
  )
}

function productDescription(item?: LimitDiscountProductItem) {
  const product = item && products.find(({ id }) => id === item.productId)
  if (product) return product.spec === '--' ? product.name : `${product.name} · ${product.spec}`
}

function ProductInformation({ product }: { product: Product }) {
  const fields = [
    { label: '商品标识', value: product.identifier },
    { label: '商品条码', value: product.barcode },
    { label: '规格码', value: product.specCode },
  ]

  if (fields.every(({ value }) => !value || value === '--')) return <span className="text-secondary">—</span>

  return (
    <dl className="ld-goods-table__info">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="mono">{!value || value === '--' ? '—' : value}</dd>
        </div>
      ))}
    </dl>
  )
}

function applyStrengthChange(item: LimitDiscountProductItem, { defaultValue, business }: LimitDiscountStrengthChange) {
  let next = { ...item, discountValue: defaultValue === undefined ? item.discountValue : defaultValue }
  for (const [scene, value] of Object.entries(business)) next = setSceneOverride(next, scene, value)
  return pruneSameAsDefault(next)
}

function overPrice(activity: LimitDiscountActivityForm, item: LimitDiscountProductItem, salePrice: number): boolean {
  if (item.discountValue != null && item.discountValue > salePrice) return true
  return sceneOverrides(activity, item).some(({ value }) => value > salePrice)
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{required && <span className="required">*</span>}{label}</label>
      <div className="form-control">{children}</div>
    </div>
  )
}
