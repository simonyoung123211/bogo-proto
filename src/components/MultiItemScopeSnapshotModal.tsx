import type { MultiItemActivityForm } from '../types'
import {
  getActivityProducts,
  getActivityStores,
  getProductScopeLabel,
  getStoreScopeLabel,
} from '../utils/multiItemActivity'

export type MultiItemScopeSnapshotType = 'products' | 'stores'

interface MultiItemScopeSnapshotModalProps {
  activity: MultiItemActivityForm
  type: MultiItemScopeSnapshotType
  onClose: () => void
}

export function MultiItemScopeSnapshotModal({ activity, type, onClose }: MultiItemScopeSnapshotModalProps) {
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
            <div className="scope-snapshot__meta"><span className="scope-snapshot__scope">{scopeLabel}</span></div>
            {isProducts ? (
              <table className="table table--compact">
                <thead><tr><th>商品名称</th><th>规格</th><th>销售价</th></tr></thead>
                <tbody>
                  {products.length === 0 ? <tr><td colSpan={3} className="table-empty">暂无商品</td></tr> : products.map((p) => (
                    <tr key={p.id}><td>{p.name}</td><td>{p.spec}</td><td>¥{p.price}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="table table--compact">
                <thead><tr><th>门店名称</th><th>区域</th><th>编码</th></tr></thead>
                <tbody>
                  {storeList.length === 0 ? <tr><td colSpan={3} className="table-empty">暂无门店</td></tr> : storeList.map((s) => (
                    <tr key={s.id}><td>{s.name}</td><td>{s.regionName}</td><td>{s.code}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
