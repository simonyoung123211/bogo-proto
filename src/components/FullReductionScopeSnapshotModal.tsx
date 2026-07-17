import type { FullReductionActivityForm } from '../types'
import { getActivityProducts, getActivityStores } from '../utils/fullReductionActivity'

export type FullReductionScopeSnapshotType = 'products' | 'stores'

interface FullReductionScopeSnapshotModalProps {
  activity: FullReductionActivityForm
  type: FullReductionScopeSnapshotType
  onClose: () => void
}

export function FullReductionScopeSnapshotModal({ activity, type, onClose }: FullReductionScopeSnapshotModalProps) {
  const products = getActivityProducts(activity)
  const stores = getActivityStores(activity)
  const isProducts = type === 'products'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{isProducts ? '活动商品快照' : '参与门店快照'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal__body">
          {isProducts ? (
            activity.productScope === 'all' ? (
              <p>全部商品参与</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>商品名称</th>
                    <th>规格</th>
                    <th>销售价</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={3} className="table-empty">暂无数据</td></tr>
                  ) : products.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.spec}</td>
                      <td>¥{p.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            activity.storeScope === 'all' ? (
              <p>全部门店参与</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>门店名称</th>
                    <th>门店ID</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.length === 0 ? (
                    <tr><td colSpan={2} className="table-empty">暂无数据</td></tr>
                  ) : stores.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
