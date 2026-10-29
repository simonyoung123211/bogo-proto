import { useMemo, useState } from 'react'
import { LIMIT_DISCOUNT_SCENES } from '../mockLimitDiscountData'
import { stores } from '../mockData'
import type { LimitDiscountActivityForm } from '../types'

interface LimitDiscountParticipationRecordsProps {
  activities: LimitDiscountActivityForm[]
  initialActivityId?: string
  onBack: () => void
}

export function LimitDiscountParticipationRecords({ activities, initialActivityId, onBack }: LimitDiscountParticipationRecordsProps) {
  const [activityId, setActivityId] = useState(initialActivityId ?? '')
  const [keyword, setKeyword] = useState('')
  const scoped = activityId ? activities.filter((activity) => activity.id === activityId) : activities.filter((activity) => activity.status !== 'draft')

  const rows = useMemo(() => {
    return scoped.flatMap((activity, index) => {
      if (activity.status === 'draft') return []
      return [0, 1].map((offset) => {
        const scene = LIMIT_DISCOUNT_SCENES.find((item) => item.id === activity.orderTypes[offset % Math.max(activity.orderTypes.length, 1)])
        const store = stores[offset % stores.length]
        return {
          id: `${activity.id}-${offset}`,
          orderNo: `DD2026102${index}${offset}18`,
          phone: offset === 0 ? '138****1024' : '159****8831',
          storeName: store?.name ?? '演示门店',
          scene: scene?.label ?? '堂食',
          activityName: activity.name,
          discount: offset === 0 ? '6.60' : '4.40',
          payStatus: '已支付',
        }
      })
    }).filter((row) => !keyword || row.orderNo.includes(keyword) || row.phone.includes(keyword) || row.activityName.includes(keyword))
  }, [scoped, keyword])

  return (
    <div className="page-card page-card--list">
      <header className="list-page-header list-page-header--compact">
        <div>
          <h1 className="list-page-header__title">参与记录</h1>
          <p className="text-secondary">限时折扣 · {activityId ? '当前活动' : '全部已发布活动'}</p>
        </div>
        <button type="button" className="btn btn--default" onClick={onBack}>返回列表</button>
      </header>
      <div className="list-toolbar">
        <div className="list-toolbar__fields">
          <div className="filter-item">
            <label>活动</label>
            <select className="input input--filter" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
              <option value="">全部活动</option>
              {activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name || activity.id}</option>)}
            </select>
          </div>
          <div className="filter-item">
            <label>订单号 / 手机号</label>
            <input className="input input--filter" value={keyword} placeholder="请输入订单号或手机号" onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>手机号</th>
              <th>门店</th>
              <th>业务类型</th>
              <th>活动</th>
              <th>优惠金额</th>
              <th>支付状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7}><div className="table-empty-state"><p className="table-empty-state__title">暂无参与记录</p></div></td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.orderNo}</td>
                <td>{row.phone}</td>
                <td>{row.storeName}</td>
                <td>{row.scene}</td>
                <td>{row.activityName}</td>
                <td>¥{row.discount}</td>
                <td>{row.payStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
