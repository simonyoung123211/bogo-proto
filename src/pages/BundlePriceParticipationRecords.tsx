import { useMemo, useState } from 'react'
import { ParticipationActivityPicker } from '../components/ParticipationActivityPicker'
import { stores } from '../mockData'
import type { BundlePriceActivityForm, ParticipationStatus } from '../types'
import {
  buildBundlePriceParticipationCsv,
  buildBundlePriceParticipationRecords,
  countBundlePriceRecordsByActivity,
  downloadBundlePriceParticipationCsv,
  type BundlePriceParticipationRecord,
} from '../utils/bundlePriceParticipation'

interface BundlePriceParticipationRecordsProps {
  activities: BundlePriceActivityForm[]
  initialActivityId?: string
  onBack: () => void
  onExport: (activityCount: number, recordCount: number) => void
}

const PAGE_SIZE = 8

const STATUS_TABS: Array<ParticipationStatus | 'all'> = ['all', 'paid', 'refunded']
const STATUS_LABELS: Record<ParticipationStatus | 'all', string> = {
  all: '全部',
  paid: '已支付',
  refunded: '已退款',
}

export function BundlePriceParticipationRecords({
  activities,
  initialActivityId,
  onBack,
  onExport,
}: BundlePriceParticipationRecordsProps) {
  const allRecords = useMemo(() => buildBundlePriceParticipationRecords(activities), [activities])
  const recordCounts = useMemo(() => countBundlePriceRecordsByActivity(allRecords), [allRecords])
  const [activityIds, setActivityIds] = useState<string[]>(initialActivityId ? [initialActivityId] : [])
  const [keyword, setKeyword] = useState('')
  const [storeId, setStoreId] = useState('all')
  const [status, setStatus] = useState<ParticipationStatus | 'all'>('all')
  const [viewMode, setViewMode] = useState<'detail' | 'summary'>('detail')
  const [page, setPage] = useState(1)
  const [pickerOpen, setPickerOpen] = useState(false)

  const activityMap = useMemo(() => new Map(activities.map((activity) => [activity.id, activity])), [activities])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return allRecords.filter((record) => {
      if (activityIds.length > 0 && !activityIds.includes(record.activityId)) return false
      if (status !== 'all' && record.status !== status) return false
      if (storeId !== 'all' && record.storeId !== storeId) return false
      if (!kw) return true
      return record.orderId.toLowerCase().includes(kw)
        || record.userPhone.includes(kw)
        || record.userName.includes(kw)
    })
  }, [activityIds, allRecords, keyword, status, storeId])

  const totals = useMemo(() => {
    const users = new Set(filtered.map((record) => record.userPhone))
    const activitySet = new Set(filtered.map((record) => record.activityId))
    return {
      records: filtered.length,
      activities: activitySet.size,
      users: users.size,
      discountTotal: filtered.reduce((sum, record) => sum + (record.status === 'paid' ? record.discountAmount : 0), 0),
    }
  }, [filtered])

  const summaryRows = useMemo(() => {
    const grouped = new Map<string, BundlePriceParticipationRecord[]>()
    for (const record of filtered) {
      const list = grouped.get(record.activityId) ?? []
      list.push(record)
      grouped.set(record.activityId, list)
    }
    return [...grouped.entries()].map(([activityId, rows]) => ({
      activityId,
      records: rows.length,
      users: new Set(rows.map((row) => row.userPhone)).size,
      discountTotal: rows.reduce((sum, row) => sum + (row.status === 'paid' ? row.discountAmount : 0), 0),
      refunds: rows.filter((row) => row.status === 'refunded').length,
      lastParticipatedAt: rows.map((row) => row.participatedAt).sort().at(-1) ?? '-',
    })).sort((a, b) => b.lastParticipatedAt.localeCompare(a.lastParticipatedAt))
  }, [filtered])

  const pageRows = viewMode === 'detail'
    ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : summaryRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const total = viewMode === 'detail' ? filtered.length : summaryRows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const scopeLabel = activityIds.length === 0
    ? '全部活动'
    : activityIds.length === 1
      ? (activityMap.get(activityIds[0])?.name || activityIds[0])
      : `已选 ${activityIds.length} 个活动`

  const exportActivityCount = activityIds.length === 0
    ? new Set(filtered.map((record) => record.activityId)).size
    : activityIds.length

  const resetPage = () => setPage(1)

  return (
    <div className="page-card page-card--list">
      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <button type="button" className="btn btn--text" onClick={onBack}>← 返回活动列表</button>
          <h1 className="list-page-header__title">参与记录</h1>
          <p className="text-secondary">一口价 · {scopeLabel}</p>
        </div>
        <div className="list-page-header__actions">
          <button
            type="button"
            className="btn btn--default"
            onClick={() => {
              if (filtered.length === 0) {
                onExport(exportActivityCount, 0)
                return
              }
              downloadBundlePriceParticipationCsv(buildBundlePriceParticipationCsv(filtered, activities))
              onExport(exportActivityCount, filtered.length)
            }}
          >
            导出
          </button>
        </div>
      </header>

      <div className="list-info-banner">
        支持一次查询多个一口价活动的参与记录。先选定活动范围（不选即全部活动），再按订单号、手机号、门店和支付状态筛选。导出按当前筛选结果一次性导出。
      </div>

      <div className="participation-toolbar">
        <button type="button" className="btn btn--default" onClick={() => setPickerOpen(true)}>选择活动</button>
        <input
          className="input input--wide-sm"
          placeholder="订单号 / 手机号"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); resetPage() }}
        />
        <select className="input" value={storeId} onChange={(e) => { setStoreId(e.target.value); resetPage() }}>
          <option value="all">全部门店</option>
          {stores.slice(0, 12).map((store) => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
        {(keyword || storeId !== 'all') && (
          <button type="button" className="link-btn" onClick={() => { setKeyword(''); setStoreId('all'); resetPage() }}>重置筛选</button>
        )}
      </div>

      <div className="participation-toolbar">
        <div className="status-tabs">
          {STATUS_TABS.map((item) => (
            <button
              key={item}
              type="button"
              className={`status-tab ${status === item ? 'is-active' : ''}`}
              onClick={() => { setStatus(item); resetPage() }}
            >
              {STATUS_LABELS[item]}
            </button>
          ))}
        </div>
        <div className="participation-view-switch">
          <button type="button" className={`participation-view-switch__item ${viewMode === 'detail' ? 'is-active' : ''}`} onClick={() => { setViewMode('detail'); resetPage() }}>参与明细</button>
          <button type="button" className={`participation-view-switch__item ${viewMode === 'summary' ? 'is-active' : ''}`} onClick={() => { setViewMode('summary'); resetPage() }}>按活动汇总</button>
        </div>
      </div>

      <div className="participation-stats">
        <div className="participation-stats__item"><span className="participation-stats__label">参与记录</span><strong>{totals.records}</strong> 条</div>
        <div className="participation-stats__item"><span className="participation-stats__label">涉及活动</span><strong>{totals.activities}</strong> 个</div>
        <div className="participation-stats__item"><span className="participation-stats__label">参与用户</span><strong>{totals.users}</strong> 人</div>
        <div className="participation-stats__item"><span className="participation-stats__label">优惠总额</span><strong>¥{totals.discountTotal.toFixed(2)}</strong></div>
      </div>

      {viewMode === 'summary' ? (
        <SummaryTable
          rows={pageRows as typeof summaryRows}
          activityMap={activityMap}
          onViewDetail={(activityId) => {
            setActivityIds([activityId])
            setViewMode('detail')
            resetPage()
          }}
        />
      ) : (
        <DetailTable rows={pageRows as BundlePriceParticipationRecord[]} activityMap={activityMap} />
      )}

      <div className="pagination pagination--full">
        <span>共 {total} 条</span>
        {total > PAGE_SIZE && (
          <div className="pagination__pages">
            <button type="button" className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button type="button" className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
          </div>
        )}
      </div>

      {pickerOpen && (
        <ParticipationActivityPicker
          activities={activities}
          selectedIds={activityIds}
          recordCounts={recordCounts}
          onClose={() => setPickerOpen(false)}
          onConfirm={(ids) => { setActivityIds(ids); setPickerOpen(false); resetPage() }}
        />
      )}
    </div>
  )
}

