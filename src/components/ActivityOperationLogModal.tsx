import type { ActivityForm } from '../types'
import { maskPhone } from '../utils/activity'

interface ActivityOperationLogModalProps {
  activity: ActivityForm
  onClose: () => void
}

export function ActivityOperationLogModal({ activity, onClose }: ActivityOperationLogModalProps) {
  const logs = activity.operationLogs ?? []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>操作日志</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body modal__body--flush">
          <div className="activity-log-head">
            <div className="activity-log-head__name">{activity.name || '未命名活动'}</div>
            <div className="activity-log-head__meta mono">{activity.id}</div>
          </div>
          {logs.length === 0 ? (
            <div className="activity-log-empty">暂无操作记录</div>
          ) : (
            <ul className="activity-log-list">
              {logs.map((log) => (
                <li key={log.id} className="activity-log-item">
                  <div className="activity-log-item__main">
                    <span className="activity-log-item__action">{log.action}</span>
                    <span className="activity-log-item__time">{log.operatedAt}</span>
                  </div>
                  <div className="activity-log-item__operator">
                    {maskPhone(log.operatorPhone)} · {log.operatorOrg}
                  </div>
                  {log.detail && (
                    <div className="activity-log-item__detail">{log.detail}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
