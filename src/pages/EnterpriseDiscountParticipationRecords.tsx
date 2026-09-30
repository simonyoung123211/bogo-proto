import type { EnterpriseDiscountActivityForm } from '../types'
import { formatRuleSummary } from '../utils/enterpriseDiscountActivity'

interface EnterpriseDiscountParticipationRecordsProps {
  activity: EnterpriseDiscountActivityForm
  onBack: () => void
}

export function EnterpriseDiscountParticipationRecords({
  activity,
  onBack,
}: EnterpriseDiscountParticipationRecordsProps) {
  return (
    <div className="page-card">
      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <button type="button" className="btn btn--text" onClick={onBack}>← 返回活动列表</button>
          <h1 className="list-page-header__title">参与记录</h1>
          <p className="text-secondary">{activity.name} · {formatRuleSummary(activity)}</p>
        </div>
      </header>
      <div className="table-empty-state" style={{ padding: '48px 24px' }}>
        <p className="table-empty-state__title">暂无参与记录</p>
        <p className="table-empty-state__desc">企业员工使用对应折扣下单后，记录将展示在这里。</p>
      </div>
    </div>
  )
}
