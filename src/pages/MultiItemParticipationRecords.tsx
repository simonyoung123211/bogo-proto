import type { MultiItemActivityForm } from '../types'
import { formatRuleSummary } from '../utils/multiItemActivity'

interface MultiItemParticipationRecordsProps {
  activity: MultiItemActivityForm
  onBack: () => void
  onExport?: () => void
}

export function MultiItemParticipationRecords({ activity, onBack, onExport }: MultiItemParticipationRecordsProps) {
  return (
    <div className="page-card">
      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <button type="button" className="btn btn--text" onClick={onBack}>← 返回活动列表</button>
          <h1 className="list-page-header__title">参与记录</h1>
          <p className="text-secondary">{activity.name} · {formatRuleSummary(activity)}</p>
        </div>
        {onExport && (
          <div className="list-page-header__actions">
            <button type="button" className="btn btn--default" onClick={onExport}>导出</button>
          </div>
        )}
      </header>
      <div className="table-empty-state" style={{ padding: '48px 24px' }}>
        <p className="table-empty-state__title">暂无参与记录</p>
        <p className="table-empty-state__desc">活动产生订单参与后将在此展示，供后续统计分析使用。</p>
      </div>
    </div>
  )
}
