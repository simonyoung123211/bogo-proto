import { useMemo, useState } from 'react'
import type { ActivityForm } from '../types'
import { getResolvedStores } from '../utils/storeRegistry'
import { isTerminalActivityStatus } from '../utils/storeClosure'

interface SimulateStoreClosureModalProps {
  activities: ActivityForm[]
  onClose: () => void
  onConfirm: (storeId: string) => void
}

export function SimulateStoreClosureModal({ activities, onClose, onConfirm }: SimulateStoreClosureModalProps) {
  const candidates = useMemo(() => {
    const stores = getResolvedStores().filter((s) => s.status === 'open')
    return stores.map((store) => {
      const hit = activities.filter(
        (a) =>
          !isTerminalActivityStatus(a.status)
          && a.storeScope !== 'all'
          && a.storeIds.includes(store.id),
      )
      return { store, hitCount: hit.length, hits: hit }
    }).filter((c) => c.hitCount > 0)
  }, [activities])

  const [storeId, setStoreId] = useState(candidates[0]?.store.id ?? '')

  const selected = candidates.find((c) => c.store.id === storeId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>模拟门店已停业清理</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <p className="form-hint" style={{ marginTop: 0 }}>
            演示：将门店标为已停业，并从非终态买1送N 活动的「指定参与 / 指定不参与」名单中自动剔除；
            若参与或未排除名单清空，活动将自动暂停，写入操作日志并向创建人发站内信。
          </p>
          {candidates.length === 0 ? (
            <div className="table-empty">当前没有「营业中且已被活动名单引用」的门店，请先在活动中配置部分门店后再试。</div>
          ) : (
            <>
              <div className="form-row">
                <label className="form-label">选择门店</label>
                <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                  {candidates.map(({ store, hitCount }) => (
                    <option key={store.id} value={store.id}>
                      {store.name}（{store.code}）· 影响 {hitCount} 个活动
                    </option>
                  ))}
                </select>
              </div>
              {selected && (
                <div className="closure-preview">
                  <div className="closure-preview__title">将受影响的活动</div>
                  <ul className="closure-preview__list">
                    {selected.hits.map((a) => (
                      <li key={a.id}>
                        <span className="mono">{a.id}</span>
                        {' · '}
                        {a.name || '未命名'}
                        {' · '}
                        {a.storeScope === 'partial_exclude' ? '指定不参与' : '指定参与'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!storeId || candidates.length === 0}
            onClick={() => onConfirm(storeId)}
          >
            确认已停业并清理
          </button>
        </div>
      </div>
    </div>
  )
}
