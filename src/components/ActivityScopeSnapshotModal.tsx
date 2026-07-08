import type { ActivityForm } from '../types'
import {
  getActivityProducts,
  getActivityStores,
  getProductScopeLabel,
  getStoreScopeLabel,
} from '../utils/activity'

export type ActivityScopeSnapshotType = 'products' | 'stores'

interface ActivityScopeSnapshotModalProps {
  activity: ActivityForm
  type: ActivityScopeSnapshotType
  onClose: () => void
}

export function ActivityScopeSnapshotModal({
  activity,
  type,
  onClose,
}: ActivityScopeSnapshotModalProps) {
  const isProducts = type === 'products'
  const title = isProducts ? '活动商品快照' : '参与门店快照'
  const scopeLabel = isProducts ? getProductScopeLabel(activity) : getStoreScopeLabel(activity)
  const products = getActivityProducts(activity)
  const storeList = getActivityStores(activity)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body modal__body--flush">
          <div className="activity-log-head">
            <div className="activity-log-head__name">{activity.name || '未命名活动'}</div>
            <div className="activity-log-head__meta mono">{activity.id}</div>
          </div>
          <div className="scope-snapshot">
            <div className="scope-snapshot__meta">
              <span className="scope-snapshot__scope">{scopeLabel}</span>
            </div>
            {isProducts ? (
              <ProductSnapshotBody activity={activity} products={products} />
            ) : (
              <StoreSnapshotBody activity={activity} stores={storeList} />
            )}
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

function ProductSnapshotBody({
  activity,
  products,
}: {
  activity: ActivityForm
  products: ReturnType<typeof getActivityProducts>
}) {
  if (activity.productScope === 'all') {
    return <div className="scope-snapshot__empty">活动配置为「全部商品」，不限定具体商品范围。</div>
  }
  if (products.length === 0) {
    return <div className="scope-snapshot__empty">暂未选择活动商品。</div>
  }
  return (
    <div className="scope-snapshot__table-wrap">
      <table className="table table--compact scope-snapshot__table">
        <thead>
          <tr>
            <th>商品名称</th>
            <th>类目</th>
            <th>规格</th>
            <th>编码</th>
            <th>销售价</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.categoryName}</td>
              <td>{p.spec}</td>
              <td className="mono">{p.code}</td>
              <td>¥{p.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StoreSnapshotBody({
  activity,
  stores,
}: {
  activity: ActivityForm
  stores: ReturnType<typeof getActivityStores>
}) {
  if (activity.storeScope === 'all') {
    return <div className="scope-snapshot__empty">活动配置为「全部门店」，不限定具体门店范围。</div>
  }
  if (stores.length === 0) {
    return <div className="scope-snapshot__empty">暂未选择门店。</div>
  }
  const listTitle = activity.storeScope === 'partial_exclude' ? '不参与门店' : '参与门店'
  return (
    <div className="scope-snapshot__table-wrap">
      <div className="scope-snapshot__list-title">{listTitle}</div>
      <table className="table table--compact scope-snapshot__table">
        <thead>
          <tr>
            <th>门店 ID</th>
            <th>门店名称</th>
            <th>所属区域</th>
            <th>门店编码</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id}>
              <td className="mono">{s.id}</td>
              <td>{s.name}</td>
              <td>{s.regionName}</td>
              <td className="mono">{s.code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
