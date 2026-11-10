import { useMemo, useState } from 'react'
import { products } from '../mockData'
import type { LimitDiscountActivityForm, LimitDiscountMethod, LimitDiscountProductItem } from '../types'
import { applyDiscountMethod, discountUnit, discountValueLabel, isProductDiscountSet, isSameAsDefault, pruneSameAsDefault, sceneLabel, sceneOverrides, setSceneOverride, sharedDiscountItem, syncProductItems, writeSharedDiscount } from '../utils/limitDiscountActivity'
import { ProductPicker } from './ProductPicker'
import { matchesProductKeyword } from '../utils/productSearch'

interface LimitDiscountGoodsFieldsProps {
  activity: LimitDiscountActivityForm
  readOnly?: boolean
  onChange: (activity: LimitDiscountActivityForm) => void
}

export function LimitDiscountGoodsFields({ activity, readOnly, onChange }: LimitDiscountGoodsFieldsProps) {
  const [picking, setPicking] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const [batchValue, setBatchValue] = useState('')
  const [batchStock, setBatchStock] = useState('')
  const [batchScenes, setBatchScenes] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingShared, setEditingShared] = useState(false)
  const valueLabel = discountValueLabel(activity.discountMethod)
  const unit = discountUnit(activity.discountMethod)
  const perProduct = activity.goodsScope === 'include'
  const scenes = activity.orderTypes
  const sharedItem = sharedDiscountItem(activity)

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return activity.productItems
      .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
      .filter((row) => row.product && (
        matchesProductKeyword(row.product, kw)
        || row.product.identifier.toLowerCase().includes(kw)
        || row.product.barcode.toLowerCase().includes(kw)
      ))
  }, [activity.productItems, keyword])

  const setCount = activity.productItems.filter((item) => isProductDiscountSet(activity, item)).length

  const updateItem = (productId: string, patch: Partial<LimitDiscountProductItem>) => {
    onChange({
      ...activity,
      productItems: activity.productItems.map((item) => item.productId === productId ? { ...item, ...patch } : item),
    })
  }

  const applyBatchDefault = () => {
    const value = batchValue.trim() === '' ? null : Number(batchValue)
    if (value == null || Number.isNaN(value)) return
    const ids = new Set(checked)
    onChange({
      ...activity,
      productItems: activity.productItems.map((item) => (
        ids.has(item.productId) ? pruneSameAsDefault({ ...item, discountValue: value }) : item
      )),
    })
    setBatchValue('')
  }

  const applyBatchStock = () => {
    const stock = batchStock.trim() === '' ? null : Number(batchStock)
    const ids = new Set(checked)
    onChange({
      ...activity,
      productItems: activity.productItems.map((item) => ids.has(item.productId) ? { ...item, stock } : item),
    })
    setChecked([])
    setBatchStock('')
  }

  return (
    <>
      <FormRow label="优惠方式" required>
        <div className="radio-group">
          {([
            ['discount', '折扣'],
            ['reduce', '减价'],
            ['special_price', '指定价格'],
          ] as const).map(([value, label]) => (
            <label key={value} className="radio">
              <input type="radio" disabled={readOnly} checked={activity.discountMethod === value} onChange={() => onChange(applyDiscountMethod(activity, value as LimitDiscountMethod))} />
              {label}
            </label>
          ))}
        </div>
      </FormRow>
      <FormRow label="优惠力度" required>
        <p className="field-hint">
          {perProduct
            ? '每个商品填一个默认力度，所有业务都按它执行。个别业务需要不同力度时，点「分业务设置」单独填写，没填的业务仍按默认力度。'
            : activity.goodsScope === 'exclude'
              ? '余下商品共用一个默认力度，所有业务都按它执行。个别业务需要不同力度时，点「分业务设置」单独填写，没填的业务仍按默认力度。'
              : '全部商品共用一个默认力度，所有业务都按它执行。个别业务需要不同力度时，点「分业务设置」单独填写，没填的业务仍按默认力度。'}
        </p>
        {scenes.length === 0 && (
          <p className="field-hint">分业务设置前，请先在基础信息里选择参与业务/场景。</p>
        )}
      </FormRow>
      <FormRow label="参与商品" required>
        <div className="radio-group">
          {([
            ['all', '全部商品'],
            ['include', '指定商品'],
            ['exclude', '指定商品不参与'],
          ] as const).map(([value, label]) => (
            <label key={value} className="radio">
              <input type="radio" disabled={readOnly} checked={activity.goodsScope === value} onChange={() => { setKeyword(''); setChecked([]); onChange({ ...activity, goodsScope: value }) }} />
              {label}
            </label>
          ))}
        </div>
      </FormRow>

      {activity.goodsScope !== 'include' && (
        <>
          <FormRow label={activity.goodsScope === 'exclude' ? `余下商品${valueLabel}` : valueLabel} required>
            <div className="ld-item-mode">
              <div className="ld-item-mode__main">
                <input
                  className="input"
                  style={{ width: 88 }}
                  type="number"
                  min={activity.discountMethod === 'discount' ? 0.1 : 0.01}
                  max={activity.discountMethod === 'discount' ? 9.9 : undefined}
                  step={activity.discountMethod === 'discount' ? 0.1 : 0.01}
                  disabled={readOnly}
                  aria-label={`默认${valueLabel}`}
                  value={activity.discountValue ?? ''}
                  onChange={(e) => onChange(writeSharedDiscount(activity, { discountValue: e.target.value === '' ? null : Number(e.target.value) }))}
                />
                <span className="field-hint">{unit}</span>
                {(!readOnly || sceneOverrides(activity, sharedItem).length > 0) && (
                  <button
                    type="button"
                    className="link-btn"
                    disabled={scenes.length === 0}
                    title={scenes.length === 0 ? '请先在基础信息里选择参与业务/场景' : undefined}
                    onClick={() => setEditingShared(true)}
                  >
                    {readOnly ? '查看分业务' : '分业务设置'}
                  </button>
                )}
              </div>
              {sceneOverrides(activity, sharedItem).length > 0 && (
                <OverrideTags activity={activity} item={sharedItem} unit={unit} onOpen={() => setEditingShared(true)} />
              )}
            </div>
          </FormRow>
          <FormRow label="活动库存">
            <div className="rule-sentence">
              <input
                className="input"
                style={{ width: 140 }}
                type="number"
                min={1}
                placeholder="不限量"
                disabled={readOnly}
                value={activity.activityStock ?? ''}
                onChange={(e) => onChange({ ...activity, activityStock: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <span>件</span>
            </div>
          </FormRow>
        </>
      )}

      {activity.goodsScope !== 'all' && (
        <>
          <div className="section-toolbar">
            {!readOnly && <button type="button" className="btn btn--primary" onClick={() => setPicking(true)}>选择商品</button>}
            <span className="field-hint">{activity.goodsScope === 'exclude' ? '不参与商品如下：' : `已设置 ${setCount}/${activity.productItems.length} 个商品的优惠`}</span>
          </div>
          {perProduct && checked.length > 0 && !readOnly && (
            <div className="section-toolbar ld-batch-bar">
              <span>已选 {checked.length} 项</span>
              <input
                className="input"
                style={{ width: 88 }}
                type="number"
                min={activity.discountMethod === 'discount' ? 0.1 : 0.01}
                max={activity.discountMethod === 'discount' ? 9.9 : undefined}
                step={activity.discountMethod === 'discount' ? 0.1 : 0.01}
                placeholder="默认力度"
                aria-label="批量默认力度"
                value={batchValue}
                onChange={(e) => setBatchValue(e.target.value)}
              />
              <span className="field-hint">{unit}</span>
              <button type="button" className="btn btn--default btn--sm" onClick={applyBatchDefault}>设置默认力度</button>
              <button
                type="button"
                className="link-btn"
                disabled={scenes.length === 0}
                title={scenes.length === 0 ? '请先在基础信息里选择参与业务/场景' : '为已选商品单独设置个别业务的力度'}
                onClick={() => setBatchScenes(true)}
              >
                分业务设置
              </button>
              <span className="ld-batch-bar__split" />
              <input className="input" style={{ width: 100 }} placeholder="库存" value={batchStock} onChange={(e) => setBatchStock(e.target.value)} />
              <button type="button" className="btn btn--default btn--sm" onClick={applyBatchStock}>批量设置活动库存</button>
              <button type="button" className="link-btn" onClick={() => setChecked([])}>取消选择</button>
            </div>
          )}
          <div className="list-toolbar" style={{ marginBottom: 8 }}>
            <input className="input input--filter" placeholder="搜索商品名称、ID、编码、标识或条码" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {perProduct && !readOnly && <th style={{ width: 36 }} />}
                  <th>商品名称</th>
                  <th>规格</th>
                  <th>商品标识</th>
                  <th>商品条码</th>
                  <th>商品规格码</th>
                  <th>销售价</th>
                  {perProduct && <th>{valueLabel}</th>}
                  {perProduct && <th>活动库存（件）</th>}
                  {!readOnly && <th>操作</th>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={perProduct ? 10 : 7}>
                      <div className="table-empty-state">
                        <p className="table-empty-state__title">{keyword ? '未找到匹配商品' : '还没有选择商品'}</p>
                        {!keyword && !readOnly && <button type="button" className="link-btn" onClick={() => setPicking(true)}>立即选择商品</button>}
                      </div>
                    </td>
                  </tr>
                ) : rows.map(({ item, product }) => product && (
                  <tr key={item.productId}>
                    {perProduct && !readOnly && (
                      <td>
                        <input type="checkbox" checked={checked.includes(item.productId)} onChange={() => setChecked((ids) => ids.includes(item.productId) ? ids.filter((id) => id !== item.productId) : [...ids, item.productId])} />
                      </td>
                    )}
                    <td>{product.name}</td>
                    <td>{product.spec}</td>
                    <td>{product.identifier}</td>
                    <td>{product.barcode}</td>
                    <td>{product.specCode}</td>
                    <td>¥{product.price}</td>
                    {perProduct && (
                      <td className="ld-item-discount">
                        <div className="ld-item-mode">
                          <div className="ld-item-mode__main">
                            <input
                              className="input"
                              style={{ width: 88 }}
                              type="number"
                              aria-label={`${product.name}默认${valueLabel}`}
                              disabled={readOnly}
                              value={item.discountValue ?? ''}
                              onChange={(e) => updateItem(item.productId, { discountValue: e.target.value === '' ? null : Number(e.target.value) })}
                            />
                            <span className="field-hint">{unit}</span>
                            {(!readOnly || sceneOverrides(activity, item).length > 0) && (
                              <button
                                type="button"
                                className="link-btn"
                                disabled={scenes.length === 0}
                                title={scenes.length === 0 ? '请先在基础信息里选择参与业务/场景' : undefined}
                                onClick={() => setEditingProductId(item.productId)}
                              >
                                {readOnly ? '查看分业务' : '分业务设置'}
                              </button>
                            )}
                          </div>
                          {sceneOverrides(activity, item).length > 0 && (
                            <OverrideTags activity={activity} item={item} unit={unit} onOpen={() => setEditingProductId(item.productId)} />
                          )}
                          {activity.discountMethod === 'special_price' && overPrice(activity, item, product.price) && (
                            <div className="field-hint">有力度高于门店售价，按门店售价生效</div>
                          )}
                        </div>
                      </td>
                    )}
                    {perProduct && (
                      <td>
                        <input
                          className="input"
                          style={{ width: 88 }}
                          type="number"
                          min={1}
                          placeholder="不限量"
                          disabled={readOnly}
                          value={item.stock ?? ''}
                          onChange={(e) => updateItem(item.productId, { stock: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                      </td>
                    )}
                    {!readOnly && (
                      <td>
                        <button type="button" className="link-btn" onClick={() => onChange(syncProductItems(activity, activity.productItems.filter((row) => row.productId !== item.productId).map((row) => row.productId)))}>取消参与</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="field-hint">特价不要高于门店售价，否则不生效、按门店售价执行。活动库存留空=不限量。</p>
      {picking && (
        <ProductPicker
          selectedIds={activity.productItems.map((item) => item.productId)}
          onChange={(ids) => { setKeyword(''); setChecked([]); onChange(syncProductItems(activity, ids)) }}
          onClose={() => setPicking(false)}
        />
      )}
      {editingProductId && (
        <SceneDiscountDialog
          activity={activity}
          productId={editingProductId}
          readOnly={readOnly}
          onChange={updateItem}
          onActivity={onChange}
          onClose={() => setEditingProductId(null)}
        />
      )}
      {editingShared && (
        <SceneDiscountDialog
          activity={activity}
          shared
          readOnly={readOnly}
          onChange={updateItem}
          onActivity={onChange}
          onClose={() => setEditingShared(false)}
        />
      )}
      {batchScenes && (
        <BatchSceneDialog
          activity={activity}
          productIds={checked}
          onApply={(next) => { onChange(next); setBatchScenes(false) }}
          onClose={() => setBatchScenes(false)}
        />
      )}
    </>
  )
}

const OVERRIDE_TAG_LIMIT = 2

function OverrideTags({ activity, item, unit, onOpen }: {
  activity: LimitDiscountActivityForm
  item: LimitDiscountProductItem
  unit: string
  onOpen: () => void
}) {
  const overrides = sceneOverrides(activity, item)
  const shown = overrides.slice(0, OVERRIDE_TAG_LIMIT)
  const rest = overrides.length - shown.length
  const fullText = overrides.map(({ sceneId, value }) => `${sceneLabel(sceneId)} ${trimAmount(value)}${unit}`).join('；')
  return (
    <button type="button" className="ld-override-tags" title={`单独设置：${fullText}`} onClick={onOpen}>
      {shown.map(({ sceneId, value }) => (
        <span key={sceneId} className="ld-override-tag">
          {sceneLabel(sceneId)}<strong>{trimAmount(value)}</strong>{unit}
        </span>
      ))}
      {rest > 0 && <span className="ld-override-tag ld-override-tag--more">+{rest}</span>}
    </button>
  )
}

function overPrice(activity: LimitDiscountActivityForm, item: LimitDiscountProductItem, salePrice: number): boolean {
  if (item.discountValue != null && item.discountValue > salePrice) return true
  return sceneOverrides(activity, item).some(({ value }) => value > salePrice)
}

function trimAmount(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

function SceneDiscountDialog({
  activity,
  productId,
  shared,
  readOnly,
  onChange,
  onActivity,
  onClose,
}: {
  activity: LimitDiscountActivityForm
  productId?: string
  shared?: boolean
  readOnly?: boolean
  onChange: (productId: string, patch: Partial<LimitDiscountProductItem>) => void
  onActivity: (activity: LimitDiscountActivityForm) => void
  onClose: () => void
}) {
  const item = shared ? sharedDiscountItem(activity) : activity.productItems.find((row) => row.productId === productId)
  const product = shared ? undefined : products.find((row) => row.id === productId)
  if (!item || (!shared && !product)) return null
  const unit = discountUnit(activity.discountMethod)
  const valueLabel = discountValueLabel(activity.discountMethod)
  const inputRange = {
    min: activity.discountMethod === 'discount' ? 0.1 : 0.01,
    max: activity.discountMethod === 'discount' ? 9.9 : undefined,
    step: activity.discountMethod === 'discount' ? 0.1 : 0.01,
  }
  const defaultText = item.discountValue == null ? '未填写' : `${trimAmount(item.discountValue)} ${unit}`
  const overrideCount = sceneOverrides(activity, item).length
  const patchItem = (patch: Partial<LimitDiscountProductItem>, prune = false) => {
    if (shared) {
      onActivity(writeSharedDiscount(activity, patch, prune))
      return
    }
    if (prune) {
      const next = pruneSameAsDefault({ ...item, ...patch })
      onChange(item.productId, { discountValue: next.discountValue, sceneDiscountValues: next.sceneDiscountValues })
      return
    }
    onChange(item.productId, patch)
  }
  const setOverride = (sceneId: string, value: number | null) => {
    patchItem({ sceneDiscountValues: setSceneOverride(item, sceneId, value).sceneDiscountValues })
  }
  const close = () => {
    if (!readOnly) patchItem({}, true)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal modal--scene" role="dialog" aria-modal="true" aria-labelledby="ld-scene-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3 id="ld-scene-title">{shared ? (activity.goodsScope === 'exclude' ? '余下商品 · 分业务设置' : '全部商品 · 分业务设置') : `${product?.name} · 分业务设置`}</h3>
            {product && <p className="modal__subtitle">销售价 ¥{product.price}</p>}
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={close}>×</button>
        </div>
        <div className="modal__body modal__body--scroll">
          <div className="ld-scene-default">
            <span className="ld-scene-default__label">默认{valueLabel}</span>
            <input
              className="input"
              style={{ width: 88 }}
              type="number"
              {...inputRange}
              disabled={readOnly}
              value={item.discountValue ?? ''}
              onChange={(e) => patchItem({ discountValue: e.target.value === '' ? null : Number(e.target.value) })}
            />
            <span className="field-hint">{unit}</span>
            <span className="field-hint">未单独设置的业务按默认力度执行</span>
          </div>
          {activity.orderTypes.length === 0 ? (
            <p className="field-hint">请先在基础信息里选择参与业务/场景。</p>
          ) : (
            <>
              <div className="ld-scene-grid__head">
                <span>需要不同力度的业务填写即可，已单独设置 {overrideCount}/{activity.orderTypes.length} 个</span>
                {!readOnly && overrideCount > 0 && (
                  <button type="button" className="link-btn" onClick={() => patchItem({ sceneDiscountValues: {} })}>全部恢复默认</button>
                )}
              </div>
              <div className="ld-scene-grid">
                {activity.orderTypes.map((sceneId) => {
                  const override = item.sceneDiscountValues[sceneId]
                  const isSet = override != null && !Number.isNaN(override)
                  const isSame = isSameAsDefault(item, sceneId)
                  return (
                    <div key={sceneId} className={`ld-scene-grid__item ${isSame ? 'is-same' : isSet ? 'is-set' : ''}`}>
                      <label className="ld-scene-grid__name" htmlFor={`ld-scene-${sceneId}`}>{sceneLabel(sceneId)}</label>
                      <input
                        id={`ld-scene-${sceneId}`}
                        className="input"
                        style={{ width: 120 }}
                        type="number"
                        {...inputRange}
                        disabled={readOnly}
                        placeholder={`默认 ${defaultText}`}
                        value={isSet ? override : ''}
                        onChange={(e) => setOverride(sceneId, e.target.value === '' ? null : Number(e.target.value))}
                      />
                      {isSet && <span className="field-hint">{unit}</span>}
                      {isSet && !isSame && !readOnly && (
                        <button type="button" className="link-btn" onClick={() => setOverride(sceneId, null)}>恢复默认</button>
                      )}
                      {activity.discountMethod === 'special_price' && isSet && product && override > product.price && (
                        <span className="field-hint">按门店售价</span>
                      )}
                      {isSame && !readOnly && (
                        <span className="ld-scene-grid__warn">与默认相同，无需单独设置</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--primary" onClick={close}>{readOnly ? '知道了' : '完成'}</button>
        </div>
      </div>
    </div>
  )
}

function BatchSceneDialog({
  activity,
  productIds,
  onApply,
  onClose,
}: {
  activity: LimitDiscountActivityForm
  productIds: string[]
  onApply: (activity: LimitDiscountActivityForm) => void
  onClose: () => void
}) {
  const [defaultValue, setDefaultValue] = useState('')
  const [sceneValues, setSceneValues] = useState<Record<string, string>>({})
  const [cleared, setCleared] = useState<Record<string, boolean>>({})
  const unit = discountUnit(activity.discountMethod)
  const valueLabel = discountValueLabel(activity.discountMethod)
  const inputRange = {
    min: activity.discountMethod === 'discount' ? 0.1 : 0.01,
    max: activity.discountMethod === 'discount' ? 9.9 : undefined,
    step: activity.discountMethod === 'discount' ? 0.1 : 0.01,
  }
  const defaultNumber = defaultValue.trim() === '' ? null : Number(defaultValue)
  const apply = () => {
    const ids = new Set(productIds)
    onApply({
      ...activity,
      productItems: activity.productItems.map((item) => {
        if (!ids.has(item.productId)) return item
        let next = item
        if (defaultNumber != null && !Number.isNaN(defaultNumber)) next = { ...next, discountValue: defaultNumber }
        activity.orderTypes.forEach((sceneId) => {
          if (cleared[sceneId]) next = setSceneOverride(next, sceneId, null)
          else if (sceneValues[sceneId]?.trim()) {
            const value = Number(sceneValues[sceneId])
            if (!Number.isNaN(value)) next = setSceneOverride(next, sceneId, value)
          }
        })
        return pruneSameAsDefault(next)
      }),
    })
  }
  const clearAll = () => {
    setSceneValues({})
    setCleared(Object.fromEntries(activity.orderTypes.map((sceneId) => [sceneId, true])))
  }
  const filledCount = activity.orderTypes.filter((sceneId) => sceneValues[sceneId]?.trim() || cleared[sceneId]).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scene" role="dialog" aria-modal="true" aria-labelledby="ld-batch-scene-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h3 id="ld-batch-scene-title">已选 {productIds.length} 个商品 · 分业务设置</h3>
            <p className="modal__subtitle">只填写要改的项，留空的保持各商品原样。与该商品默认力度相同的，按默认处理。</p>
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={onClose}>×</button>
        </div>
        <div className="modal__body modal__body--scroll">
          <div className="ld-scene-default">
            <span className="ld-scene-default__label">默认{valueLabel}</span>
            <input
              className="input"
              style={{ width: 88 }}
              type="number"
              {...inputRange}
              placeholder="不修改"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
            <span className="field-hint">{unit}</span>
            <span className="field-hint">填写后覆盖已选商品的默认力度</span>
          </div>
          {activity.orderTypes.length === 0 ? (
            <p className="field-hint">请先在基础信息里选择参与业务/场景。</p>
          ) : (
            <>
              <div className="ld-scene-grid__head">
                <span>需要不同力度的业务填写即可，本次将调整 {filledCount}/{activity.orderTypes.length} 个</span>
                <button type="button" className="link-btn" onClick={clearAll}>全部恢复默认</button>
              </div>
              <div className="ld-scene-grid">
                {activity.orderTypes.map((sceneId) => {
                  const raw = sceneValues[sceneId] ?? ''
                  const value = raw.trim() === '' ? null : Number(raw)
                  const isSame = value != null && defaultNumber != null && value === defaultNumber
                  const isCleared = Boolean(cleared[sceneId]) && raw.trim() === ''
                  return (
                    <div key={sceneId} className={`ld-scene-grid__item ${isSame ? 'is-same' : value != null ? 'is-set' : ''}`}>
                      <label className="ld-scene-grid__name" htmlFor={`ld-batch-scene-${sceneId}`}>{sceneLabel(sceneId)}</label>
                      <input
                        id={`ld-batch-scene-${sceneId}`}
                        className="input"
                        style={{ width: 120 }}
                        type="number"
                        {...inputRange}
                        placeholder={isCleared ? '恢复默认' : '不修改'}
                        value={raw}
                        onChange={(e) => {
                          setSceneValues((prev) => ({ ...prev, [sceneId]: e.target.value }))
                          setCleared((prev) => ({ ...prev, [sceneId]: false }))
                        }}
                      />
                      {value != null && !isSame && <span className="field-hint">{unit}</span>}
                      {!isCleared && (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            setSceneValues((prev) => ({ ...prev, [sceneId]: '' }))
                            setCleared((prev) => ({ ...prev, [sceneId]: true }))
                          }}
                        >
                          恢复默认
                        </button>
                      )}
                      {isSame && <span className="ld-scene-grid__warn">与默认相同，无需单独设置</span>}
                      {isCleared && <span className="field-hint">已选商品的该业务将按默认力度</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button type="button" className="btn btn--primary" onClick={apply}>完成</button>
        </div>
      </div>
    </div>
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
