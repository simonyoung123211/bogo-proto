import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { ActivityOperationLogModal } from '../components/ActivityOperationLogModal'
import { FullReductionScopeSnapshotModal, type FullReductionScopeSnapshotType } from '../components/FullReductionScopeSnapshotModal'
import { CHANNELS, STATUS_LABELS } from '../mockData'
import type { ActivityStatus, FullReductionActivityForm, FullReductionListFilters, FullReductionThresholdType } from '../types'
import {
  countActivitiesByStatus,
  formatCreatorDisplay,
  formatRuleSummary,
  getActivityRemainingLabel,
  getParticipantUserLabel,
  getProductSummary,
  getStoreSummary,
  getThresholdTypeLabel,
  matchesFilters,
} from '../utils/fullReductionActivity'

interface FullReductionActivityListProps {
  activities: FullReductionActivityForm[]
  onCreate: () => void
  onView: (id: string) => void
  onViewParticipation: (id: string) => void
  onEdit: (id: string) => void
  onCopy: (id: string) => void
  onPublish: (id: string) => void
  onVoid: (id: string) => void
  onDelete: (id: string) => void
  onToast?: (message: string) => void
}

const PRIMARY_STATUS_TABS: (ActivityStatus | 'all')[] = ['all', 'draft', 'pending', 'not_started', 'in_progress', 'ended']
const MORE_STATUS_TABS: ActivityStatus[] = ['voided']

const THRESHOLD_OPTIONS: { value: FullReductionThresholdType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'order_amount', label: '满订单金额' },
  { value: 'item_count', label: '满商品件数' },
  { value: 'diner_count', label: '满点餐人数' },
]

const EMPTY_FILTERS: FullReductionListFilters = {
  keyword: '',
  productName: '',
  productId: '',
  activityCode: '',
  status: 'all',
  thresholdType: 'all',
  startDate: '',
  endDate: '',
  storeId: 'all',
}

const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((c) => [c.id, c]))
const PAGE_SIZE = 10

