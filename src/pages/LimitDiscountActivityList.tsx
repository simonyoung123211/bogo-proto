import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { ActivityOperationLogModal } from '../components/ActivityOperationLogModal'
import { PauseConfirmModal, PauseDemoGroup, ResumeConfirmModal } from '../components/ActivityPauseControls'
import { LIMIT_DISCOUNT_CHANNELS } from '../mockLimitDiscountData'
import { MORE_STATUS_TABS, PAUSE_OVERDUE_MINUTES, PRIMARY_STATUS_TABS, STATUS_LABELS } from '../mockData'
import type { ActivityStatus, LimitDiscountActivityForm, LimitDiscountListFilters } from '../types'
import { canPause, canResume, countOverduePaused, getPauseInfo, isEndedWhilePaused, isExpired, resolveResumeStatus } from '../utils/activityPause'
import {
  channelSummary,
  countActivitiesByStatus,
  formatCreatorDisplay,
  formatRuleSummary,
  getActivityRemainingLabel,
  goodsScopeLabel,
  matchesFilters,
  participantLabel,
  storeModeLabel,
} from '../utils/limitDiscountActivity'

interface LimitDiscountActivityListProps {
  activities: LimitDiscountActivityForm[]
  onCreate: () => void
  onView: (id: string) => void
  onViewParticipation: (id: string) => void
  onViewAllParticipation: () => void
  onEdit: (id: string) => void
  onCopy: (id: string) => void
  onPublish: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onDemoSetPausedMinutes: (id: string, minutes: number) => void
  onVoid: (id: string) => void
  onDelete: (id: string) => void
  onToast?: (message: string) => void
}

const EMPTY_FILTERS: LimitDiscountListFilters = { keyword: '', status: 'all', startDate: '', endDate: '' }
const PAGE_SIZE = 10
const CHANNEL_MAP = Object.fromEntries(LIMIT_DISCOUNT_CHANNELS.map((item) => [item.id, item]))

