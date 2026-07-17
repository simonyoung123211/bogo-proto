import type { MemberPriceActivityForm } from '../types'
import {
  formatPriceMethodValue,
  getActivityProducts,
  isUniformPricing,
  getActivityStores,
  getProductScopeLabel,
  getStoreScopeLabel,
} from '../utils/memberPriceActivity'

export type MemberPriceScopeSnapshotType = 'products' | 'stores'

interface MemberPriceScopeSnapshotModalProps {
  activity: MemberPriceActivityForm
  type: MemberPriceScopeSnapshotType
  onClose: () => void
}

export function MemberPriceScopeSnapshotModal({ activity, type, onClose }: MemberPriceScopeSnapshotModalProps) {
  const isProducts = type === 'products'
  const title = isProducts ? '活动商品快照' : '参与门店快照'
  const scopeLabel = isProducts ? getProductScopeLabel(activity) : getStoreScopeLabel(activity)
  const productList = getActivityProducts(activity)
  const storeList = getActivityStores(activity)
  const valueMap = new Map(activity.productItems.map((i) => [i.productId, i.value]))

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
                <thead>
                  <tr>
                    <th>商品名称</th>
                    <th>规格</th>
                    <th>销售价</th>
                    <th>会员价</th>
                  </tr>
                </thead>
                <tbody>
                  {productList.length === 0 ? (
                    <tr><td colSpan={4} className="table-empty">暂无商品</td></tr>
                  ) : productList.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.spec}</td>
                      <td>¥{p.price}</td>
                      <td>
                        {formatPriceMethodValue(
                          activity.priceMethod,
                          isUniformPricing(activity) ? activity.allProductsValue : valueMap.get(p.id) ?? 0,
                        )}
                      </td>
                    </tr>
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
