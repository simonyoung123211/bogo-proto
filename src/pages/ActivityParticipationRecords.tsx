import { useEffect, useMemo, useState } from 'react'
import { STATUS_LABELS, stores } from '../mockData'
import { GIFT_TYPE_LABELS, ORDER_STATUS_LABELS } from '../orderData'
import {
  PARTICIPATION_STATUS_LABELS,
  PARTICIPATION_STATUS_TABS,
} from '../participationData'
import type {
  ActivityForm,
  ActivityParticipationRecord,
  OrderDatePreset,
  ParticipationFilters,
  ParticipationStatus,
} from '../types'
import {
  countRecordsByActivity,
  createEmptyParticipationFilters,
  getAllParticipationRecords,
  hasActiveParticipationFilters,
  matchesParticipationFilters,
  summarizeByActivity,
  sumParticipation,
} from '../utils/participation'
import { formatMoney } from '../utils/order'
import { ParticipationActivityPicker } from '../components/ParticipationActivityPicker'

interface ActivityParticipationRecordsProps {
  activities: ActivityForm[]
  /** 查询的活动范围，空数组表示全部活动 */
  activityIds: string[]
  /** 范围变化时同步给上层，从订单详情返回时不丢失所选活动 */
  onScopeChange: (ids: string[]) => void
  onBack: () => void
  onViewOriginalOrder: (orderId: string) => void
  onExport: (recordCount: number, activityCount: number) => void
}

const DATE_PRESETS: { value: OrderDatePreset; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'last7', label: '近7天' },
  { value: 'custom', label: '自定义' },
]

const PAGE_SIZE_OPTIONS = [10, 20, 50]

type ViewMode = 'detail' | 'by-activity'