export function LimitDiscountActivityList(props: LimitDiscountActivityListProps) {
  const { activities, onCreate, onView, onViewParticipation, onViewAllParticipation, onEdit, onCopy, onPublish, onPause, onResume, onDemoSetPausedMinutes, onVoid, onDelete, onToast } = props
  const [filters, setFilters] = useState<LimitDiscountListFilters>(EMPTY_FILTERS)
  const [pauseTarget, setPauseTarget] = useState<LimitDiscountActivityForm | null>(null)
  const [resumeTarget, setResumeTarget] = useState<LimitDiscountActivityForm | null>(null)
  const [voidTarget, setVoidTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [statusMoreOpen, setStatusMoreOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [logTarget, setLogTarget] = useState<LimitDiscountActivityForm | null>(null)
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(() => Date.now())

  const hasPaused = activities.some((activity) => activity.status === 'paused')
  useEffect(() => {
    if (!hasPaused) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [hasPaused])

  const filtered = useMemo(() => activities.filter((activity) => matchesFilters(activity, filters)), [activities, filters])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const statusCounts = useMemo(() => countActivitiesByStatus(activities, filters), [activities, filters])
  const overdueCount = countOverduePaused(activities, now)
  const isMoreStatusActive = MORE_STATUS_TABS.includes(filters.status as ActivityStatus)

  useEffect(() => { setPage(1) }, [filters])

  const canEdit = (status: ActivityStatus) => ['draft', 'pending', 'not_started', 'in_progress', 'paused'].includes(status)
  const canPublish = (status: ActivityStatus) => ['draft', 'pending'].includes(status)
  const canVoid = (status: ActivityStatus) => ['pending', 'not_started', 'in_progress', 'paused'].includes(status)
  const canDelete = (status: ActivityStatus) => status === 'draft'

  if (activities.length === 0) {
    return (
      <div className="page-card page-card--list">
        <div className="table-empty-state" style={{ padding: '48px 24px' }}>
          <p className="table-empty-state__title">还没有创建过限时折扣活动</p>
          <p className="table-empty-state__desc">限时折扣用来对单品打折、减价或设特惠价，在指定时间段和门店范围内生效，顾客下单时自动抵扣，无需领券。适合清库存、拉新品、错峰促销。</p>
          <button type="button" className="btn btn--primary" onClick={onCreate}>去新建</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-card page-card--list">
      <div className="list-info-banner">
        限时折扣对参与商品按折扣、减价或指定价格优惠。优惠力度在「商品与优惠」中设置，全部商品共用一套，指定商品可逐个设置。
        <button type="button" className="link-btn" onClick={() => setHelpOpen((v) => !v)}>了解更多</button>
      </div>
      {helpOpen && <p className="field-hint">活动库存留空表示不限量。特价高于门店售价时不生效，按门店售价执行。件数限制开启后，按优惠商品命中规则决定优先优惠高价或低价商品。</p>}
      {overdueCount > 0 && (
        <div className="alert-banner alert-banner--danger">
          <span>有 {overdueCount} 个限时折扣活动暂停超过 {PAUSE_OVERDUE_MINUTES} 分钟未恢复，顾客暂时无法参与</span>
          <button type="button" className="link-btn" onClick={() => setFilters((f) => ({ ...f, status: 'paused' }))}>查看这些活动</button>
        </div>
      )}
      <header className="list-page-header list-page-header--compact">
        <h1 className="list-page-header__title">限时折扣</h1>
        <div className="list-page-header__actions">
          <button type="button" className="btn btn--default" onClick={onViewAllParticipation}>参与记录</button>
          <button type="button" className="btn btn--primary" onClick={onCreate}>新建活动</button>
        </div>
      </header>
      <div className="list-chrome">
        <div className="status-tabs status-tabs--pill">
          {PRIMARY_STATUS_TABS.map((status) => (
            <button key={status} type="button" className={`status-tab ${filters.status === status ? 'is-active' : ''}`} onClick={() => setFilters((f) => ({ ...f, status }))}>
              {STATUS_LABELS[status]}<span className="status-tab__count">{statusCounts[status] ?? 0}</span>
            </button>
          ))}
          <StatusMoreMenu open={statusMoreOpen} active={isMoreStatusActive} activeLabel={isMoreStatusActive ? STATUS_LABELS[filters.status] : '更多状态'} activeCount={isMoreStatusActive ? statusCounts[filters.status] : undefined} onToggle={() => setStatusMoreOpen((v) => !v)} onClose={() => setStatusMoreOpen(false)}>
            {MORE_STATUS_TABS.map((status) => (
              <button key={status} type="button" className={filters.status === status ? 'is-active' : ''} onClick={() => { setFilters((f) => ({ ...f, status })); setStatusMoreOpen(false) }}>
                {STATUS_LABELS[status]}<span className="status-more-menu__count">{statusCounts[status] ?? 0}</span>
              </button>
            ))}
          </StatusMoreMenu>
        </div>
        <div className="list-toolbar">
          <div className="list-toolbar__fields">
            <div className="filter-item">
              <label>活动名称/ID</label>
              <input className="input input--filter" value={filters.keyword} placeholder="请输入活动名称或 ID" onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))} />
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
          <button type="button" className="btn btn--default btn--sm" onClick={() => setFilters(EMPTY_FILTERS)}>重置</button>
        </div>
      </div>
      <div className="table-wrap table-wrap--list">
        <table className="table table--list table--activity">
          <thead>
            <tr>
              <th>活动</th>
              <th>状态</th>
              <th>活动时间</th>
              <th>范围</th>
              <th>参与渠道</th>
              <th>适用人群</th>
              <th>到期提醒</th>
              <th>创建方</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9}><div className="table-empty-state"><p className="table-empty-state__title">暂无活动</p><p className="table-empty-state__desc">调整筛选条件，或新建一个限时折扣活动</p></div></td></tr>
            ) : pageRows.map((activity) => {
              const pauseInfo = getPauseInfo(activity, now)
              const remaining = getActivityRemainingLabel(activity)
              return (
                <tr key={activity.id} className="table-row--clickable" onClick={() => onView(activity.id)}>
                  <td>
                    <div className="activity-name-cell">
                      <div className="activity-name-cell__name">{activity.name || '未命名活动'}</div>
                      <div className="activity-name-cell__rule">{formatRuleSummary(activity)}</div>
                      <button type="button" className="activity-name-cell__id" onClick={(e) => copyId(activity.id, e, onToast)}>{activity.id}</button>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-badge--dot status-badge--${activity.status}`}>{STATUS_LABELS[activity.status]}</span>
                    {pauseInfo && <div className={`pause-timer pause-timer--${pauseInfo.level}`}>{pauseInfo.label}</div>}
                    {isEndedWhilePaused(activity) && <div className="status-cell__hint">暂停中到期结束</div>}
                  </td>
                  <td className="table-time">
                    <div><span className="table-time__label">起</span>{activity.startTime}</div>
                    <div><span className="table-time__label">止</span>{activity.endTime}</div>
                  </td>
                  <td>
                    <div>{storeModeLabel(activity)}</div>
                    <div className="text-secondary">{goodsScopeLabel(activity)}</div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="channel-chips">
                      {activity.channels.map((id) => <span key={id} className="channel-chip" title={CHANNEL_MAP[id]?.label ?? id}>{CHANNEL_MAP[id]?.icon ?? id.slice(0, 1)}</span>)}
                    </div>
                    <div className="text-secondary">{channelSummary(activity)}</div>
                  </td>
                  <td>{participantLabel(activity)}</td>
                  <td>{remaining ?? '—'}</td>
                  <td>
                    <div>{formatCreatorDisplay(activity).maskedPhone}</div>
                    <div className="text-secondary">{formatCreatorDisplay(activity).org}</div>
                  </td>
                  <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="table-actions__view" onClick={() => onView(activity.id)}>查看</button>
                    <RowActionMenu open={openMenuId === activity.id} onToggle={() => setOpenMenuId((id) => id === activity.id ? null : activity.id)} onClose={() => setOpenMenuId(null)}>
                      {canEdit(activity.status) && <button type="button" onClick={() => { onEdit(activity.id); setOpenMenuId(null) }}>编辑</button>}
                      <button type="button" onClick={() => { onViewParticipation(activity.id); setOpenMenuId(null) }}>参与记录</button>
                      <button type="button" onClick={() => { onCopy(activity.id); setOpenMenuId(null) }}>复制</button>
                      {canPublish(activity.status) && <button type="button" onClick={() => { onPublish(activity.id); setOpenMenuId(null) }}>发布</button>}
                      <button type="button" onClick={() => { onToast?.('演示环境暂不展示活动效果'); setOpenMenuId(null) }}>活动效果</button>
                      {canPause(activity.status) && <button type="button" onClick={() => { if (isExpired(activity, now)) onToast?.('该活动已过结束时间，无需暂停'); else setPauseTarget(activity); setOpenMenuId(null) }}>暂停</button>}
                      {canResume(activity.status) && <button type="button" onClick={() => { setResumeTarget(activity); setOpenMenuId(null) }}>启用</button>}
                      {activity.status === 'paused' && <PauseDemoGroup onPick={(minutes) => { onDemoSetPausedMinutes(activity.id, minutes); setOpenMenuId(null) }} />}
                      <button type="button" onClick={() => { setLogTarget(activity); setOpenMenuId(null) }}>操作日志（{activity.operationLogs?.length ?? 0}）</button>
                      {canVoid(activity.status) && <button type="button" className="is-danger" onClick={() => { setVoidTarget(activity.id); setOpenMenuId(null) }}>作废</button>}
                      {canDelete(activity.status) && <button type="button" className="is-danger" onClick={() => { setDeleteTarget(activity.id); setOpenMenuId(null) }}>删除</button>}
                    </RowActionMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination pagination--full">
        <span>共 {filtered.length} 条</span>
        {filtered.length > PAGE_SIZE && (
          <div className="pagination__pages">
            <button type="button" className="page-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
            <span className="page-indicator">{currentPage} / {totalPages}</span>
            <button type="button" className="page-btn" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
          </div>
        )}
      </div>
      {pauseTarget && <PauseConfirmModal impact="顾客暂时无法享受本活动的限时折扣" onCancel={() => setPauseTarget(null)} onConfirm={() => { onPause(pauseTarget.id); setPauseTarget(null) }} />}
      {resumeTarget && <ResumeConfirmModal effect="顾客可立即重新享受本活动的限时折扣" willEnd={resolveResumeStatus(resumeTarget, now) === 'ended'} onCancel={() => setResumeTarget(null)} onConfirm={() => { onResume(resumeTarget.id); setResumeTarget(null) }} />}
      {voidTarget && <Confirm title="是否确认作废活动？" body="作废后活动将不可恢复。" danger onCancel={() => setVoidTarget(null)} onConfirm={() => { onVoid(voidTarget); setVoidTarget(null) }} />}
      {deleteTarget && <Confirm title="是否确认删除活动？" body="删除后草稿将不可恢复。" danger onCancel={() => setDeleteTarget(null)} onConfirm={() => { onDelete(deleteTarget); setDeleteTarget(null) }} />}
      {logTarget && <ActivityOperationLogModal activity={logTarget as never} onClose={() => setLogTarget(null)} />}
    </div>
  )
}

async function copyId(id: string, event: ReactMouseEvent, onToast?: (message: string) => void) {
  event.stopPropagation()
  try {
    await navigator.clipboard.writeText(id)
    onToast?.('活动 ID 已复制')
  } catch {
    onToast?.('复制失败，请手动复制')
  }
}

function Confirm({ title, body, danger, onCancel, onConfirm }: { title: string; body: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header"><h3>{title}</h3></div>
        <div className="modal__body">{body}</div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onCancel}>取消</button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>确认</button>
        </div>
      </div>
    </div>
  )
}

function StatusMoreMenu({ open, active, activeLabel, activeCount, onToggle, onClose, children }: { open: boolean; active: boolean; activeLabel: string; activeCount?: number; onToggle: () => void; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])
  return (
    <div className="status-more-menu" ref={ref}>
      <button type="button" className={`status-tab status-tab--more ${active ? 'is-active' : ''}`} onClick={onToggle}>{activeLabel}{activeCount !== undefined && <span className="status-tab__count">{activeCount}</span>}</button>
      {open && <div className="status-more-menu__dropdown">{children}</div>}
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
      <button type="button" className="row-action-menu__trigger" onClick={onToggle}>更多</button>
      {open && <div className="row-action-menu__dropdown" role="menu">{children}</div>}
    </div>
  )
}
