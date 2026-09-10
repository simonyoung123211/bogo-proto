import { useMemo, useState } from 'react'
import { PRIMARY_STATUS_TABS, MORE_STATUS_TABS, STATUS_LABELS } from '../mockData'
import type { ActivityForm, ActivityStatus } from '../types'

interface ParticipationActivityPickerProps {
  activities: ActivityForm[]
  /** 当前查询范围，空数组表示全部活动 */
  selectedIds: string[]
  /** 各活动的参与记录条数，帮运营快速判断哪些活动有量 */
  recordCounts: Map<string, number>
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

const STATUS_OPTIONS: (ActivityStatus | 'all')[] = [...PRIMARY_STATUS_TABS, ...MORE_STATUS_TABS]

export function ParticipationActivityPicker({
  activities,
  selectedIds,
  recordCounts,
  onClose,
  onConfirm,
}: ParticipationActivityPickerProps) {
  const [draft, setDraft] = useState<string[]>(selectedIds)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<ActivityStatus | 'all'>('all')
  const [onlyWithRecords, setOnlyWithRecords] = useState(false)

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return activities.filter((a) => {
      if (status !== 'all' && a.status !== status) return false
      if (onlyWithRecords && (recordCounts.get(a.id) ?? 0) === 0) return false
      if (!kw) return true
      return a.name.toLowerCase().includes(kw) || a.id.toLowerCase().includes(kw)
    })
  }, [activities, keyword, status, onlyWithRecords, recordCounts])

  const filteredIds = filtered.map((a) => a.id)
  const allFilteredChecked = filteredIds.length > 0 && filteredIds.every((id) => draft.includes(id))

  const toggle = (id: string) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleFiltered = () => {
    if (allFilteredChecked) {
      setDraft((prev) => prev.filter((id) => !filteredIds.includes(id)))
      return
    }
    setDraft((prev) => [...new Set([...prev, ...filteredIds])])
  }

  const selectedRecordTotal = draft.reduce((sum, id) => sum + (recordCounts.get(id) ?? 0), 0)
  const allRecordTotal = [...recordCounts.values()].reduce((sum, n) => sum + n, 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>选择活动</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__body">
          <div className="activity-picker__toolbar">
            <input
              className="input input--wide-sm"
              placeholder="活动名称 / 活动ID"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as ActivityStatus | 'all')}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'all' ? '全部状态' : STATUS_LABELS[s]}</option>
              ))}
            </select>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={onlyWithRecords}
                onChange={(e) => setOnlyWithRecords(e.target.checked)}
              />
              仅看有参与记录的活动
            </label>
            <button
              type="button"
              className="link-btn"
              onClick={toggleFiltered}
              disabled={filteredIds.length === 0}
            >
              {allFilteredChecked ? '取消全选' : `全选筛选结果（${filteredIds.length}）`}
            </button>
          </div>

          <div className="activity-picker__list">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th style={{ width: 40 }} />
                  <th>活动名称</th>
                  <th>活动ID</th>
                  <th>状态</th>
                  <th>活动时间</th>
                  <th style={{ textAlign: 'right' }}>参与记录</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty-state">
                        <p className="table-empty-state__title">没有匹配的活动</p>
                        <p className="table-empty-state__desc">调整关键词或状态后重试</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => {
                    const count = recordCounts.get(a.id) ?? 0
                    return (
                      <tr
                        key={a.id}
                        className="table-row--clickable"
                        onClick={() => toggle(a.id)}
                      >
                        <td>
                          <input type="checkbox" checked={draft.includes(a.id)} readOnly />
                        </td>
                        <td>{a.name || '未命名活动'}</td>
                        <td className="mono">{a.id}</td>
                        <td>
                          <span className={`status-badge status-badge--dot status-badge--${a.status}`}>
                            {STATUS_LABELS[a.status]}
                          </span>
                        </td>
                        <td className="text-secondary">{a.startTime?.slice(0, 10)} ~ {a.endTime?.slice(0, 10)}</td>
                        <td style={{ textAlign: 'right' }} className={count === 0 ? 'text-secondary' : ''}>
                          {count}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal__footer modal__footer--split">
          <div className="activity-picker__summary">
            {draft.length === 0 ? (
              <>未勾选活动，按<strong>全部活动</strong>查询（约 {allRecordTotal} 条记录）</>
            ) : (
              <>已选 <strong>{draft.length}</strong> 个活动，约 <strong>{selectedRecordTotal}</strong> 条记录</>
            )}
            {draft.length > 0 && (
              <button type="button" className="link-btn" onClick={() => setDraft([])}>清空</button>
            )}
          </div>
          <div className="activity-picker__actions">
            <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
            <button type="button" className="btn btn--primary" onClick={() => onConfirm(draft)}>确定</button>
          </div>
        </div>
      </div>
    </div>
  )
}