const DETAIL_HEADERS = [
  '活动名称',
  '活动ID',
  '活动编码',
  '关联订单号',
  '下单时间',
  '参与门店',
  '参与渠道',
  '订单类型',
  '用户昵称',
  '用户手机号',
  '凑件件数',
  '参与商品',
  '订单应付(元)',
  '优惠金额(元)',
  '订单实付(元)',
  '支付状态',
] as const

function DetailTable({
  rows,
  activityMap,
}: {
  rows: BundlePriceParticipationRecord[]
  activityMap: Map<string, BundlePriceActivityForm>
}) {
  return (
    <div className="table-wrap table-wrap--list">
      <table className="table table--list table--participation-detail">
        <thead>
          <tr>
            {DETAIL_HEADERS.map((header) => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={DETAIL_HEADERS.length}>
                <div className="table-empty-state">
                  <p className="table-empty-state__title">暂无参与记录</p>
                  <p className="table-empty-state__desc">调整活动范围或筛选条件后重试。草稿和未开始的活动还没有顾客参与。</p>
                </div>
              </td>
            </tr>
          ) : rows.map((record) => {
            const activity = activityMap.get(record.activityId)
            return (
              <tr key={record.id}>
                <td className="cell-ellipsis">{activity?.name || '未命名活动'}</td>
                <td className="mono">{record.activityId}</td>
                <td className="mono">{activity?.activityCode || '—'}</td>
                <td className="mono">{record.orderId}</td>
                <td className="table-time">{record.orderedAt}</td>
                <td>{record.storeName}</td>
                <td>{record.channel}</td>
                <td>{record.orderType}</td>
                <td>{record.userName}</td>
                <td className="mono">{record.userPhone}</td>
                <td>{record.itemCount}</td>
                <td className="cell-ellipsis" title={record.productSummary}>{record.productSummary}</td>
                <td>¥{record.payableAmount.toFixed(2)}</td>
                <td className={record.discountAmount > 0 ? 'order-discount-cell' : ''}>¥{record.discountAmount.toFixed(2)}</td>
                <td>¥{record.paidAmount.toFixed(2)}</td>
                <td>{record.status === 'paid' ? '已支付' : '已退款'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SummaryTable({
  rows,
  activityMap,
  onViewDetail,
}: {
  rows: Array<{
    activityId: string
    records: number
    users: number
    discountTotal: number
    refunds: number
    lastParticipatedAt: string
  }>
  activityMap: Map<string, BundlePriceActivityForm>
  onViewDetail: (activityId: string) => void
}) {
  return (
    <div className="table-wrap table-wrap--list">
      <table className="table table--list">
        <thead>
          <tr>
            <th>活动名称</th>
            <th>活动ID</th>
            <th>参与人次</th>
            <th>参与用户数</th>
            <th>优惠总额</th>
            <th>其中已退款</th>
            <th>最近参与时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <div className="table-empty-state">
                  <p className="table-empty-state__title">暂无参与记录</p>
                  <p className="table-empty-state__desc">调整活动范围或筛选条件后重试</p>
                </div>
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr key={row.activityId}>
              <td>{activityMap.get(row.activityId)?.name || '未命名活动'}</td>
              <td className="mono">{row.activityId}</td>
              <td>{row.records}</td>
              <td>{row.users}</td>
              <td>¥{row.discountTotal.toFixed(2)}</td>
              <td>{row.refunds}</td>
              <td className="table-time">{row.lastParticipatedAt}</td>
              <td className="table-actions">
                <button type="button" onClick={() => onViewDetail(row.activityId)}>查看明细</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