export function ActivityParticipationRecords({
  activities,
  activityIds,
  onScopeChange,
  onBack,
  onViewOriginalOrder,
  onExport,
}: ActivityParticipationRecordsProps) {
  const initialFilters = () => ({ ...createEmptyParticipationFilters(), activityIds })
  const [filters, setFilters] = useState<ParticipationFilters>(initialFilters)
  const [applied, setApplied] = useState<ParticipationFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])
  const [viewMode, setViewMode] = useState<ViewMode>('detail')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detail, setDetail] = useState<ActivityParticipationRecord | null>(null)
  const [giftSnapshot, setGiftSnapshot] = useState<ActivityParticipationRecord | null>(null)

  const activityMap = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities])
  const recordCounts = useMemo(() => countRecordsByActivity(), [])

  // 跨活动查询时按参与时间倒序，最新的记录排在前面
  const baseRecords = useMemo(
    () => [...getAllParticipationRecords()].sort((a, b) => b.participatedAt.localeCompare(a.participatedAt)),
    [],
  )

  const filtered = useMemo(
    () => baseRecords.filter((r) => matchesParticipationFilters(r, applied)),
    [baseRecords, applied],
  )

  const totals = useMemo(() => sumParticipation(filtered), [filtered])
  const summaryRows = useMemo(
    () => (viewMode === 'by-activity' ? summarizeByActivity(filtered) : []),
    [filtered, viewMode],
  )

  const rowCount = viewMode === 'detail' ? filtered.length : summaryRows.length
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize))
  const currentPage = Math.min(page, totalPages)
  const sliceStart = (currentPage - 1) * pageSize
  const pageRows = filtered.slice(sliceStart, sliceStart + pageSize)
  const summaryPageRows = summaryRows.slice(sliceStart, sliceStart + pageSize)

  useEffect(() => setPage(1), [applied, viewMode, pageSize])

  const apply = (next: ParticipationFilters) => setApplied(next)
  const handleSearch = () => apply(filters)
  const handleReset = () => {
    // 重置只清筛选条件，活动范围由「选择活动」单独控制
    const empty = { ...createEmptyParticipationFilters(), activityIds: filters.activityIds }
    setFilters(empty)
    apply(empty)
  }
  const setStatusTab = (status: ParticipationStatus | 'all') => {
    const next = { ...applied, status }
    setFilters((f) => ({ ...f, status }))
    apply(next)
  }
  const update = (patch: Partial<ParticipationFilters>) => setFilters((f) => ({ ...f, ...patch }))

  const changeScope = (ids: string[]) => {
    setFilters((f) => ({ ...f, activityIds: ids }))
    setApplied((a) => ({ ...a, activityIds: ids }))
    onScopeChange(ids)
    setPickerOpen(false)
  }

  const scopeIds = applied.activityIds
  const singleActivity = scopeIds.length === 1 ? activityMap.get(scopeIds[0]) : undefined
  const scopeLabel = scopeIds.length === 0
    ? '全部活动'
    : singleActivity
      ? (singleActivity.name || '未命名活动')
      : `已选 ${scopeIds.length} 个活动`

  const rangeStart = rowCount === 0 ? 0 : sliceStart + 1
  const rangeEnd = Math.min(sliceStart + pageSize, rowCount)
  const rowUnit = viewMode === 'detail' ? '条' : '个活动'
  const showActivityColumn = !singleActivity

  return (
    <div className="page-card page-card--list">
      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <button type="button" className="link-btn participation-back" onClick={onBack}>
            ← 返回活动列表
          </button>
          <div className="list-page-header__title-row">
            <h1 className="list-page-header__title">参与记录</h1>
          </div>
          <div className="participation-head__meta">
            {singleActivity ? (
              <>
                <span className="participation-head__name">{singleActivity.name || '未命名活动'}</span>
                <span className={`status-badge status-badge--dot status-badge--${singleActivity.status}`}>
                  {STATUS_LABELS[singleActivity.status]}
                </span>
                <span className="participation-head__id mono">{singleActivity.id}</span>
              </>
            ) : (
              <span className="participation-head__name">{scopeLabel}</span>
            )}
          </div>
        </div>
        <div className="list-page-header__actions">
          <button
            type="button"
            className="btn btn--default"
            onClick={() => onExport(totals.records, totals.activities)}
          >
            导出
          </button>
        </div>
      </header>

      <div className="info-banner">
        支持一次查询多个活动的参与记录：先在「活动」里选定范围（不选即全部活动），再按订单号 / 手机号 / 取餐号、门店、参与时间、赠品形态与状态筛选；导出按当前筛选结果一次性导出，无需逐个活动操作。
      </div>

      <div className="filter-bar">
        <div className="filter-bar__row">
          <div className="filter-item">
            <label>活动</label>
            <button type="button" className="scope-picker-btn" onClick={() => setPickerOpen(true)}>
              <span className="scope-picker-btn__text">{scopeLabel}</span>
              <span className="scope-picker-btn__action">选择活动</span>
            </button>
          </div>
          <div className="filter-item">
            <label>订单号/手机号/取餐号</label>
            <input
              className="input input--wide-sm"
              value={filters.keyword}
              onChange={(e) => update({ keyword: e.target.value })}
              placeholder="请输入关键字搜索"
            />
          </div>
          <div className="filter-item">
            <label>参与门店</label>
            <select
              className="input"
              value={filters.storeId}
              onChange={(e) => update({ storeId: e.target.value })}
            >
              <option value="all">全部</option>
              {stores.slice(0, 12).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>赠品形态</label>
            <select
              className="input"
              value={filters.giftType}
              onChange={(e) => update({ giftType: e.target.value as ParticipationFilters['giftType'] })}
            >
              <option value="all">全部</option>
              <option value="physical">{GIFT_TYPE_LABELS.physical}</option>
              <option value="storage_coupon">{GIFT_TYPE_LABELS.storage_coupon}</option>
            </select>
          </div>
          <div className="filter-item">
            <label>参与时间</label>
            <div className="date-range">
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => update({ startDate: e.target.value, datePreset: 'custom' })}
              />
              <span className="date-range__sep">至</span>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => update({ endDate: e.target.value, datePreset: 'custom' })}
              />
            </div>
          </div>
          <div className="filter-actions">
            <button type="button" className="btn btn--primary" onClick={handleSearch}>搜索</button>
            <button type="button" className="btn btn--default" onClick={handleReset}>重置</button>
          </div>
        </div>
      </div>

      <div className="order-date-presets">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`order-date-chip ${filters.datePreset === p.value ? 'is-active' : ''}`}
            onClick={() => {
              const next = { ...filters, datePreset: p.value }
              setFilters(next)
              if (p.value !== 'custom') apply(next)
            }}
          >
            {p.label}
          </button>
        ))}
        {hasActiveParticipationFilters(applied) && (
          <span className="order-active-hint">已应用筛选条件</span>
        )}
      </div>

      <div className="participation-toolbar">
        <div className="status-tabs">
          {PARTICIPATION_STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-tab ${applied.status === s ? 'is-active' : ''}`}
              onClick={() => setStatusTab(s)}
            >
              {s === 'all' ? '全部' : PARTICIPATION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="participation-view-switch">
          <button
            type="button"
            className={`participation-view-switch__item ${viewMode === 'detail' ? 'is-active' : ''}`}
            onClick={() => setViewMode('detail')}
          >
            参与明细
          </button>
          <button
            type="button"
            className={`participation-view-switch__item ${viewMode === 'by-activity' ? 'is-active' : ''}`}
            onClick={() => setViewMode('by-activity')}
          >
            按活动汇总
          </button>
        </div>
      </div>

      <div className="participation-stats">
        <div className="participation-stats__item">
          <span className="participation-stats__label">参与记录</span>
          <strong>{totals.records}</strong> 条
        </div>
        <div className="participation-stats__item">
          <span className="participation-stats__label">涉及活动</span>
          <strong>{totals.activities}</strong> 个
        </div>
        <div className="participation-stats__item">
          <span className="participation-stats__label">参与用户</span>
          <strong>{totals.users}</strong> 人
        </div>
        <div className="participation-stats__item">
          <span className="participation-stats__label">优惠总额</span>
          <strong>¥{formatMoney(totals.discountTotal)}</strong>
        </div>
      </div>

      {viewMode === 'by-activity' ? (
        <div className="table-wrap table-wrap--list">
          <table className="table table--list">
            <thead>
              <tr>
                <th>活动名称</th>
                <th>活动ID</th>
                <th>活动状态</th>
                <th>参与人次</th>
                <th>参与用户数</th>
                <th>优惠总额(元)</th>
                <th>其中已退款</th>
                <th>最近参与时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {summaryPageRows.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="table-empty-state">
                      <p className="table-empty-state__title">暂无参与记录</p>
                      <p className="table-empty-state__desc">调整活动范围或筛选条件后重试</p>
                    </div>
                  </td>
                </tr>
              ) : (
                summaryPageRows.map((row) => {
                  const act = activityMap.get(row.activityId)
                  return (
                    <tr key={row.activityId}>
                      <td>{act?.name || '未命名活动'}</td>
                      <td className="mono">{row.activityId}</td>
                      <td>
                        {act && (
                          <span className={`status-badge status-badge--dot status-badge--${act.status}`}>
                            {STATUS_LABELS[act.status]}
                          </span>
                        )}
                      </td>
                      <td>{row.records}</td>
                      <td>{row.users}</td>
                      <td className={row.discountTotal > 0 ? 'order-discount-cell' : ''}>{formatMoney(row.discountTotal)}</td>
                      <td>{row.refunds}</td>
                      <td className="table-time">{row.lastParticipatedAt}</td>
                      <td className="table-actions">
                        <button
                          type="button"
                          onClick={() => {
                            changeScope([row.activityId])
                            setViewMode('detail')
                          }}
                        >
                          查看明细
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="table-wrap table-wrap--list">
        <table className="table table--list">
          <thead>
            <tr>
              {showActivityColumn && <th>所属活动</th>}
              <th>关联订单号</th>
              <th>订单类型</th>
              <th>订单来源</th>
              <th>参与门店</th>
              <th>用户信息</th>
              <th>参与时身份</th>
              <th>规则类型</th>
              <th>触发商品</th>
              <th>赠品明细</th>
              <th>订单应付(元)</th>
              <th>订单实付(元)</th>
              <th>优惠金额(元)</th>
              <th>下单时间</th>
              <th>支付时间</th>
              <th>订单状态</th>
              <th>支付/退款</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={showActivityColumn ? 18 : 17}>
                  <div className="table-empty-state">
                    <p className="table-empty-state__title">暂无参与记录</p>
                    <p className="table-empty-state__desc">调整活动范围或筛选条件后重试</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.id}>
                  {showActivityColumn && (
                    <td>
                      <div className="cell-ellipsis" title={activityMap.get(r.activityId)?.name}>
                        {activityMap.get(r.activityId)?.name || '未命名活动'}
                      </div>
                      <div className="text-secondary mono">{r.activityId}</div>
                    </td>
                  )}
                  <td className="mono">{r.orderId}</td>
                  <td>{r.orderType}</td>
                  <td>{r.source}</td>
                  <td>{r.storeName}</td>
                  <td>
                    <div>{r.userName}</div>
                    <div className="text-secondary mono">{r.userPhone}</div>
                  </td>
                  <td>
                    <span className={`user-badge ${r.isNewUserAtParticipation ? 'user-badge--new' : 'user-badge--old'}`}>
                      {r.isNewUserAtParticipation ? '未消费用户' : '已消费用户'}
                    </span>
                  </td>
                  <td>{r.ruleName}</td>
                  <td><span className="cell-ellipsis" title={r.triggerProducts.join('、')}>{r.triggerProducts.join('、') || '-'}</span></td>
                  <td>
                    <GiftDetailCell record={r} onClick={() => setGiftSnapshot(r)} />
                  </td>
                  <td>{formatMoney(r.payable)}</td>
                  <td>{formatMoney(r.paid)}</td>
                  <td className={r.discountAmount > 0 ? 'order-discount-cell' : ''}>{formatMoney(r.discountAmount)}</td>
                  <td className="table-time">{r.orderedAt}</td>
                  <td className="table-time">{r.paidAt}</td>
                  <td>{ORDER_STATUS_LABELS[r.orderStatus]}</td>
                  <td>{PARTICIPATION_STATUS_LABELS[r.status]}</td>
                  <td className="table-actions">
                    <button type="button" onClick={() => setDetail(r)}>详情</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      <div className="pagination pagination--full">
        <span>
          共 {rowCount} {rowUnit}
          {rowCount > 0 && `，当前第 ${rangeStart}–${rangeEnd} ${rowUnit}`}
        </span>
        <label className="pagination__size">
          每页
          <select
            className="input input--xs"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {rowUnit === '条' ? '条' : '个'}
        </label>
        {rowCount > pageSize && (
          <div className="pagination__pages">
            <button
              type="button"
              className="page-btn"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              上一页
            </button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button
              type="button"
              className="page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {detail && (
        <ParticipationDetailDrawer
          record={detail}
          onClose={() => setDetail(null)}
          onViewOriginalOrder={() => {
            const orderId = detail.orderId
            setDetail(null)
            onViewOriginalOrder(orderId)
          }}
        />
      )}

      {giftSnapshot && (
        <GiftSnapshotModal record={giftSnapshot} onClose={() => setGiftSnapshot(null)} />
      )}

      {pickerOpen && (
        <ParticipationActivityPicker
          activities={activities}
          selectedIds={applied.activityIds}
          recordCounts={recordCounts}
          onClose={() => setPickerOpen(false)}
          onConfirm={changeScope}
        />
      )}
    </div>
  )
}

const GIFT_TAG_SHORT: Record<'physical' | 'storage_coupon', string> = {
  physical: '实物赠品',
  storage_coupon: '寄存券',
}

function GiftDetailCell({
  record,
  onClick,
}: {
  record: ActivityParticipationRecord
  onClick?: () => void
}) {
  if (record.giftProducts.length === 0) return <>-</>
  return (
    <button type="button" className="gift-detail-cell" onClick={onClick} title="点击查看赠品快照">
      {record.giftProducts.map((g, i) => (
        <span key={`${g.name}-${i}`} className="gift-detail-cell__item">
          <span className={`order-tag ${g.giftType === 'physical' ? 'order-tag--gift' : 'order-tag--coupon'}`}>
            {GIFT_TAG_SHORT[g.giftType]}
          </span>
          <span className="gift-detail-cell__name">{g.name}</span>
          {g.quantity > 1 && <span className="gift-detail-cell__qty">×{g.quantity}</span>}
        </span>
      ))}
    </button>
  )
}

function GiftSnapshotModal({
  record,
  onClose,
}: {
  record: ActivityParticipationRecord
  onClose: () => void
}) {
  const hasCoupon = record.giftProducts.some((g) => g.giftType === 'storage_coupon')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>赠品快照</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          <div className="activity-log-head">
            <div className="activity-log-head__name">{record.ruleName} · {record.userName}</div>
            <div className="activity-log-head__meta mono">订单号：{record.orderId}</div>
          </div>
          <table className="table table--compact scope-snapshot__table">
            <thead>
              <tr>
                <th>赠品名称</th>
                <th>赠品形态</th>
                <th>数量</th>
                {hasCoupon && <th>券有效期</th>}
              </tr>
            </thead>
            <tbody>
              {record.giftProducts.map((g, i) => (
                <tr key={`${g.name}-${i}`}>
                  <td>{g.name}</td>
                  <td>
                    <span className={`order-tag ${g.giftType === 'physical' ? 'order-tag--gift' : 'order-tag--coupon'}`}>
                      {GIFT_TAG_SHORT[g.giftType]}
                    </span>
                  </td>
                  <td>{g.quantity}</td>
                  {hasCoupon && <td>{g.giftType === 'storage_coupon' ? (g.validity ?? '-') : '-'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

function ParticipationDetailDrawer({
  record,
  onClose,
  onViewOriginalOrder,
}: {
  record: ActivityParticipationRecord
  onClose: () => void
  onViewOriginalOrder: () => void
}) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__header">
          <h3>参与详情</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="drawer__body">
          <section className="drawer-section">
            <div className="drawer-section__title">参与信息</div>
            <DetailItem label="参与记录ID" value={record.id} mono />
            <DetailItem label="参与门店" value={record.storeName} />
            <DetailItem label="参与用户" value={`${record.userName}（${record.userPhone}）`} />
            <DetailItem label="参与时身份" value={record.isNewUserAtParticipation ? '未消费用户' : '已消费用户'} />
            <DetailItem label="参与渠道" value={record.channel} />
            <DetailItem label="取餐号" value={record.pickupNo} />
            <DetailItem label="参与状态" value={PARTICIPATION_STATUS_LABELS[record.status]} />
          </section>

          <section className="drawer-section">
            <div className="drawer-section__title">命中规则</div>
            <DetailItem label="规则类型" value={record.ruleName} />
            <DetailItem label="触发商品" value={record.triggerProducts.join('、') || '-'} />
            <DetailItem label="优惠金额" value={`¥${formatMoney(record.discountAmount)}`} />
          </section>

          <section className="drawer-section">
            <div className="drawer-section__title">订单信息</div>
            <DetailItem label="订单号" value={record.orderId} mono />
            <DetailItem label="订单类型" value={record.orderType} />
            <DetailItem label="订单来源" value={record.source} />
            <DetailItem label="订单应付" value={`¥${formatMoney(record.payable)}`} />
            <DetailItem label="订单实付" value={`¥${formatMoney(record.paid)}`} />
            <DetailItem label="下单时间" value={record.orderedAt} />
            <DetailItem label="支付时间" value={record.paidAt} />
            <DetailItem label="订单状态" value={ORDER_STATUS_LABELS[record.orderStatus]} />
          </section>

          <section className="drawer-section">
            <div className="drawer-section__title">赠品明细</div>
            {record.giftProducts.length === 0 ? (
              <div className="drawer-empty">无赠品</div>
            ) : (
              <table className="table table--compact">
                <thead>
                  <tr><th>赠品名称</th><th>形态</th><th>数量</th></tr>
                </thead>
                <tbody>
                  {record.giftProducts.map((g, i) => (
                    <tr key={`${g.name}-${i}`}>
                      <td>{g.name}</td>
                      <td>{GIFT_TYPE_LABELS[g.giftType]}</td>
                      <td>{g.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
        <div className="drawer__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>关闭</button>
          <button type="button" className="btn btn--primary" onClick={onViewOriginalOrder}>查看原订单</button>
        </div>
      </aside>
    </div>
  )
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="drawer-item">
      <span className="drawer-item__label">{label}</span>
      <span className={`drawer-item__value ${mono ? 'mono' : ''}`}>{value}</span>
    </div>
  )
}