export function FullReductionActivityList({
  activities,
  onCreate,
  onView,
  onViewParticipation,
  onEdit,
  onCopy,
  onPublish,
  onVoid,
  onDelete,
  onToast,
}: FullReductionActivityListProps) {
  const [filters, setFilters] = useState<FullReductionListFilters>(EMPTY_FILTERS)
  const [voidTarget, setVoidTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [statusMoreOpen, setStatusMoreOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [logTarget, setLogTarget] = useState<FullReductionActivityForm | null>(null)
  const [snapshotTarget, setSnapshotTarget] = useState<{ activity: FullReductionActivityForm; type: FullReductionScopeSnapshotType } | null>(null)
  const [page, setPage] = useState(1)
  const [enableRowAnim, setEnableRowAnim] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setEnableRowAnim(false), 500)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => activities.filter((a) => matchesFilters(a, filters)), [activities, filters])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)

  useEffect(() => { setPage(1) }, [filters])

  const statusCounts = useMemo(() => countActivitiesByStatus(activities, filters), [activities, filters])
  const thresholdCounts = useMemo(() => {
    const base = activities.filter((a) => matchesFilters(a, { ...filters, thresholdType: 'all' }))
    const counts: Record<FullReductionThresholdType | 'all', number> = {
      all: base.length,
      order_amount: 0,
      item_count: 0,
      diner_count: 0,
    }
    for (const a of base) counts[a.thresholdType] += 1
    return counts
  }, [activities, filters])

  const isMoreStatusActive = MORE_STATUS_TABS.includes(filters.status as ActivityStatus)

  const setStatusTab = (status: ActivityStatus | 'all') => {
    setFilters((f) => ({ ...f, status }))
    setStatusMoreOpen(false)
  }

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS)
    setFilterExpanded(false)
  }

  const copyActivityId = async (id: string, e: ReactMouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(id)
      onToast?.('活动 ID 已复制')
    } catch {
      onToast?.('复制失败，请手动复制')
    }
  }

  const stopRowClick = (e: ReactMouseEvent) => e.stopPropagation()
  const canEdit = (s: ActivityStatus) => ['draft', 'pending', 'not_started', 'in_progress'].includes(s)
  const canPublish = (s: ActivityStatus) => ['draft', 'pending'].includes(s)
  const canVoid = (s: ActivityStatus) => ['pending', 'not_started', 'in_progress'].includes(s)
  const canDelete = (s: ActivityStatus) => s === 'draft'

  return (
    <div className="page-card page-card--list">
      <div className="list-info-banner">
        满减可将多商品凑单提升客单价，如满20减2、满30减5；支持满金额、满件数、满点餐人数（拼单）。
        <button type="button" className="link-btn">了解更多</button>
      </div>

      <header className="list-page-header list-page-header--compact">
        <div className="list-page-header__main">
          <div className="list-page-header__title-row">
            <h1 className="list-page-header__title">满减/折</h1>
            <PageHelpButton open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} onClose={() => setHelpOpen(false)} />
          </div>
        </div>
        <div className="list-page-header__actions">
          <button type="button" className="btn btn--primary btn--icon" onClick={onCreate}>
            <IconPlus />
            新建活动
          </button>
        </div>
      </header>

      <div className="list-chrome">
        <div className="status-tabs status-tabs--pill">
          {PRIMARY_STATUS_TABS.map((s) => (
            <button key={s} type="button" className={`status-tab ${filters.status === s ? 'is-active' : ''}`} onClick={() => setStatusTab(s)}>
              {STATUS_LABELS[s]}
              <span className="status-tab__count">{statusCounts[s]}</span>
            </button>
          ))}
          <StatusMoreMenu
            open={statusMoreOpen}
            active={isMoreStatusActive}
            activeLabel={isMoreStatusActive ? STATUS_LABELS[filters.status] : '更多状态'}
            activeCount={isMoreStatusActive ? statusCounts[filters.status as ActivityStatus] : undefined}
            onToggle={() => setStatusMoreOpen((v) => !v)}
            onClose={() => setStatusMoreOpen(false)}
          >
            {MORE_STATUS_TABS.map((s) => (
              <button key={s} type="button" className={filters.status === s ? 'is-active' : ''} onClick={() => setStatusTab(s)}>
                {STATUS_LABELS[s]}
                <span className="status-more-menu__count">{statusCounts[s]}</span>
              </button>
            ))}
          </StatusMoreMenu>
        </div>

        <div className="list-toolbar">
          <div className="list-toolbar__fields">
            <div className="filter-item">
              <label>活动名称/ID</label>
              <input className="input input--filter" value={filters.keyword} onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))} placeholder="请输入活动名称或 ID" />
            </div>
            <div className="filter-item">
              <label>门槛类型</label>
              <select
                className="input input--filter"
                value={filters.thresholdType}
                onChange={(e) => setFilters((f) => ({ ...f, thresholdType: e.target.value as FullReductionListFilters['thresholdType'] }))}
              >
                {THRESHOLD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}{opt.value !== 'all' ? ` (${thresholdCounts[opt.value]})` : ` (${thresholdCounts.all})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-item">
              <label>活动时间</label>
              <div className="date-range">
                <input type="date" className="input input--filter" value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))} />
                <span>至</span>
                <input type="date" className="input input--filter" value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="list-toolbar__actions">
            <span className="list-toolbar__hint">筛选即时生效</span>
            <button type="button" className="btn btn--default btn--icon btn--sm" onClick={resetFilters}><IconReset />重置</button>
            <button type="button" className={`list-toolbar__toggle ${filterExpanded ? 'is-expanded' : ''}`} onClick={() => setFilterExpanded((v) => !v)}>
              <IconFilter />更多筛选<IconChevron />
            </button>
          </div>
        </div>

        {filterExpanded && (
          <div className="list-toolbar list-toolbar--expanded">
            <div className="list-toolbar__fields">
              <div className="filter-item">
                <label>活动商品名称</label>
                <input
                  className="input input--filter"
                  value={filters.productName}
                  onChange={(e) => setFilters((f) => ({ ...f, productName: e.target.value }))}
                  placeholder="请输入活动商品名称"
                />
              </div>
              <div className="filter-item">
                <label>活动商品 ID</label>
                <input
                  className="input input--filter"
                  value={filters.productId}
                  onChange={(e) => setFilters((f) => ({ ...f, productId: e.target.value }))}
                  placeholder="请输入商品 ID 或 SKU ID"
                />
              </div>
              <div className="filter-item">
                <label>活动编码</label>
                <input className="input input--filter" value={filters.activityCode} onChange={(e) => setFilters((f) => ({ ...f, activityCode: e.target.value }))} placeholder="请输入活动编码" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="table-wrap table-wrap--list">
        <table className="table table--list table--activity">
          <thead>
            <tr>
              <th>活动名称</th>
              <th>门槛类型</th>
              <th>活动商品</th>
              <th>参与门店</th>
              <th>活动时间</th>
              <th>投放渠道</th>
              <th className="table-col--optional">适用人群</th>
              <th>状态</th>
              <th className="table-col--optional">创建者</th>
              <th className="table-col--meta">创建时间</th>
              <th className="table-col--meta">更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody className={enableRowAnim ? 'table--animate-in' : undefined}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12}>
                  <div className="table-empty-state">
                    <p className="table-empty-state__title">暂无活动</p>
                    <p className="table-empty-state__desc">调整筛选条件，或新建一个满减/折活动</p>
                    <button type="button" className="btn btn--primary btn--icon" onClick={onCreate}><IconPlus />新建活动</button>
                  </div>
                </td>
              </tr>
            ) : pageRows.map((a, index) => {
              const remaining = getActivityRemainingLabel(a)
              return (
                <tr key={a.id} className={`table-row--clickable table-row--status-${a.status}`} style={enableRowAnim ? { animationDelay: `${Math.min(index, 12) * 30}ms` } : undefined} onClick={() => onView(a.id)}>
                  <td>
                    <div className="activity-name-cell">
                      <div className="activity-name-cell__top">
                        <span className="activity-name-cell__name">{a.name || '未命名活动'}</span>
                      </div>
                      <div className="activity-name-cell__rule">{formatRuleSummary(a)}</div>
                      <button type="button" className="activity-name-cell__id" title="点击复制活动 ID" onClick={(e) => copyActivityId(a.id, e)}>{a.id}</button>
                    </div>
                  </td>
                  <td>
                    <span className={`rule-tag rule-tag--fr-${a.thresholdType}`}>{getThresholdTypeLabel(a.thresholdType)}</span>
                  </td>
                  <td onClick={stopRowClick}><SnapshotLink label={getProductSummary(a)} onClick={() => setSnapshotTarget({ activity: a, type: 'products' })} /></td>
                  <td onClick={stopRowClick}><SnapshotLink label={getStoreSummary(a)} onClick={() => setSnapshotTarget({ activity: a, type: 'stores' })} /></td>
                  <td className="table-time">
                    <div><span className="table-time__label">起</span>{a.startTime}</div>
                    <div><span className="table-time__label">止</span>{a.endTime}</div>
                    {remaining && <span className="time-remaining">{remaining}</span>}
                  </td>
                  <td onClick={stopRowClick}><ChannelChips channels={a.channels} /></td>
                  <td className="table-col--optional">{getParticipantUserLabel(a)}</td>
                  <td><span className={`status-badge status-badge--dot status-badge--${a.status}`}>{STATUS_LABELS[a.status]}</span></td>
                  <td className="table-col--optional"><CreatorCell activity={a} /></td>
                  <td className="table-col--meta table-time"><TimestampCell value={a.createdAt} /></td>
                  <td className="table-col--meta table-time"><TimestampCell value={a.updatedAt ?? a.createdAt} /></td>
                  <td className="table-actions" onClick={stopRowClick}>
                    <button type="button" className="table-actions__view" onClick={() => onView(a.id)}><IconView />查看</button>
                    <RowActionMenu open={openMenuId === a.id} onToggle={() => setOpenMenuId((id) => (id === a.id ? null : a.id))} onClose={() => setOpenMenuId(null)}>
                      <button type="button" onClick={() => { setLogTarget(a); setOpenMenuId(null) }}>
                        操作日志（{a.operationLogs?.length ?? 0}）
                      </button>
                      {['not_started', 'in_progress', 'ended', 'voided'].includes(a.status) && (
                        <button type="button" onClick={() => { onViewParticipation(a.id); setOpenMenuId(null) }}>参与记录</button>
                      )}
                      {canEdit(a.status) && <button type="button" onClick={() => { onEdit(a.id); setOpenMenuId(null) }}>编辑</button>}
                      <button type="button" onClick={() => { onCopy(a.id); setOpenMenuId(null) }}>复制</button>
                      {canPublish(a.status) && <button type="button" onClick={() => { onPublish(a.id); setOpenMenuId(null) }}>发布</button>}
                      {canVoid(a.status) && <button type="button" className="is-danger" onClick={() => { setVoidTarget(a.id); setOpenMenuId(null) }}>作废</button>}
                      {canDelete(a.status) && <button type="button" className="is-danger" onClick={() => { setDeleteTarget(a.id); setOpenMenuId(null) }}>删除</button>}
                    </RowActionMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="pagination pagination--full">
        <span>共 {filtered.length} 条{filtered.length > 0 && `，当前第 ${rangeStart}–${rangeEnd} 条`}</span>
        {filtered.length > PAGE_SIZE && (
          <div className="pagination__pages">
            <button type="button" className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button type="button" className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
          </div>
        )}
      </div>

      {voidTarget && (
        <div className="modal-overlay" onClick={() => setVoidTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>确认作废</h3></div>
            <div className="modal__body">作废后活动将不可恢复，确定要作废该活动吗？</div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setVoidTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => { onVoid(voidTarget); setVoidTarget(null) }}>确认作废</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h3>确认删除</h3></div>
            <div className="modal__body">删除后草稿将不可恢复，确定要删除该活动吗？</div>
            <div className="modal__footer">
              <button type="button" className="btn btn--default" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="btn btn--danger" onClick={() => { onDelete(deleteTarget); setDeleteTarget(null) }}>确认删除</button>
            </div>
          </div>
        </div>
      )}

      {logTarget && <ActivityOperationLogModal activity={logTarget as never} onClose={() => setLogTarget(null)} />}
      {snapshotTarget && <FullReductionScopeSnapshotModal activity={snapshotTarget.activity} type={snapshotTarget.type} onClose={() => setSnapshotTarget(null)} />}
    </div>
  )
}

function SnapshotLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="snapshot-link cell-ellipsis" title={`点击查看快照：${label}`} onClick={onClick}>{label}</button>
}

function CreatorCell({ activity }: { activity: FullReductionActivityForm }) {
  const { maskedPhone, org } = formatCreatorDisplay(activity)
  return <div className="creator-cell" title={`${maskedPhone} · ${org}`}><div className="creator-cell__phone">{maskedPhone}</div><div className="creator-cell__org">{org}</div></div>
}

function TimestampCell({ value }: { value: string }) {
  const [date, time] = value.split(' ')
  return <div className="timestamp-cell" title={value}><div>{date}</div>{time && <div className="timestamp-cell__time">{time}</div>}</div>
}

function PageHelpButton({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="page-help" ref={ref}>
      <button type="button" className={`list-page-header__help ${open ? 'is-active' : ''}`} aria-label="功能说明" onClick={onToggle}><IconHelp /></button>
      {open && (
        <div className="page-help__popover" role="tooltip">
          <p className="page-help__title">满减/折说明</p>
          <p className="page-help__text">支持满订单金额、满商品件数、满点餐人数三种门槛；满点餐人数仅微信拼单可用。优惠方式含阶梯满减与循环满减。</p>
        </div>
      )}
    </div>
  )
}

function ChannelChips({ channels }: { channels: string[] }) {
  if (channels.length === 0) return <span className="text-secondary">-</span>
  return (
    <div className="channel-chips">
      {channels.map((id) => {
        const ch = CHANNEL_MAP[id]
        if (!ch) return null
        return <span key={id} className={`channel-chip channel-chip--${id}`}>{ch.icon}</span>
      })}
    </div>
  )
}

function StatusMoreMenu({ open, active, activeLabel, activeCount, onToggle, onClose, children }: {
  open: boolean; active: boolean; activeLabel: string; activeCount?: number; onToggle: () => void; onClose: () => void; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="status-more-menu" ref={ref}>
      <button type="button" className={`status-tab status-tab--more ${active ? 'is-active' : ''}`} onClick={onToggle}>
        {activeLabel}{activeCount !== undefined && <span className="status-tab__count">{activeCount}</span>}<IconChevron />
      </button>
      {open && <div className="status-more-menu__dropdown" role="menu">{children}</div>}
    </div>
  )
}

function RowActionMenu({ open, onToggle, onClose, children }: { open: boolean; onToggle: () => void; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="row-action-menu" ref={ref}>
      <button type="button" className="row-action-menu__trigger" onClick={onToggle}>更多<IconChevron /></button>
      {open && <div className="row-action-menu__dropdown" role="menu">{children}</div>}
    </div>
  )
}

function IconChevron() { return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 4.5l3 3 3-3" /></svg> }
function IconPlus() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M8 3v10M3 8h10" /></svg> }
function IconFilter() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M2 4h12M4 8h8M6 12h4" /></svg> }
function IconReset() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M3 8a5 5 0 019-2M13 8a5 5 0 01-9 2" /><path d="M12 3v3h-3M4 13v-3h3" /></svg> }
function IconView() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><circle cx="8" cy="8" r="2.5" /><path d="M2 8s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" /></svg> }
function IconHelp() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><circle cx="8" cy="8" r="6" /><path d="M6.2 6a2 2 0 013.5 1.5c0 1.5-2 1.5-2 3M8 12h.01" /></svg> }
