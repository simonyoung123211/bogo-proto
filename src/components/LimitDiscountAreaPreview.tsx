import { useState } from 'react'
import { getDiscountAreas } from '../mockLimitDiscountAreas'
import type { LimitDiscountActivityForm } from '../types'
import { previewPrice, sceneLabel } from '../utils/limitDiscountActivity'
import { discountAreaRows, eligibleDiscountStores, matchesDiscountEntry } from '../utils/limitDiscountScope'
import { resolveActivityProducts } from '../utils/activityProductSearch'

export function LimitDiscountAreaPreview({ activity }: { activity: LimitDiscountActivityForm }) {
  const first = discountAreaRows(activity)[0]
  const [storeId, setStoreId] = useState(first?.store.id ?? '')
  const [areaId, setAreaId] = useState(first?.areas[0]?.id ?? '')
  const [productId, setProductId] = useState('')
  const goods = resolveActivityProducts({
    productScope: activity.goodsScope === 'all' ? 'all' : 'partial',
    productSelectionMode: activity.goodsScope === 'exclude' ? 'exclude' : 'include',
    productIds: activity.productItems.map((item) => item.productId),
  })
  const product = goods.find((item) => item.id === productId) ?? goods[0]
  if (!first || !product) return null
  const matches = matchesDiscountEntry(activity, storeId, areaId || null)
  const price = matches ? previewPrice(product, activity, activity.productItems.find((item) => item.productId === product.id)) : product.price
  return (
    <details className="ld-entry-preview">
      <summary>试算不同点餐入口的商品价</summary>
      <p className="field-hint">以{sceneLabel(activity.orderTypes[0])}为例，按其他活动条件均满足试算单件商品价。</p>
      <div className="ld-area-picker__bar">
        <select className="select" aria-label="试算门店" value={storeId} onChange={(e) => { setStoreId(e.target.value); setAreaId('') }}>
          {eligibleDiscountStores(activity).map((store) => <option value={store.id} key={store.id}>{store.name}</option>)}
        </select>
        <select className="select" aria-label="试算入口" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">普通入口（无区域）</option>
          {getDiscountAreas(storeId).map((area) => <option value={area.id} key={area.id}>{area.name}</option>)}
        </select>
        <select className="select" aria-label="试算商品" value={product.id} onChange={(e) => setProductId(e.target.value)}>
          {goods.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </div>
      <p aria-live="polite">原价 ¥{product.price.toFixed(2)} · {matches ? '区域匹配，预计商品价' : '未匹配本活动，商品价'} <strong>¥{Math.min(product.price, price).toFixed(2)}</strong></p>
    </details>
  )
}
